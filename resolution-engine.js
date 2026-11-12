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
 // Validate every explicitly bound instruction even when all targets are legal.
 // An event's actual recipient must agree with its declared target binding.
 for(const e of events){
  if(e.targetId===undefined)continue;
  const recipient=['gainLife','loseLife'].includes(e.type)?e.player:e.target;
  if(typeof e.targetId!=='string'||!e.targetId||typeof recipient!=='string'||recipient!==e.targetId)
   return {supported:false,reason:'Riferimento bersaglio incoerente con il destinatario dell’evento',legality};
  if(legality&&!top.targets.some(t=>t.id===e.targetId))
   return {supported:false,reason:'Istruzione riferita a un bersaglio non dichiarato',legality};
 }
 // A target-bound instruction cannot be silently accepted without a
 // corresponding declared target, even for an otherwise untargeted spell.
 if(!legality&&events.some(e=>e.targetId!==undefined))
  return {supported:false,reason:'Riferimento bersaglio senza bersagli dichiarati'};
 if(legality&&legality.results.some(x=>!x.legal)){
  const chosen=top.targets.map(t=>t.id);
  if(new Set(chosen).size!==chosen.length)return {supported:false,reason:'Bersagli ripetuti: riferimento non univoco'};
  if(events.some(e=>typeof e.targetId!=='string'||!chosen.includes(e.targetId)))
   return {supported:false,reason:'Bersagli parzialmente illegali: dipendenze delle istruzioni non esplicite',legality};
  // A declared target reference must identify the actual event recipient.
  // Otherwise filtering by metadata alone could apply an effect to an illegal target.
  for(const e of events){
   const recipient=['gainLife','loseLife'].includes(e.type)?e.player:e.target;
   if(typeof recipient!=='string'||recipient!==e.targetId)
    return {supported:false,reason:'Riferimento bersaglio incoerente con il destinatario dell’evento',legality};
  }
  const legal=new Set(legality.results.filter(x=>x.legal).map(x=>x.id));
  events=events.filter(e=>legal.has(e.targetId));
 }
 return {supported:true,step:'resolveStructured',events,legality};
}
root.JudgeResolution={plan};
})(typeof window!=='undefined'?window:globalThis);
