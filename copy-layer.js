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
 if(effects.some(e=>e.faceDown||e.mutate||e.meld||e.exception||e.copyModification||e.asEnters||e.copyAs||e.copyExceptions))return {supported:false,reason:'Eccezione ai valori copiabili non ancora supportata'};
 const ordered=effects.map((e,i)=>({...e,_index:i})).sort((a,b)=>a.timestamp-b.timestamp||a._index-b._index);
 const states=new Map(objects.map(o=>[o.id,{...o}]));
 const order=[];
 for(const e of ordered){
  if(e.sourceId===e.targetId)return {supported:false,reason:'Copia di se stessa non supportata'};
  // Copiable values are read at the time this effect is applied, not from the
  // final state of the source after subsequent copy effects.
  const source=states.get(e.sourceId),target=states.get(e.targetId);
  states.set(e.targetId,{...target,...snapshot(source)});
  order.push({id:e.id||null,kind:e.kind,layer:'1a',timestamp:e.timestamp,sourceId:e.sourceId,targetId:e.targetId});
 }
 return {supported:true,objects:objects.map(o=>states.get(o.id)),order,coverage:'restricted-copy-1a'};

}
root.JudgeCopyLayer={evaluate,snapshot};
})(typeof window!=='undefined'?window:globalThis);