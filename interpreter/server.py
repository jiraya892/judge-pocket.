"""Local development interpreter API backed by an already running local LLM.
No weights download, model installation, paid API, or public hosting activation.
"""
import argparse
import json
import threading
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0,str(Path(__file__).resolve().parent))
from protocol import SCHEMA,InvalidProposal,strict_json,validate
from prompt import messages

class BackendUnavailable(Exception):pass
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise BackendUnavailable('Model redirect refused')

class LocalModel:
    def __init__(self,url='http://127.0.0.1:8080/v1',model='judge-interpreter',timeout=40):
        parts=urllib.parse.urlsplit(url)
        if parts.scheme!='http' or parts.hostname not in {'127.0.0.1','localhost','::1'} or parts.username or parts.password or parts.query or parts.fragment:
            raise ValueError('The model backend must be a local HTTP service')
        self.url=url.rstrip('/');self.model=model;self.timeout=timeout
    def generate(self,text,candidates):
        payload={'model':self.model,'messages':messages(text,candidates),'temperature':0,'max_tokens':3072,'stream':False,
                 'response_format':{'type':'json_schema','json_schema':{'name':'judge_scene','strict':True,'schema':SCHEMA}}}
        request=urllib.request.Request(self.url+'/chat/completions',data=json.dumps(payload,ensure_ascii=False).encode(),headers={'Content-Type':'application/json','Accept':'application/json'},method='POST')
        try:
            with urllib.request.build_opener(NoRedirect).open(request,timeout=self.timeout) as response:
                if response.status!=200:raise BackendUnavailable('Model backend unavailable')
                raw=response.read(131073)
                if len(raw)>131072:raise BackendUnavailable('Model response too large')
            result=strict_json(raw.decode());choice=result['choices'][0]
            if choice.get('finish_reason')!='stop':raise InvalidProposal('Model output incomplete')
            content=choice['message']['content']
            if not isinstance(content,str) or len(content)>65536:raise InvalidProposal('Invalid model content')
            return validate(strict_json(content),text)
        except (urllib.error.URLError,TimeoutError,ConnectionError) as error:raise BackendUnavailable('Local model is not available') from error
        except (KeyError,IndexError,TypeError,UnicodeError) as error:raise InvalidProposal('Invalid model envelope') from error

def create_server(host='127.0.0.1',port=8766,model=None,allowed_origins=()):
    backend=model or LocalModel();busy=threading.BoundedSemaphore(1);origins=set(allowed_origins)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass  # Do not log narrative, prompts, or source facts.
        def origin_allowed(self):
            port=self.server.server_address[1]
            if self.headers.get('Host') not in {f'127.0.0.1:{port}',f'localhost:{port}'}:return False
            origin=self.headers.get('Origin');return not origin or origin in origins or origin=='http://'+self.headers.get('Host','')
        def response(self,status,data):
            raw=json.dumps(data,ensure_ascii=False).encode();self.send_response(status)
            self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)))
            origin=self.headers.get('Origin')
            if origin and self.origin_allowed():self.send_header('Access-Control-Allow-Origin',origin);self.send_header('Vary','Origin')
            if status==429:self.send_header('Retry-After','5')
            self.end_headers()
            try:self.wfile.write(raw)
            except (BrokenPipeError,ConnectionResetError):pass
        def do_OPTIONS(self):
            if not self.origin_allowed():return self.response(403,{'error':'origin_not_allowed'})
            self.send_response(204);self.send_header('Access-Control-Allow-Origin',self.headers.get('Origin',''));self.send_header('Access-Control-Allow-Methods','POST, GET, OPTIONS');self.send_header('Access-Control-Allow-Headers','Content-Type');self.end_headers()
        def do_GET(self):
            if not self.origin_allowed():return self.response(403,{'error':'origin_not_allowed'})
            if self.path!='/api/interpreter/health':return self.response(404,{'error':'not_found'})
            self.response(200,{'service':'scene-interpreter','protocol':1,'model':getattr(backend,'model','test-provider'),'model_readiness':'not_probed','rulings':False})
        def do_POST(self):
            if not self.origin_allowed():return self.response(403,{'error':'origin_not_allowed'})
            if self.path!='/api/interpreter/scene':return self.response(404,{'error':'not_found'})
            if self.headers.get_content_type()!='application/json':return self.response(415,{'error':'json_required'})
            try:
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=65536:return self.response(413,{'error':'request_size'})
                data=strict_json(self.rfile.read(length).decode('utf-8'))
                if not isinstance(data,dict) or set(data)!={'version','text','candidates'} or type(data['version']) is not int or data['version']!=1 or not isinstance(data['text'],str) or not 1<=len(data['text'])<=4000:raise ValueError('Invalid request')
                candidates=data['candidates']
                if not isinstance(candidates,list) or len(candidates)>12:raise ValueError('Invalid candidates')
                for c in candidates:
                    if not isinstance(c,dict) or set(c)!={'mention','names'} or not isinstance(c['mention'],str) or not 1<=len(c['mention'])<=200 or not isinstance(c['names'],list) or len(c['names'])>8 or any(not isinstance(n,str) or not 1<=len(n)<=300 for n in c['names']):raise ValueError('Invalid candidate')
            except (ValueError,UnicodeError):return self.response(400,{'error':'invalid_request'})
            if not busy.acquire(blocking=False):return self.response(429,{'error':'busy'})
            try:
                proposal=validate(backend.generate(data['text'],candidates),data['text'])
                self.response(200,{'version':1,'proposal':proposal,'requiresConfirmation':True,'model':getattr(backend,'model','unknown')})
            except BackendUnavailable:self.response(503,{'error':'model_unavailable'})
            except (InvalidProposal,ValueError,TypeError):self.response(422,{'error':'invalid_model_proposal'})
            finally:busy.release()
    server=ThreadingHTTPServer((host,port),Handler);server.daemon_threads=True;return server

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8766);parser.add_argument('--backend-url',default='http://127.0.0.1:8080/v1');parser.add_argument('--model',default='judge-interpreter');parser.add_argument('--allowed-origin',action='append',default=[])
    args=parser.parse_args();server=create_server(port=args.port,model=LocalModel(args.backend_url,args.model),allowed_origins=args.allowed_origin)
    print('Local interpreter API: http://127.0.0.1:'+str(server.server_port)+'/api/interpreter/scene',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
