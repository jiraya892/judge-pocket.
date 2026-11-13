"""Repeatable local research tools. No commercial API, cookies or paid service."""
import argparse, hashlib, json, os, shutil, subprocess, sys, urllib.request, urllib.parse
from pathlib import Path
HOME=Path(os.environ.get('JUDGE_MEDIA_HOME','/workspace/.cache/judge-media'))
VERSION='v1.7.6'
COMMIT='a8d002cfd879315632a579e73f0148d06959de36'
MODEL_URL='https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin'
MODEL_SHA1='bd577a113a864445d4c299885e0cb97d4ba92b5f'
def run(args):subprocess.run([str(x) for x in args],check=True)
class HTTPSOnlyRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if urllib.parse.urlsplit(newurl).scheme!='https':raise RuntimeError('Refusing an insecure model redirect')
  return super().redirect_request(req,fp,code,msg,headers,newurl)

def model():
 target=HOME/'models/ggml-tiny.bin';target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists():
  if hashlib.sha1(target.read_bytes()).hexdigest()!=MODEL_SHA1:raise RuntimeError('Existing model failed upstream checksum; it was not overwritten')
  return target
 partial=target.with_suffix('.partial')
 if partial.exists():raise RuntimeError('Partial model already exists; inspect or remove it before retrying')
 try:
  with urllib.request.build_opener(HTTPSOnlyRedirect()).open(MODEL_URL,timeout=30)as response,partial.open('xb')as output:
   if not response.url.startswith('https://'):raise RuntimeError('Refusing non-HTTPS model redirect')
   size=0;digest=hashlib.sha1()
   while True:
    chunk=response.read(1024*1024)
    if not chunk:break
    size+=len(chunk)
    if size>100*1024*1024:raise RuntimeError('Model exceeds 100 MiB safety limit')
    digest.update(chunk);output.write(chunk)
  if digest.hexdigest()!=MODEL_SHA1:raise RuntimeError('Model does not match checksum from pinned upstream release')
  partial.rename(target)
 except Exception:
  partial.unlink(missing_ok=True);raise
 return target
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--model',action='store_true',help='Download the ~75 MiB multilingual tiny model after network access is enabled');args=parser.parse_args()
 HOME.mkdir(parents=True,exist_ok=True);venv=HOME/'venv'
 if not (venv/'bin/python').exists():run([sys.executable,'-m','venv',venv])
 run([venv/'bin/python','-m','pip','install','--disable-pip-version-check','yt-dlp==2026.10.26','cmake==3.31.6'])
 source=HOME/'whisper.cpp'
 if not source.exists():run(['git','clone','--depth','1','--branch',VERSION,'https://github.com/ggml-org/whisper.cpp.git',source])
 actual=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
 if actual!=COMMIT:raise RuntimeError('Whisper source differs from the pinned release; no reset was performed')
 subprocess.run(['git','-C',str(source),'diff','--exit-code'],check=True,stdout=subprocess.DEVNULL)
 run([venv/'bin/cmake','-S',source,'-B',source/'build','-DCMAKE_BUILD_TYPE=Release','-DGGML_CUDA=OFF','-DWHISPER_CURL=OFF','-DWHISPER_BUILD_TESTS=OFF'])
 run([venv/'bin/cmake','--build',source/'build','--config','Release','--target','whisper-cli','--parallel','2'])
 result={'whisper_commit':COMMIT,'cli':str(source/'build/bin/whisper-cli'),'yt_dlp':'2026.10.26','model_ready':False}
 if args.model:result['model']=str(model());result['model_ready']=True
 (HOME/'setup-status.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
