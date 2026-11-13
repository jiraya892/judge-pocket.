"""Private loopback preview with AI enabled, without editing deployed config.
Requires an already running authorized local model. Does not download weights.
"""
import argparse,json,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from server import create_server,LocalModel
ROOT=Path(__file__).resolve().parent.parent

def create_preview(port=8001,backend_url='http://127.0.0.1:8080/v1'):
 api=create_server(port=0,model=LocalModel(backend_url),allowed_origins=[f'http://127.0.0.1:{port}'])
 class Files(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
  def do_GET(self):
   if self.path.split('?',1)[0]=='/data/ai/config.json':
    raw=json.dumps({'version':1,'enabled':True,'endpoint':f'http://127.0.0.1:{api.server_port}/api/interpreter/scene','timeoutMs':90000}).encode()
    self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
   else:super().do_GET()
 files=ThreadingHTTPServer(('127.0.0.1',port),partial(Files,directory=str(ROOT)))
 # For a dynamic test port, accept the actual preview origin too.
 if port==0:
  api.server_close();api=create_server(port=0,model=LocalModel(backend_url),allowed_origins=[f'http://127.0.0.1:{files.server_port}'])
 files.daemon_threads=True
 return files,api

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8001);parser.add_argument('--backend-url',default='http://127.0.0.1:8080/v1');args=parser.parse_args()
 files,api=create_preview(args.port,args.backend_url);threading.Thread(target=api.serve_forever,daemon=True).start()
 print(f'Private local preview: http://127.0.0.1:{files.server_port}/context.html',flush=True)
 try:files.serve_forever()
 except KeyboardInterrupt:pass
 finally:api.shutdown();api.server_close();files.server_close()
