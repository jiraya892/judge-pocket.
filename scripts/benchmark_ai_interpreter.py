"""Opt-in real inference benchmark; never downloads weights or produces rulings.
Requires an already-running authorized local llama.cpp server.
"""
import argparse,datetime,hashlib,json,subprocess,sys,time,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'interpreter'))
from protocol import SCHEMA,strict_json,validate,InvalidProposal
from prompt import messages
from server import LocalModel,NoRedirect

def check(p,expect):
 errors=[];known={row[0] for row in json.loads((ROOT/'data/oracle/index.json').read_text())['cards']};names={c['id']:c['mention'] if c['mention'] in known else c['name'] if c['name'] in known else None for c in p['cards']};facts=p['facts'];event=p['event']
 def require(ok,reason):
  if not ok:errors.append(reason)
 def fact(kind,value,card=None,player=None):
  return any(f['kind']==kind and f['value']==value and not f['negated'] and f['time']!='question' and (card is None or names.get(f['card'])==card) and (player is None or f['player']==player) for f in facts)
 if not expect.get('noRuling'):require(not p['unresolved'],'unnecessary unresolved clause')
 if 'cards' in expect:require(sorted(names.values(),key=str)==sorted(expect['cards']),'card identities')
 for mention in expect.get('mentions',[]):require(any(c['mention']==mention for c in p['cards']),'mention '+mention)
 if 'event' in expect:require(event['type']==expect['event'],'event')
 if 'eventNot' in expect:require(event['type']!=expect['eventNot'],'invented event')
 for role in ['actor','target']:
  if role in expect:require(names.get(event[role])==expect[role],role)
 for name,controller in expect.get('controllers',{}).items():require(fact('controller',controller,name) or event['type']=='cast' and names.get(event['actor'])==name and fact('event_player',controller,name),'controller/caster '+name)
 for f in expect.get('facts',[]):require(fact(f['kind'],f['value'],f.get('card'),f.get('player')),'fact '+str(f))
 if expect.get('phaseAbsent'):require(not any(f['kind'] in {'phase','step'} and f['value'] not in [None,'unknown'] for f in facts),'invented phase/step')
 if 'phase' in expect:require(fact('phase',expect['phase']),'phase')
 if 'step' in expect:require(fact('step',expect['step']),'step')
 if expect.get('noStep'):require(not any(f['kind']=='step' and f['value'] not in [None,'unknown'] for f in facts),'invented main-phase step')
 if 'unknownController' in expect:require(not any(f['kind']=='controller' and names.get(f['card'])==expect['unknownController'] and f['value'] in ['self','opponent'] and not f['negated'] for f in facts),'assumed unknown controller')
 if 'negativeControl' in expect:require(not any(f['kind']=='controller' and names.get(f['card'])==expect['negativeControl'] and f['value']=='self' and not f['negated'] for f in facts),'negation reversed')
 return errors

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--backend-url',default='http://127.0.0.1:8080/v1');parser.add_argument('--output',default='test-reports/ai-interpreter/real-model.json');parser.add_argument('--ids',nargs='*');parser.add_argument('--timeout',type=int,default=180)
 args=parser.parse_args()
 LocalModel(args.backend_url) # Enforce loopback; never commercial endpoints.
 corpus=json.loads((ROOT/'case-studies/ai-language-benchmark.json').read_text());rows=[]
 # Use the same real dictionary hints as the browser, never expected game facts.
 node="""const fs=require('node:fs'),vm=require('node:vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('scene-intake.js','utf8'),c);const names=JSON.parse(fs.readFileSync('data/oracle/index.json')).cards.map(x=>x[0]),index=c.JudgeSceneIntake.catalogue(names);const cases=JSON.parse(fs.readFileSync('case-studies/ai-language-benchmark.json')).cases;process.stdout.write(JSON.stringify(Object.fromEntries(cases.map(x=>{const b=c.JudgeSceneIntake.parse(x.text,index);return [x.id,(b.mentions||[]).slice(0,12).map(m=>({mention:m.text,names:m.name?[m.name]:b.ambiguities.find(a=>a.key===m.key)?.candidates.slice(0,8)||[]}))]}))));"""
 hints=json.loads(subprocess.check_output(['node','-e',node],cwd=ROOT))
 for case in corpus['cases']:
  if args.ids and case['id'] not in args.ids:continue
  payload={'model':'judge-interpreter','messages':messages(case['text'],hints[case['id']]),'temperature':0,'max_tokens':3072,'stream':False,'response_format':{'type':'json_schema','json_schema':{'name':'judge_scene','strict':True,'schema':SCHEMA}}}
  start=time.monotonic();row={'id':case['id'],'text':case['text'],'identity_candidates':hints[case['id']]}
  try:
   req=urllib.request.Request(args.backend_url.rstrip('/')+'/chat/completions',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
   with urllib.request.build_opener(NoRedirect).open(req,timeout=args.timeout) as response:body=strict_json(response.read(131073).decode())
   row['usage']=body.get('usage');row['timings']=body.get('timings');choice=body['choices'][0];row['finish_reason']=choice.get('finish_reason');p=strict_json(choice['message']['content']);row['proposal']=p
   if choice.get('finish_reason')!='stop':raise InvalidProposal('Model output incomplete')
   validate(p,case['text']);row['protocol_valid']=True;row['semantic_errors']=check(p,case['expect']);row['passed']=not row['semantic_errors']
  except Exception as error:row['passed']=False;row['error']=type(error).__name__+': '+str(error)[:500]
  if case['expect'].get('noRuling') and row.get('error','').startswith('InvalidProposal:'):row['safely_rejected']=True;row['passed']=True
  row['elapsed_seconds']=round(time.monotonic()-start,3);rows.append(row)
  report={'date_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'real_inference':True,'schema_canonical_sha256':hashlib.sha256(json.dumps(SCHEMA,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'model_manifest':json.loads((ROOT/'interpreter/model-candidate.json').read_text()),'prompt_file':'interpreter/prompt.py','prompt_sha256':hashlib.sha256((ROOT/'interpreter/prompt.py').read_bytes()).hexdigest(),'corpus_sha256':hashlib.sha256((ROOT/'case-studies/ai-language-benchmark.json').read_bytes()).hexdigest(),'cases':rows,'passed':sum(r['passed'] for r in rows),'total':len(rows),'limitations':['Small extraction corpus, not a general accuracy estimate.','No LLM ruling accepted; engine tested independently.','No real Android/iOS measurements.']}
  path=ROOT/args.output;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
  print(json.dumps({k:v for k,v in row.items() if k not in ['proposal','text','usage','timings']}),flush=True)
 if not rows:parser.error('No benchmark cases matched the requested ids')
 return int(any(not r['passed'] for r in rows))
if __name__=='__main__':raise SystemExit(main())
