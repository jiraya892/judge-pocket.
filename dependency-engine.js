/* CR 613 dependency planner for supported, structured effects.
   Dependencies are inferred from changes to the affected set; opaque effects fail closed. */
(function(root){'use strict';
function order(effects,state,handlers){
 const list=effects.map((e,i)=>({...e,_index:i,_id:e.id||'effect-'+i}));
 if(new Set(list.map(e=>e._id)).size!==list.length)return {supported:false,reason:'ID effetti duplicati'};
 if(list.some(e=>!Number.isSafeInteger(e.timestamp)||e.dependency&&!Array.isArray(e.dependency)))return {supported:false,reason:'Timestamp o dipendenze invalidi'};
 if(list.some(e=>(e.dependency||[]).some(id=>!list.some(x=>x._id===id))))return {supported:false,reason:'Dipendenza non trovata'};
 let pending=list,working=state,ordered=[];
 while(pending.length){
  const edges=new Map();
  for(const e of pending){
   const dependencies=new Set((e.dependency||[]).filter(id=>pending.some(x=>x._id===id)));
   for(const other of pending){if(e===other)continue;
    const existsBefore=handlers.exists?handlers.exists(e,working):true;
    const existsAfter=handlers.exists?handlers.exists(e,handlers.apply(other,working)):true;
    if(existsBefore===undefined||existsAfter===undefined)return {supported:false,reason:'Esistenza abilità generatrice non determinabile'};
    if(existsBefore!==existsAfter)dependencies.add(other._id);
    const before=handlers.affected(e,working);
    const modified=handlers.apply(other,working);
    const after=handlers.affected(e,modified);
    if(!Array.isArray(before)||!Array.isArray(after))return {supported:false,reason:'Applicabilità non determinabile'};
    if(before.join('|')!==after.join('|'))dependencies.add(other._id);
    // Optional semantic signature: dependency also exists when an effect changes what another effect does.
    if(handlers.signature){const first=handlers.signature(e,working),second=handlers.signature(e,modified);if(first===undefined||second===undefined)return {supported:false,reason:'Risultato effetto non determinabile'};if(JSON.stringify(first)!==JSON.stringify(second))dependencies.add(other._id)}
   }
   edges.set(e._id,dependencies);
  }
  const ready=pending.filter(e=>edges.get(e._id).size===0).sort((a,b)=>a.timestamp-b.timestamp||a._index-b._index);
  if(!ready.length){
   // Ignore only edges within a strongly connected component, preserving dependencies outside it.
   const reachable=(start,target,seen=new Set())=>{if(start===target)return true;if(seen.has(start))return false;seen.add(start);return [...(edges.get(start)||[])].some(id=>reachable(id,target,seen))};
   const cyclic=new Set(pending.filter(e=>[...(edges.get(e._id)||[])].some(id=>reachable(id,e._id))).map(e=>e._id));
   if(!cyclic.size)return {supported:false,reason:'Dipendenze non risolvibili'};
   // A cyclic node is eligible only if all dependencies outside its SCC are already resolved.
   const eligible=pending.filter(e=>cyclic.has(e._id)&&[...(edges.get(e._id)||[])].every(id=>cyclic.has(id)&&reachable(id,e._id)));
   if(!eligible.length)return {supported:false,reason:'Ciclo con dipendenze esterne non risolte'};
   eligible.sort((a,b)=>a.timestamp-b.timestamp||a._index-b._index);
   const next=eligible[0];if(handlers.exists&&handlers.exists(next,working)===false)return {supported:false,reason:'Abilità generatrice non più presente: durata non verificata'};working=handlers.apply(next,working);ordered.push(next);pending=pending.filter(e=>e!==next);continue;
  }
  const next=ready[0];if(handlers.exists&&handlers.exists(next,working)===false)return {supported:false,reason:'Abilità generatrice non più presente: durata non verificata'};working=handlers.apply(next,working);ordered.push(next);pending=pending.filter(e=>e!==next);
 }
 return {supported:true,state:working,order:ordered};
}
root.JudgeDependencies={order};
})(typeof window!=='undefined'?window:globalThis);