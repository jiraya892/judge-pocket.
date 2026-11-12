/* 5N: deterministic target legality and instruction filtering at resolution.
   An illegal subset is ignored only when each instruction explicitly declares
   its target reference; ambiguous target dependencies fail closed. */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const supported=['gainLife','loseLife','putCounters','dealDamage','tap','untap'];
function plan(state,top){
 if(!state||!top||!Array.isArray(state.stack)||state.stack.at(-1)?.id!==top.id)return {supported:false,reason:'Solo la cima della pila può risolversi'};
 let legality=null;
 if(top.targets?.length){
  if(!root.JudgeTargets)return {supported:false,reason:'Motore bersagli assente'};
  legality=root.JudgeTargets.assess(state,top.targets);
  if(!legality.supported)return legality;
  if(legality.allIllegal)return {supported:true,step:'allTargetsIllegal',legality,events:[]};
 }
 if(!top.instruction)return {supported:true,step:'resolveManually',events:[],legality};
 const instructions=Array.isArray(top.instruction)?top.instruction:[top.instruction];
 if(!instructions.length||instructions.some(e=>!e||!supported.includes(e.type)))return {supported:false,reason:'Istruzioni di risoluzione non supportate'};
 let events=copy(instructions);
 if(legality&&legality.results.some(x=>!x.legal)){
  const chosen=top.targets.map(t=>t.id);
  if(new Set(chosen).size!==chosen.length)return {supported:false,reason:'Bersagli ripetuti: riferimento non univoco'};
  if(events.some(e=>typeof e.targetId!=='string'||!chosen.includes(e.targetId)))
   return {supported:false,reason:'Bersagli parzialmente illegali: dipendenze delle istruzioni non esplicite',legality};
  const legal=new Set(legality.results.filter(x=>x.legal).map(x=>x.id));
  events=events.filter(e=>legal.has(e.targetId));
 }
 return {supported:true,step:'resolveStructured',events,legality};
}
root.JudgeResolution={plan};
})(typeof window!=='undefined'?window:globalThis);
