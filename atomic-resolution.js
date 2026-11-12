/* Group 5L: explicit atomic resolution boundary.
   State-based actions must run after the entire spell/ability resolves,
   not between its instructions (CR 704.3, 608.2). */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function resolve(state,instructions,execute,stabilize){
 if(!state||!Array.isArray(instructions)||!instructions.length||typeof execute!=='function'||typeof stabilize!=='function')
  return {supported:false,reason:'Scenario di risoluzione incompleto'};
 let working=clone(state),events=[];
 for(const instruction of instructions){
  if(!instruction||typeof instruction.type!=='string')return {supported:false,reason:'Istruzione non valida'};
  const step=execute(working,clone(instruction));
  if(!step||!step.supported||!step.state)return {supported:false,reason:step?.reason||'Istruzione non eseguibile'};
  working=step.state;events.push(clone(instruction));
 }
 const settled=stabilize(working);
 if(!settled||!settled.supported||!settled.state)return {supported:false,reason:settled?.reason||'SBA non determinabili'};
 return {supported:true,state:settled.state,events,sba:settled.changes||[]};
}
root.JudgeAtomicResolution={resolve};
})(typeof window!=='undefined'?window:globalThis);
