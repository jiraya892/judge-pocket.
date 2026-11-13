"""Public reel/file -> local audio -> timestamped transcript -> unverified case draft.
No login bypass, no password/cookie collection and no execution of transcript text.
"""
import argparse, hashlib, importlib.util, itertools, json, math, os, re, shutil, subprocess, sys, unicodedata, urllib.parse, wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HOME=Path(os.environ.get('JUDGE_MEDIA_HOME','/workspace/.cache/judge-media'))
MODEL_SHA1='bd577a113a864445d4c299885e0cb97d4ba92b5f'
MAX_BYTES=100*1024*1024
class IntakeError(RuntimeError):pass

def reel_url(value):
 p=urllib.parse.urlsplit(value)
 if p.scheme!='https' or p.hostname not in {'instagram.com','www.instagram.com'} or p.username or p.password or p.port:
  raise IntakeError('Use a public HTTPS Instagram reel/post link without credentials')
 if not re.fullmatch(r'/(?:reel|reels|p)/[A-Za-z0-9_-]{3,80}/?',p.path):raise IntakeError('A specific public reel/post link is required')
 return 'https://www.instagram.com'+p.path.rstrip('/')+'/'

def public_index(profile,limit):
 if not re.fullmatch(r'[A-Za-z0-9._]{1,30}',profile)or profile in {'accounts','p','reel','reels'}:raise IntakeError('Use an Instagram username, not credentials')
 if not 1<=limit<=20:raise IntakeError('Index at most 20 public reels per request')
 try:import yt_dlp
 except ImportError as e:raise IntakeError('Run with the media-tool Python interpreter')from e
 url='https://www.instagram.com/'+profile+'/'
 with yt_dlp.YoutubeDL({'quiet':True,'no_warnings':True,'extract_flat':True,'skip_download':True,'lazy_playlist':True,'playlistend':limit,'socket_timeout':20,'retries':1})as ydl:
  try:
   info=ydl.extract_info(url,download=False);entries=info.get('entries')
   if entries is None:raise IntakeError('No public reel listing was returned')
   links=[]
   for entry in itertools.islice(entries,limit):
    value=entry.get('webpage_url')or entry.get('url')
    if not value:continue
    try:link=reel_url(value)
    except (IntakeError,ValueError):continue
    if link not in links:links.append(link)
  except Exception as e:raise IntakeError('The public profile could not be indexed; this is not evidence that it contains no videos. No login bypass was attempted. '+str(e)[-800:])from e
 if not links:raise IntakeError('No public reel URLs could be confirmed from the listing')
 return {'profile_url':url,'public_reels':links,'limit':limit,'complete_account_index':False}

def run(args,timeout=180):
 try:return subprocess.run([str(x)for x in args],check=True,capture_output=True,text=True,timeout=timeout)
 except subprocess.CalledProcessError as e:raise IntakeError((e.stderr or e.stdout or 'Tool failed')[-2000:])from e
 except subprocess.TimeoutExpired as e:raise IntakeError('Processing time limit reached')from e

def workspace(path):
 path=Path(path).resolve()
 if path==ROOT or ROOT in path.parents:raise IntakeError('Private media and transcripts must stay outside the public checkout')
 if path.exists():raise IntakeError('Output directory already exists; choose a new case directory')
 path.mkdir(parents=True);return path

def download(url,folder):
 url=reel_url(url)
 try:import yt_dlp
 except ImportError as e:raise IntakeError('Run with the installed media-tool Python interpreter')from e
 options={'quiet':True,'no_warnings':True,'noplaylist':True,'socket_timeout':20,'retries':1,'fragment_retries':1,'concurrent_fragment_downloads':1,'max_filesize':MAX_BYTES,'outtmpl':str(folder/'source.%(ext)s'),'format':'best[height<=480]/best'}
 # TLS verification and inherited proxy settings remain enabled. No cookie,
 # password, impersonation or private-content fallback is configured.
 with yt_dlp.YoutubeDL(options)as ydl:
  try:info=ydl.extract_info(url,download=True)
  except Exception as e:raise IntakeError('Public reel acquisition failed. Instagram may require login or block access; no bypass was attempted. '+str(e)[-800:])from e
  media=Path(ydl.prepare_filename(info))
 if not media.is_file()or media.stat().st_size>MAX_BYTES:raise IntakeError('Media missing or larger than 100 MiB')
 source={'kind':'public_reel','url':url,'creator':info.get('uploader'),'description':info.get('description'),'title':info.get('title'),'sha256':hashlib.sha256(media.read_bytes()).hexdigest()}
 return media,source

def normalize(media,output):
 media=Path(media).resolve()
 if not media.is_file()or media.stat().st_size>MAX_BYTES:raise IntakeError('Use a local media file of at most 100 MiB')
 run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-protocol_whitelist','file,pipe','-i',media,'-vn','-ac','1','-ar','16000','-t','900','-c:a','pcm_s16le','-n',output])
 with wave.open(str(output),'rb')as wav:
  if (wav.getnchannels(),wav.getframerate(),wav.getsampwidth())!=(1,16000,2)or wav.getnframes()==0:raise IntakeError('Audio normalization failed')
  duration=wav.getnframes()/wav.getframerate()
 if duration>=899:raise IntakeError('Clip is too long; the 15-minute cap must not silently omit an interaction')
 return duration

