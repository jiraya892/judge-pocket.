/* CR 613 dependency planner for supported, structured effects.
   Dependencies are inferred from changes to the affected set; opaque effects fail closed. */
(function(root){'use strict';
function order(input,state,handlers){
 const converted=Array.isArray(input)?{supported:true,effects:input}:root.JudgeEffectModel?.runtime(input);
 if(!converted?.supported)return {supported:false,reason:converted?.reason||'Modello dipendenze mancante'};
 const effects=converted.effects;
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
   // Tarjan SCC: only ignore cyclic edges inside the same strongly connected
   // component. Incoming dependencies from other components remain binding.
   let index=0;const indices=new Map(),low=new Map(),stack=[],onStack=new Set(),components=[];
   const visit=id=>{
    indices.set(id,index);low.set(id,index++);stack.push(id);onStack.add(id);
    for(const dep of edges.get(id)||[]){
     if(!indices.has(dep)){visit(dep);low.set(id,Math.min(low.get(id),low.get(dep)))}
     else if(onStack.has(dep))low.set(id,Math.min(low.get(id),indices.get(dep)));
    }
    if(low.get(id)===indices.get(id)){
     const component=[];let node;
     do{node=stack.pop();onStack.delete(node);component.push(node)}while(node!==id);
     components.push(component);
    }
   };
   for(const e of pending)if(!indices.has(e._id))visit(e._id);
   const cyclic=components.filter(c=>c.length>1||c.some(id=>edges.get(id).has(id)));
   const eligible=cyclic.filter(component=>component.every(id=>[...edges.get(id)].every(dep=>component.includes(dep))));
   if(!eligible.length)return {supported:false,reason:'Ciclo con dipendenze esterne non risolte'};
   const pool=pending.filter(e=>eligible.some(component=>component.includes(e._id)));
   pool.sort((a,b)=>a.timestamp-b.timestamp||a._index-b._index);
   const next=pool[0];
   if(handlers.exists&&handlers.exists(next,working)===false)return {supported:false,reason:'Abilità generatrice non più presente: durata non verificata'};
   working=handlers.apply(next,working);ordered.push(next);pending=pending.filter(e=>e!==next);continue;
  }
  const next=ready[0];if(handlers.exists&&handlers.exists(next,working)===false)return {supported:false,reason:'Abilità generatrice non più presente: durata non verificata'};working=handlers.apply(next,working);ordered.push(next);pending=pending.filter(e=>e!==next);
 }
 return {supported:true,state:working,order:ordered};
}
root.JudgeDependencies={order};
})(typeof window!=='undefined'?window:globalThis);