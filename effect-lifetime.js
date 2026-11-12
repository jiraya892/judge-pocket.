/* 2D: effect lifetime is independent from current visibility of its generating ability.
   Static abilities generate effects while active at evaluation start; once generated,
   their effects continue through the same layer evaluation (CR 613.6).
   Resolved spell/ability effects use explicit duration, not source presence. */
(function(root){'use strict';
const modes=new Set(['static','resolved','unattributed']);
const durations=new Set(['untilEndOfTurn','untilEndOfCombat','whileSourceOnBattlefield','permanent','untilSpecifiedEvent']);
function prepare(objects,effects){
 if(!Array.isArray(objects)||!Array.isArray(effects))return {supported:false,reason:'Input durata effetti non valido'};
 const byId=new Map(objects.map(o=>[o.id,o]));
 const active=[],records=[];
 for(const e of effects){
  const mode=e.lifetime?.mode||(e.sourceAbilityId?'static':'unattributed');
  if(!modes.has(mode))return {supported:false,reason:'Modalità generazione effetto sconosciuta'};
  if(mode==='unattributed'){active.push(e);records.push(Object.freeze({id:e.id||null,mode:'unattributed',generated:true}));}
  else if(mode==='static'){
   if(!e.sourceId||!e.sourceAbilityId)return {supported:false,reason:'Effetto statico senza abilità sorgente'};
   const source=byId.get(e.sourceId);
   if(!source||source.zone&&source.zone!=='battlefield')return {supported:false,reason:'Fonte statica non presente sul campo'};
   if(!Array.isArray(source.abilities)||!source.abilities.some(a=>a&&a.id===e.sourceAbilityId))return {supported:false,reason:'Abilità statica sorgente non presente nello stato iniziale'};
   active.push(e);records.push(Object.freeze({id:e.id||null,mode:'static',sourceId:e.sourceId,sourceAbilityId:e.sourceAbilityId,generated:true}));
  }else{
   const duration=e.lifetime?.duration;
   if(!durations.has(duration))return {supported:false,reason:'Durata di effetto risolto non specificata'};
   const now=e.lifetime?.context;
   if(!now||typeof now!=='object')return {supported:false,reason:'Contesto temporale mancante'};
   let alive;
   if(duration==='permanent')alive=true;
   else if(duration==='untilEndOfTurn')alive=Number.isSafeInteger(now.currentTurn)&&Number.isSafeInteger(e.lifetime.createdTurn)&&now.currentTurn===e.lifetime.createdTurn;
   else if(duration==='untilEndOfCombat')alive=now.combatId!=null&&now.combatId===e.lifetime.createdCombatId;
   else if(duration==='whileSourceOnBattlefield')alive=!!byId.get(e.sourceId)&&(!byId.get(e.sourceId).zone||byId.get(e.sourceId).zone==='battlefield');
   else if(duration==='untilSpecifiedEvent')alive=typeof now.eventOccurred==='boolean'?!now.eventOccurred:undefined;
   if(alive===undefined)return {supported:false,reason:'Durata effetto risolto non determinabile'};
   if(alive)active.push(e);
   records.push(Object.freeze({id:e.id||null,mode:'resolved',duration,generated:alive}));
  }
 }
 return {supported:true,effects:active,records:Object.freeze(records)};
}
root.JudgeEffectLifetime={prepare};
})(typeof window!=='undefined'?window:globalThis);