def parse_transcript(data):
 if not isinstance(data,dict):raise IntakeError('Invalid Whisper JSON')
 segments=data.get('transcription')
 if not isinstance(segments,list)or not segments:raise IntakeError('Whisper produced no transcript segments')
 out=[]
 for i,part in enumerate(segments):
  if not isinstance(part,dict):raise IntakeError('Invalid transcript segment')
  offsets=part.get('offsets',{});start=offsets.get('from');end=offsets.get('to');text=part.get('text','').strip()
  if any(isinstance(v,bool)or not isinstance(v,(int,float))or not math.isfinite(v)for v in [start,end])or start<0 or end<start:raise IntakeError('Invalid transcript timestamps')
  if text:out.append({'id':i,'start_seconds':start/1000,'end_seconds':end/1000,'text':text})
 if not out:raise IntakeError('Empty transcript; it cannot become a case study')
 return out

def normalized(text):
 s=''.join(c for c in unicodedata.normalize('NFKD',text)if not unicodedata.combining(c)).lower()
 return ' '.join(re.findall(r'[a-z0-9]+',s))

def card_candidates(segments,index):
 phrases={}
 for name,_ in index['cards']:
  key=normalized(name)
  if key:phrases.setdefault(key,[]).append(name)
 found={}
 for segment in segments:
  words=normalized(segment['text']).split()
  for start in range(len(words)):
   for size in range(1,min(12,len(words)-start)+1):
    for name in phrases.get(' '.join(words[start:start+size]),[]):found.setdefault(name,[]).append(segment['id'])
 return [{'name':name,'evidence_segments':sorted(set(ids)),'match':'exact_words_only','confirmed':False}for name,ids in sorted(found.items())]

def transcribe(audio,folder,language):
 cli=HOME/'whisper.cpp/build/bin/whisper-cli';model=HOME/'models/ggml-tiny.bin'
 if not cli.is_file():raise IntakeError('Whisper CLI is not built yet')
 if not model.is_file():raise IntakeError('The tiny model is missing. Apply network settings, then run setup.py --model')
 if hashlib.sha1(model.read_bytes()).hexdigest()!=MODEL_SHA1:raise IntakeError('Model checksum failed; refusing transcription')
 run([cli,'-m',model,'-f',audio,'-l',language,'-t','2','-ojf','-otxt','-of',folder/'whisper'],timeout=900)
 raw=folder/'whisper.json'
 if not raw.is_file():raise IntakeError('Whisper did not produce its JSON result')
 data=json.loads(raw.read_text());return parse_transcript(data),data.get('result',{}).get('language')

def process(args):
 if not (HOME/'whisper.cpp/build/bin/whisper-cli').is_file()or not (HOME/'models/ggml-tiny.bin').is_file():raise IntakeError('Transcriber not ready: run doctor, apply network settings and complete setup.py --model before acquiring media')
 folder=workspace(args.output)
 if args.url:media,source=download(args.url,folder)
 else:
  media=Path(args.file).resolve();source={'kind':'provided_file','name':media.name}
  if not media.is_file()or media.stat().st_size>MAX_BYTES:raise IntakeError('Local media file missing or larger than 100 MiB')
  source['sha256']=hashlib.sha256(media.read_bytes()).hexdigest()
 (folder/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
 audio=folder/'audio.wav';duration=normalize(media,audio)
 segments,language=transcribe(audio,folder,args.language)
 (folder/'transcript.json').write_text(json.dumps({'language':language,'duration_seconds':duration,'transcriber':{'engine':'whisper.cpp v1.7.6','model':'multilingual tiny','model_sha1':MODEL_SHA1},'segments':segments},ensure_ascii=False,indent=2)+'\n')
 (folder/'transcript.txt').write_text('\n'.join(f"[{s['start_seconds']:.2f}–{s['end_seconds']:.2f}] {s['text']}"for s in segments)+'\n')
 index=json.loads((ROOT/'data/oracle/index.json').read_text())
 from ruling_filter import create_candidate_draft
 result=create_candidate_draft(folder,source,segments,card_candidates(segments,index))
 return {'output':str(folder),'duration_seconds':duration,'segments':len(segments),**result}

def main():
 parser=argparse.ArgumentParser();commands=parser.add_subparsers(dest='command',required=True)
 doctor=commands.add_parser('doctor')
 listing=commands.add_parser('list-public');listing.add_argument('--profile',required=True);listing.add_argument('--limit',type=int,default=5)
 ingest=commands.add_parser('ingest');src=ingest.add_mutually_exclusive_group(required=True);src.add_argument('--url');src.add_argument('--file',type=Path);ingest.add_argument('--output',required=True,type=Path);ingest.add_argument('--language',choices=['auto','it','en'],default='auto')
 args=parser.parse_args()
 try:
  if args.command=='doctor':
   model=HOME/'models/ggml-tiny.bin';result={'ffmpeg':bool(shutil.which('ffmpeg')),'yt_dlp':importlib.util.find_spec('yt_dlp')is not None,'whisper_cli':(HOME/'whisper.cpp/build/bin/whisper-cli').is_file(),'model_present':model.is_file(),'model_checksum_verified':model.is_file()and hashlib.sha1(model.read_bytes()).hexdigest()==MODEL_SHA1,'public_content_only':True,'no_commercial_api':True}
  elif args.command=='list-public':result=public_index(args.profile,args.limit)
  else:result=process(args)
  print(json.dumps(result,ensure_ascii=False,indent=2));return 0
 except (IntakeError,OSError,ValueError)as e:print(json.dumps({'status':'blocked','reason':str(e)},ensure_ascii=False),file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())
