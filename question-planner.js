/* Chapter 16A/B: outcome-equivalence question planning. No card names or rulings. */
(function(root){'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
// Only JSON data can be compared. Reject lossy serialization (NaN, undefined,
// sparse arrays, cycles, class instances) rather than equating distinct outcomes.
function stable(value){
 const seen=new Set();
 function canonical(x){
  if(x===null||typeof x==='string'||typeof x==='boolean')return x;
  if(typeof x==='number'&&Number.isFinite(x))return x;
  if(!x||typeof x!=='object'||seen.has(x))throw Error('Outcome is not JSON data');
  if(!Array.isArray(x)&&Object.getPrototypeOf(x)!==Object.prototype&&Object.getPrototypeOf(x)!==null)throw Error('Outcome must be plain data');
  seen.add(x);let result;
  if(Array.isArray(x)){
   result=Array.from({length:x.length},(_,i)=>{if(!own(x,i))throw Error('Sparse outcome');return canonical(x[i])});
  }else result=Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
  seen.delete(x);return result;
 }
 return JSON.stringify(canonical(value));
}
const validId=id=>typeof id==='string'&&id.length>0||typeof id==='number'&&Number.isFinite(id)||typeof id==='boolean';
function plan(input, evaluator){
 const facts=input?.facts;
 if(!Array.isArray(facts)||typeof evaluator!=='function')return {status:'unsupported',reason:'Invalid planner input'};
 if(facts.some(f=>!f||typeof f.key!=='string'||!f.key.trim())||new Set(facts.map(f=>f.key)).size!==facts.length)return {status:'unsupported',reason:'Invalid or duplicate fact keys'};
 const answers=input.answers??{};
 if(!answers||typeof answers!=='object'||Array.isArray(answers))return {status:'unsupported',reason:'Invalid answers'};
 if(facts.length>64)return {status:'unsupported',reason:'Too many facts'};
 if(facts.some(f=>!Array.isArray(f.options)||f.options.length<1||f.options.length>8||f.options.some(o=>!o||!validId(o.id))||new Set(f.options.map(o=>String(o.id))).size!==f.options.length))return {status:'unsupported',reason:'Invalid fact options'};
 if(facts.some(f=>own(answers,f.key)&&!f.options.some(o=>o.id===answers[f.key])))return {status:'unsupported',reason:'Answer outside fact domain'};
 const unknown=facts.filter(f=>!own(answers,f.key));
 if(unknown.length>10)return {status:'unsupported',reason:'Too many unknown facts'};
 const combinations=unknown.reduce((n,f)=>n*f.options.length,1);
 if(combinations>512)return {status:'unsupported',reason:'Scenario limit exceeded'};
 const outcomes=[];let failure=null;
 function visit(i,answers){
  if(failure)return;
  if(i===unknown.length){
   try{const out=evaluator(JSON.parse(stable({...input,answers})));if(!out||out.supported!==true||out.status!=='verified'||['warnings','missingFacts','unsupportedLines','reasonCodes'].some(k=>own(out,k)&&!Array.isArray(out[k]))||out.warnings?.length||out.missingFacts?.length||out.unsupportedLines?.length||out.reasonCodes?.length||!own(out,'outcome')){failure='Scenario not fully supported';return}outcomes.push({answers,outcome:stable(out.outcome)})}
   catch(e){failure='Scenario evaluator failed'}return;
  }
  for(const opt of unknown[i].options)visit(i+1,{...answers,[unknown[i].key]:opt.id});
 }
 visit(0,{...answers});
 if(failure)return {status:'unsupported',reason:failure};
 const unique=[...new Set(outcomes.map(o=>o.outcome))];
 if(unique.length===1)return {status:'ready',outcome:JSON.parse(unique[0]),questions:[],scenarios:outcomes.length};
 const relevant=unknown.filter(f=>{
  const groups=new Map();
  for(const o of outcomes){const key=stable(Object.fromEntries(unknown.filter(x=>x.key!==f.key).map(x=>[x.key,o.answers[x.key]])));if(!groups.has(key))groups.set(key,new Set());groups.get(key).add(o.outcome)}
  return [...groups.values()].some(s=>s.size>1);
 });
 if(!relevant.length)return {status:'unsupported',reason:'Outcomes differ without a distinguishable fact'};
 const first=relevant[0];
 return {status:'question',key:first.key,question:first.question||'Quale informazione manca?',options:first.options,reason:'Questa risposta può cambiare il risultato',relevantKeys:relevant.map(f=>f.key),scenarios:outcomes.length};
}
root.JudgeQuestionPlanner={plan};
})(typeof window!=='undefined'?window:globalThis);
