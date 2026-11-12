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
  if(!ready.length)return {supported:false,reason:'Dipendenza circolare: serve gestione CR 613.8c'};
  const next=ready[0];working=handlers.apply(next,working);ordered.push(next);pending=pending.filter(e=>e!==next);
 }
 return {supported:true,state:working,order:ordered};
}
root.JudgeDependencies={order};
})(typeof window!=='undefined'?window:globalThis);