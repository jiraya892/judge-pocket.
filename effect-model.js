/* 2B foundation: three independent records: source ability, continuous effect, dependency.
   Structured input only; unresolved Oracle semantics fail closed. */
(function(root){'use strict';
function build(objects,effects){
 if(!Array.isArray(objects)||!Array.isArray(effects))return {supported:false,reason:'Input non valido'};
 const ids=new Set(),abilities=new Map(),sources=[],continuous=[];
 for(const o of objects){
  if(!o||typeof o.id!=='string'||ids.has(o.id)||!Array.isArray(o.abilities||[]))return {supported:false,reason:'Oggetto sorgente non valido'};
  ids.add(o.id);
  for(const a of o.abilities||[]){
   if(typeof a==='string')continue; // keyword ability, not a structured source record
   if(!a||typeof a.id!=='string'||!a.id||abilities.has(o.id+'::'+a.id))return {supported:false,reason:'ID abilità sorgente duplicato o mancante'};
   const record=Object.freeze({id:a.id,objectId:o.id,origin:a.origin||'unknown',kind:a.kind||'static',text:a.text||null});
   abilities.set(o.id+'::'+a.id,record);sources.push(record);
  }
 }
 const effectIds=new Set();
 for(let i=0;i<effects.length;i++){
  const e=effects[i];if(!e||typeof e.kind!=='string'||!e.kind||!Number.isSafeInteger(e.timestamp))return {supported:false,reason:'Effetto continuo incompleto'};
  const id=e.id||'effect-'+i;if(effectIds.has(id))return {supported:false,reason:'ID effetto duplicato'};effectIds.add(id);
  if(e.sourceAbilityId&&!e.sourceId)return {supported:false,reason:'Abilità senza oggetto sorgente'};
  if(e.sourceId&&!ids.has(e.sourceId))return {supported:false,reason:'Oggetto sorgente assente'};
  if(e.sourceAbilityId&&!abilities.has(e.sourceId+'::'+e.sourceAbilityId))return {supported:false,reason:'Abilità sorgente assente'};
  continuous.push(Object.freeze({id,sourceAbility:e.sourceAbilityId?e.sourceId+'::'+e.sourceAbilityId:null,sourceObjectId:e.sourceId||null,layer:String(e.layer),operation:e.kind,targetId:e.targetId||null,timestamp:e.timestamp,raw:e}));
 }
 const dependencies=[];
 for(const e of continuous)for(const dep of e.raw.dependency||[]){
  if(!effectIds.has(dep))return {supported:false,reason:'Dipendenza con effetto assente'};
  if(dep===e.id)return {supported:false,reason:'Autodipendenza esplicita non valida'};
  dependencies.push(Object.freeze({dependentId:e.id,prerequisiteId:dep,reason:'explicit',layer:e.layer}));
 }
 return {supported:true,model:Object.freeze({sourceAbilities:Object.freeze(sources),continuousEffects:Object.freeze(continuous),dependencies:Object.freeze(dependencies)})};
}
function runtime(model){
 if(!model||!Array.isArray(model.continuousEffects)||!Array.isArray(model.dependencies))return {supported:false,reason:'Modello effetti assente'};
 const byId=new Map(model.continuousEffects.map(e=>[e.id,e]));
 if(byId.size!==model.continuousEffects.length)return {supported:false,reason:'ID effetti duplicati'};
 const deps=new Map(model.continuousEffects.map(e=>[e.id,[]]));
 for(const d of model.dependencies){if(!byId.has(d.dependentId)||!byId.has(d.prerequisiteId))return {supported:false,reason:'Dipendenza non risolvibile'};deps.get(d.dependentId).push(d.prerequisiteId)}
 return {supported:true,effects:model.continuousEffects.map(e=>Object.freeze({...e.raw,id:e.id,layer:e.layer,dependency:deps.get(e.id),sourceId:e.sourceObjectId,sourceAbilityId:e.sourceAbility?e.sourceAbility.split('::').slice(1).join('::'):undefined})),model};
}
function sourceExists(effect,state){
 if(!effect.sourceAbilityId)return true;
 if(!Array.isArray(state))return undefined;
 const source=state.find(o=>o.id===effect.sourceId);
 if(!source||!Array.isArray(source.abilities))return undefined;
 return source.abilities.some(a=>a.id===effect.sourceAbilityId);
}
root.JudgeEffectModel={build,runtime,sourceExists};
})(typeof window!=='undefined'?window:globalThis);