/* Chapter 16A/B: outcome-equivalence question planning. No card names or rulings. */
(function(root){'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const stable=x=>JSON.stringify(x);
function plan(input, evaluator){
 const facts=input?.facts;
 if(!Array.isArray(facts)||typeof evaluator!=='function')return {status:'unsupported',reason:'Invalid planner input'};
 if(facts.some(f=>!f||typeof f.key!=='string'||!f.key)||new Set(facts.map(f=>f.key)).size!==facts.length)return {status:'unsupported',reason:'Invalid or duplicate fact keys'};
 const unknown=facts.filter(f=>!own(input.answers,f.key));
 if(unknown.some(f=>typeof f.key!=='string'||!f.key||!Array.isArray(f.options)||f.options.length<1||f.options.length>8||new Set(f.options.map(o=>String(o.id))).size!==f.options.length))return {status:'unsupported',reason:'Invalid fact options'};
 if(unknown.length>10)return {status:'unsupported',reason:'Too many unknown facts'};
 const combinations=unknown.reduce((n,f)=>n*f.options.length,1);
 if(combinations>512)return {status:'unsupported',reason:'Scenario limit exceeded'};
 const outcomes=[];let failure=null;
 function visit(i,answers){
  if(failure)return;
  if(i===unknown.length){
   try{const out=evaluator({...input,answers});if(!out||out.supported!==true||!own(out,'outcome')){failure='Scenario not fully supported';return}outcomes.push({answers,outcome:stable(out.outcome)})}
   catch(e){failure='Scenario evaluator failed'}return;
  }
  for(const opt of unknown[i].options)visit(i+1,{...answers,[unknown[i].key]:opt.id});
 }
 visit(0,{...(input.answers||{})});
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
