"""Recheck genuine saved model outputs through Oracle and source-grounded intake.
No inference, weight download or expected ruling is supplied to the interpreter.
"""
import argparse,datetime,json,subprocess
from pathlib import Path
from benchmark_ai_interpreter import check
ROOT=Path(__file__).resolve().parents[1]

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--report',default='test-reports/ai-interpreter/real-model.json');parser.add_argument('--output',default='test-reports/ai-interpreter/grounded-model.json');args=parser.parse_args()
 rows=json.loads(subprocess.check_output(['node','scripts/check_ai_grounding.cjs',args.report],cwd=ROOT));cases={c['id']:c for c in json.loads((ROOT/'case-studies/ai-language-benchmark.json').read_text())['cases']}
 for row in rows:
  expected=cases[row['id']]['expect']
  if row['status']=='proposal':
   row['semantic_errors']=check(row['proposal'],expected)
   if not row['draft_supported'] and not expected.get('mentions'):row['semantic_errors'].extend(row['draft_errors'])
   row['passed']=not row['semantic_errors'];row['requires_user_correction']=not row['passed'];row['engine_scope_limited']=bool(row['limitations'])
  else:row['passed']=bool(expected.get('noRuling'));row['safely_rejected']=row['passed']
  print(json.dumps({'id':row['id'],'passed':row['passed'],'status':row['status'],'semantic_errors':row.get('semantic_errors',[])}),flush=True)
 report={'date_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_model_report':args.report,'real_saved_model_outputs':True,'new_inference':False,'method':'Actual Oracle grounding, explicit source timing and proposal conversion; expectations never supplied to grounding.','cases':rows,'passed':sum(x['passed'] for x in rows),'total':len(rows),'limitations':['Development corpus used for prompt improvements, not an independent accuracy estimate.','Checks selected semantic fields, not exhaustive equivalence to every sentence.','A valid extraction does not expand engine rule coverage.','Original raw model outputs and failures remain separately available.']}
 (ROOT/args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 return int(report['passed']!=report['total'])
if __name__=='__main__':raise SystemExit(main())
