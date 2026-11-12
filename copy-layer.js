/* Layer 1a: copiable values, evaluated source snapshots and chained copies.
   Unsupported face-down, meld, mutate and copy exceptions fail closed. */
(function(root){'use strict';
const fields=['name','manaCost','manaValue','types','subtypes','supertypes','colors','abilities','power','toughness','ptDefinition','oracle_text','text','loyalty','defense'];
const arrays=new Set(['types','subtypes','supertypes','colors','abilities']);
function snapshot(o){const out={};for(const f of fields)if(Object.prototype.hasOwnProperty.call(o,f))out[f]=arrays.has(f)?[...(o[f]||[])]:o[f];return out}
function evaluate(objects,effects){
 if(!Array.isArray(objects)||!Array.isArray(effects))return {supported:false,reason:'Input copie non valido'};
 const ids=new Map(objects.map(o=>[o.id,o]));
 if(ids.size!==objects.length)return {supported:false,reason:'ID oggetti duplicati'};
 if(effects.some(e=>e.kind!=='copyCharacteristics'||e.layer!=='1a'||!e.sourceId||!e.targetId||e.targetId==='all'||!ids.has(e.sourceId)||!ids.has(e.targetId)||!Number.isSafeInteger(e.timestamp)))return {supported:false,reason:'Effetto copia incompleto'};
 if(effects.some(e=>e.faceDown||e.mutate||e.meld||e.exception||e.copyModification))return {supported:false,reason:'Eccezione ai valori copiabili non ancora supportata'};
 const byTarget=new Map();
 for(const e of effects){if(!byTarget.has(e.targetId))byTarget.set(e.targetId,[]);byTarget.get(e.targetId).push(e)}
 for(const list of byTarget.values())list.sort((a,b)=>a.timestamp-b.timestamp||effects.indexOf(a)-effects.indexOf(b));
 const resolved=new Map(),visiting=new Set(),order=[];
 function resolve(id){
  if(resolved.has(id))return resolved.get(id);
  if(visiting.has(id))throw Error('Ciclo di copie non determinabile');
  visiting.add(id);
  let state={...ids.get(id)};
  for(const e of byTarget.get(id)||[]){
   if(e.sourceId===id)throw Error('Copia di se stessa non supportata');
   const src=resolve(e.sourceId);
   state={...state,...snapshot(src)};
   order.push({id:e.id||null,kind:e.kind,layer:'1a',timestamp:e.timestamp,sourceId:e.sourceId,targetId:id});
  }
  visiting.delete(id);resolved.set(id,state);return state;
 }
 try{return {supported:true,objects:objects.map(o=>resolve(o.id)),order,coverage:'restricted-copy-1a'}}
 catch(err){return {supported:false,reason:err.message}}
}
root.JudgeCopyLayer={evaluate,snapshot};
})(typeof window!=='undefined'?window:globalThis);