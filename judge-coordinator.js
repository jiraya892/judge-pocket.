/* Unified, conservative orchestration of the existing independent engines. */
(function(root){'use strict';
const generic=new Set(['addType','removeType','setColor','addColor','removeColor','addAbility','removeAbility','removeAllAbilities','setPT','definePT','modifyPT','switchPT','setController','replaceText']);
const land=new Set(['addLandSubtype','setNonbasicLandSubtype']);
function evaluate(input){
 if(!input||!Array.isArray(input.objects)||!Array.isArray(input.effects)||!Array.isArray(input.players))return {supported:false,reason:'Formato stato non valido'};
 if(!root.JudgeRulesCore||!root.JudgeLayers||!root.JudgeContinuousState)return {supported:false,reason:'Moduli del motore mancanti'};
 const game=root.JudgeRulesCore.createGame(['A','B']);
 for(const p of input.players){const dest=game.players.find(x=>x.id===p.id);if(!dest||!Number.isInteger(p.life))return {supported:false,reason:'Dati giocatore invalidi'};dest.life=p.life}
 game.activePlayer=input.turn?.activePlayer||'A';game.priorityPlayer=input.turn?.priorityPlayer||'A';
 const source=input.objects.filter(o=>o.zone==='battlefield'),results=[],warnings=[];
 for(const o of input.objects){if(!o.name||!['A','B'].includes(o.owner)||!['A','B'].includes(o.controller)||!Array.isArray(o.types))return {supported:false,reason:'Oggetto incompleto'};const added=root.JudgeRulesCore.addObject(game,o);added.damage=o.damage||0;added.tapped=!!o.tapped}
 const active=input.effects.filter(e=>!e.oracleGenerated||source.some(o=>o.id===e.sourceId));
 const landEffects=active.filter(e=>land.has(e.kind));
 const layer4=active.filter(e=>e.layer==='4'&&(land.has(e.kind)||generic.has(e.kind)));
 const unified=layer4.length&&root.JudgeUnifiedLayer4?root.JudgeUnifiedLayer4.evaluate(source.map(o=>({...o,abilities:o.abilities||[],subtypes:o.subtypes||[],supertypes:o.supertypes||[]})),layer4):null;
 if(unified&&!unified.supported)warnings.push('Layer 4 unificato: '+unified.reason);
 const landObjects=source.map(o=>({types:o.types.slice(),subtypes:(o.subtypes||[]).slice(),supertypes:(o.supertypes||[]).slice(),abilities:(o.abilities||[]).slice(),controller:o.controller,token:!!o.token,power:o.power,toughness:o.toughness,ptDefinition:o.ptDefinition}));
 let landOutcome=null;
 if(landEffects.length){
  if(active.some(e=>generic.has(e.kind)&&e.layer==='4'))warnings.push('Effetti di layer 4 di motori diversi non ordinati insieme: risultato incompleto.');
  landOutcome=root.JudgeContinuousState.evaluate(landObjects,landEffects);
  if(!landOutcome.supported)warnings.push('Motore terre: '+landOutcome.reason);
  else warnings.push(...(landOutcome.warnings||[]));
 }
 for(const o of input.objects){
  if(o.zone!=='battlefield'){results.push({id:o.id,name:o.name,status:'not-evaluated'});continue}
  const relevant=active.filter(e=>e.targetId===o.id||e.targetId==='all');
  const unsupported=relevant.filter(e=>!generic.has(e.kind)&&!land.has(e.kind));
  const unknown=o.oracleUnknown||[];
  if(unsupported.length||unknown.length){results.push({id:o.id,name:o.name,status:'unsupported',reason:[...unsupported.map(e=>e.text||e.kind||'effetto non strutturato'),...unknown].join(' | ')});continue}
  const genericEffects=relevant.filter(e=>generic.has(e.kind)&&e.layer!=='4');
  const genericLayer4=relevant.filter(e=>generic.has(e.kind)&&e.layer==='4');
  const combinedLayer4=unified?.supported&&unified.objects[source.indexOf(o)];
  if(layer4.length&&!combinedLayer4&&genericLayer4.length){results.push({id:o.id,name:o.name,status:'unsupported',reason:'Layer 4 unificato non disponibile'});continue}
  const outcome=root.JudgeLayers.evaluate({types:o.types,controller:o.controller,power:o.power,toughness:o.toughness,abilities:o.abilities||[],colors:o.colors||[],text:o.oracle_text||''},genericEffects);
  if(!outcome.supported){results.push({id:o.id,name:o.name,status:'unsupported',reason:outcome.reason});continue}
  const index=source.indexOf(o),landState=landOutcome?.supported?landOutcome.objects[index]:null;
  const landAffected=landEffects.some(e=>e.kind==='setNonbasicLandSubtype'&&landState?.subtypes?.includes(e.subtype)||e.kind==='addLandSubtype'&&landState?.subtypes?.includes(e.subtype));
  const cdaRemoved=!!(o.ptDefinition&&(combinedLayer4||landState)&&!(combinedLayer4||landState).abilities.some(a=>a.id===o.ptDefinition.abilityId));
  if(cdaRemoved){results.push({id:o.id,name:o.name,status:'unsupported',reason:'Abilità che definisce P/T rimossa: calcolo completo dei layer non verificato'});continue}
  const mixed=landAffected&&genericEffects.some(e=>e.layer==='6'||e.layer==='7a');
  const hasCounters=!!((o.counters?.['+1/+1']||0)||(o.counters?.['-1/-1']||0));
  if(hasCounters&&genericEffects.some(e=>e.layer==='7d')){results.push({id:o.id,name:o.name,status:'unsupported',reason:'Ordine layer 7c/7d e segnalini non integrato'});continue}
  if(mixed||landEffects.length&&!landOutcome?.supported||layer4.length&&unified&&!unified.supported){results.push({id:o.id,name:o.name,status:'unsupported',reason:'Interazione fra motori non risolta in sicurezza'});continue}
  const types=combinedLayer4?combinedLayer4.types:landState?Array.from(new Set([...outcome.state.types,...landState.types.filter(t=>!o.types.includes(t))])):outcome.state.types;
  const counter=o.counters?.['+1/+1']||0,negative=o.counters?.['-1/-1']||0;
  let power=outcome.state.power,toughness=outcome.state.toughness;
  if(landState&&o.ptDefinition&&genericEffects.length===0){power=landState.power;toughness=landState.toughness}
  if(power!==null&&power!==undefined)power+=counter-negative;
  if(toughness!==null&&toughness!==undefined)toughness+=counter-negative;
  const uncertain=!!(layer4.length&&!unified?.supported);
  results.push({id:o.id,name:o.name,status:uncertain?'unsupported':'partial',types,subtypes:combinedLayer4?.subtypes||landState?.subtypes||o.subtypes||[],controller:outcome.state.controller,power,toughness,damage:o.damage||0,possibleZeroToughness:types.includes('creature')&&toughness!==null&&toughness<=0,possibleLethalDamage:types.includes('creature')&&toughness!==null&&toughness>0&&(o.damage||0)>=toughness,order:[...(unified?.supported?unified.order:landOutcome?.order||[]),...outcome.order]});
 }
 if(input.objects.some(o=>o.oracleUnknown?.length))warnings.push('Oracle non completamente interpretato: anche gli altri permanenti potrebbero essere influenzati.');
 if(active.some(e=>!e.targetId))warnings.push('Effetti privi di ambito ignorati.');
 warnings.push('SBA solo segnalate, non eseguite: abilità, dipendenze generali, pila e testo Oracle incompleto possono cambiare il risultato.');
 return {supported:true,game,results,warnings,modules:{gameState:true,genericLayers:true,landLayers:!!landOutcome?.supported,oracleRecognition:!!root.JudgeOracleRecognition,stateBasedActions:'advisory-only'}};
}
root.JudgeCoordinator={evaluate};
})(typeof window!=='undefined'?window:globalThis);
