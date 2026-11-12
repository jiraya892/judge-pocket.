/* Explicit, validated effects only. Unsupported Oracle never silently resolves. */
(function(root){
'use strict';
function execute(core,state,action){
 if(!core||!state||!action||typeof action!=='object')return {applied:false,reason:'Input mancante'};
 const type=action.type;
 if(!['gainLife','loseLife','dealDamage','putCounters','createTokens','tap','untap'].includes(type))
  return {applied:false,reason:'Effetto non supportato automaticamente: '+String(type)};
 // Validate before mutating state, including all numeric bounds.
 if(['gainLife','loseLife','dealDamage','putCounters','createTokens'].includes(type)&&
    (!Number.isSafeInteger(action.amount)||action.amount<0||action.amount>100))
  return {applied:false,reason:'Quantità non valida (0–100)'};
 if(['gainLife','loseLife','createTokens'].includes(type)&&!state.players.some(p=>p.id===action.player))
  return {applied:false,reason:'Giocatore inesistente'};
 if(['tap','untap','putCounters'].includes(type)&&!state.objects.some(o=>o.id===action.target&&o.zone==='battlefield'))
  return {applied:false,reason:'Permanente inesistente'};
 if(type==='dealDamage'&&!state.players.some(p=>p.id===action.target)&&!state.objects.some(o=>o.id===action.target&&o.zone==='battlefield'))
  return {applied:false,reason:'Bersaglio inesistente'};
 if(type==='createTokens'&&(!action.token||typeof action.token.name!=='string'||!action.token.name.trim()))
  return {applied:false,reason:'Pedina non specificata'};
 const result=core.applyEvent(state,action,action.order);
 if(!result.applied)return result;
 // State-based actions are applied only when explicitly requested by the caller,
 // not during a spell's resolution (CR 704.3).
 return {...result,requiresStateBasedActions:true,requiresTriggerProcessing:true};
}
function resolveStackItem(core,state,item){
 if(!item||!Array.isArray(item.effects)||item.effects.length!==1)
  return {applied:false,reason:'Risoluzione automatica limitata a un effetto esplicito'};
 // Target legality, replacement choices and full spell resolution are NOT implemented.
 if(item.targets?.length)return {applied:false,reason:'Bersagli da verificare manualmente'};
 return execute(core,state,item.effects[0]);
}
root.JudgeEffectExecutor={execute,resolveStackItem};
})(typeof window!=='undefined'?window:globalThis);
