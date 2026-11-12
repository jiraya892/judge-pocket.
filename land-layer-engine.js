/* Dependency-aware layer 4 for explicit land type-changing effects.
   Scope deliberately limited to type-changing effects; no card-name exceptions. */
(function(root){
'use strict';
const has=(o,t)=>o.types.includes(t);
const isNonbasic=o=>has(o,'land')&&!o.supertypes.includes('basic');
function snapshot(o){return {types:[...o.types],subtypes:[...o.subtypes],supertypes:[...o.supertypes],abilities:[...o.abilities],controller:o.controller,token:!!o.token}}
function apply(effect,objects){
 const out=objects.map(snapshot);
 for(let i=0;i<out.length;i++){
  const o=out[i],original=objects[i];
  if(effect.kind==='addLandSubtype'){
   if(effect.scope==='nontokenCreaturesYouControl'&&(!has(o,'creature')||original.token||original.controller!==effect.controller))continue;
   if(!has(o,'land'))o.types.push('land');
   if(!o.subtypes.includes(effect.subtype))o.subtypes.push(effect.subtype);
  }else if(effect.kind==='setNonbasicLandSubtype'){
   if(!isNonbasic(o))continue;
   o.subtypes=o.subtypes.filter(x=>!['Plains','Island','Swamp','Mountain','Forest'].includes(x));
   o.subtypes.push(effect.subtype);
   // CR 305.7: replacing a land's basic land types removes abilities generated from its rules text.
   o.abilities=o.abilities.filter(a=>a.origin!=='rulesText');
  }
 }
 return out;
}
function evaluate(objects,effects){
 if(!Array.isArray(objects)||!Array.isArray(effects)||objects.some(o=>!o||!Array.isArray(o.types)||!Array.isArray(o.subtypes)||!Array.isArray(o.supertypes)||!Array.isArray(o.abilities))return {supported:false,reason:'Oggetti incompleti'};
 if(effects.some(e=>!e||!['addLandSubtype','setNonbasicLandSubtype'].includes(e.kind)||!Number.isSafeInteger(e.timestamp)||!['Forest','Mountain','Plains','Island','Swamp'].includes(e.subtype)))return {supported:false,reason:'Effetto di tipo terra non supportato'};
 if(effects.some(e=>e.kind==='addLandSubtype'&&e.scope!=='nontokenCreaturesYouControl'))return {supported:false,reason:'Ambito non supportato'};
 let state=objects.map(snapshot),pending=effects.map((e,i)=>({...e,_index:i})),order=[];
 while(pending.length){
  const dependencies=new Map();
  for(const e of pending){
   const deps=[];
   for(const other of pending){
    if(e===other)continue;
    const before=apply(e,state);
    const after=apply(e,apply(other,state));
    // Conservative dependency check: another effect changes whether e applies
    // or the types/subtypes/abilities produced by e.
    if(JSON.stringify(before)!==JSON.stringify(after)&&
       (e.kind==='setNonbasicLandSubtype'&&other.kind==='addLandSubtype')&&
       state.some((o,i)=>!isNonbasic(o)&&isNonbasic(apply(other,state)[i]))) { deps.push(other._index); }
   }
   dependencies.set(e._index,deps);
  }
  const ready=pending.filter(e=>dependencies.get(e._index).every(id=>!pending.some(x=>x._index===id))).sort((a,b)=>a.timestamp-b.timestamp||a._index-b._index);
  if(!ready.length)return {supported:false,reason:'Ciclo di dipendenze non risolto'};
  const e=ready[0];state=apply(e,state);order.push({kind:e.kind,timestamp:e.timestamp});pending=pending.filter(x=>x!==e);
 }
 return {supported:true,objects:state,order};
}
root.JudgeLandLayers={evaluate};
})(typeof window!=='undefined'?window:globalThis);
