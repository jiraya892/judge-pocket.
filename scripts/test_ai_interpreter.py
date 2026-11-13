"""Real local HTTP transport with authored LLM outputs, not model accuracy tests."""
import copy,json,sys,threading,unittest,urllib.request,urllib.error
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'interpreter'))
from server import create_server,LocalModel
from protocol import validate,InvalidProposal,strict_json
FIXTURE=json.loads((Path(__file__).resolve().parents[1]/'case-studies/ai-interpreter-fixtures.json').read_text())['entry']
class Transport(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.output=FIXTURE['proposal'];cls.finish='stop';cls.calls=[];cls.hold=False;cls.started=threading.Event();cls.release=threading.Event()
  class ModelHandler(BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_POST(self):
    body=json.loads(self.rfile.read(int(self.headers['Content-Length'])));cls.calls.append(body)
    if cls.hold:cls.started.set();cls.release.wait(5)
    raw=json.dumps({'choices':[{'finish_reason':cls.finish,'message':{'content':json.dumps(cls.output)}}]}).encode()
    self.send_response(200);self.end_headers();self.wfile.write(raw)
  cls.model=ThreadingHTTPServer(('127.0.0.1',0),ModelHandler)
  cls.api=create_server(port=0,model=LocalModel('http://127.0.0.1:'+str(cls.model.server_port)+'/v1'),allowed_origins=['http://127.0.0.1:8000'])
  for server in [cls.model,cls.api]:threading.Thread(target=server.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):
  for server in [cls.api,cls.model]:server.shutdown();server.server_close()
 def setUp(self):type(self).output=copy.deepcopy(FIXTURE['proposal']);type(self).finish='stop'
 def request(self,data=None,headers=None,path='/api/interpreter/scene'):
  raw=json.dumps(data or {'version':1,'text':FIXTURE['text'],'candidates':[]}).encode()
  req=urllib.request.Request('http://127.0.0.1:'+str(self.api.server_port)+path,data=raw,headers={'Content-Type':'application/json',**(headers or {})})
  try:
   with urllib.request.urlopen(req) as response:return response.status,json.load(response),response.headers
  except urllib.error.HTTPError as error:return error.code,json.load(error),error.headers
 def test_transport_and_prompt(self):
  status,body,_=self.request();self.assertEqual(status,200);self.assertTrue(body['requiresConfirmation']);self.assertEqual(body['proposal'],FIXTURE['proposal'])
  call=self.calls[-1];self.assertEqual(call['temperature'],0);self.assertEqual(call['response_format']['type'],'json_schema');self.assertIn(FIXTURE['text'],call['messages'][1]['content']);self.assertFalse(call['stream'])
 def test_truncated_model_response_rejected(self):
  type(self).finish='length';self.assertEqual(self.request()[0],422)
 def test_ruling_field_rejected(self):
  type(self).output['ruling']='dies';self.assertEqual(self.request()[0],422)
 def test_uncovered_sentence_rejected(self):
  self.assertEqual(self.request({'version':1,'text':FIXTURE['text']+' Ho altro.','candidates':[]})[0],422)
 def test_no_backend_override(self):
  self.assertEqual(self.request({'version':1,'text':FIXTURE['text'],'candidates':[],'model':'commercial'})[0],400)
 def test_origin(self):
  self.assertEqual(self.request(headers={'Origin':'https://evil.invalid'})[0],403)
  status,_,headers=self.request(headers={'Origin':'http://127.0.0.1:8000'});self.assertEqual(status,200);self.assertEqual(headers['Access-Control-Allow-Origin'],'http://127.0.0.1:8000')
 def test_dns_rebinding(self):self.assertEqual(self.request(headers={'Host':'evil.invalid'})[0],403)
 def test_busy_requests_are_bounded(self):
  cls=type(self);cls.hold=True;cls.started.clear();cls.release.clear();result=[]
  worker=threading.Thread(target=lambda:result.append(self.request()));worker.start()
  try:
   self.assertTrue(cls.started.wait(3));status,body,headers=self.request();self.assertEqual(status,429);self.assertEqual(headers['Retry-After'],'5')
  finally:cls.hold=False;cls.release.set();worker.join(5)
  self.assertEqual(result[0][0],200)
 def test_duplicate_keys(self):
  with self.assertRaises(InvalidProposal):strict_json('{"x":1,"x":2}')
 def test_no_commercial_backend(self):
  with self.assertRaises(ValueError):LocalModel('https://commercial.invalid/v1')
 def test_quantity_not_hidden_in_broad_quote(self):
  p=copy.deepcopy(FIXTURE['proposal']);p['question']+=' 3 danni'
  with self.assertRaises(InvalidProposal):validate(p,FIXTURE['text']+' 3 danni')
if __name__=='__main__':unittest.main(verbosity=2)
