/* Event pipeline: explicit actions -> state update -> conservative SBA preview. */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const types=new Set(['gainLife','loseLife','tap','untap','putCounters','dealDamage']);
function run(input,events){
 if(!root.JudgeCoordinator||!root.JudgeRulesCore)return {supported:false,reason:'Coordinatore o motore eventi non disponibile'};
 if(!Array.isArray(events)||!events.length)return {supported:false,reason:'Nessun evento'};
 const state=copy(input),initial=root.JudgeCoordinator.evaluate(state);
 if(!initial.supported)return initial;
 const log=[],appliedEvents=[];let blocked=false;
 const replacements=input.replacements||[];
 if(!Array.isArray(replacements))return {supported:false,reason:'Sostituzioni non valide'};
 if(replacements.length&&!root.JudgeReplacements)return {supported:false,reason:'Motore sostituzioni non disponibile'};
 for(const original of events){
  const replacement=root.JudgeReplacements?root.JudgeReplacements.process(original,replacements,original.replacementChoices||[]):{supported:true,event:original,trace:[]};
  if(!replacement.supported)return {...replacement,supported:false};
  const event=replacement.event;
  if(event==null){log.push({type:'prevented',replacements:replacement.trace});continue;}
  appliedEvents.push(copy(event));
  if(!types.has(event.type))return {supported:false,reason:'Evento non supportato: '+event.type};
  const amount=event.amount;
  if(['gainLife','loseLife','putCounters','dealDamage'].includes(event.type)&&(!Number.isSafeInteger(amount)||amount<0))return {supported:false,reason:'Quantità non valida'};
  const player=state.players.find(p=>p.id===event.player),target=state.objects.find(o=>o.id===event.target);
  if(['gainLife','loseLife'].includes(event.type)){
   if(!player)return {supported:false,reason:'Giocatore non valido'};
   player.life+=event.type==='gainLife'?amount:-amount;
  }else{
   if(!target||target.zone!=='battlefield')return {supported:false,reason:'Bersaglio assente dal campo'};
   if(event.type==='tap'||event.type==='untap')target.tapped=event.type==='tap';
   if(event.type==='putCounters'){
    if(!event.counterType||!['+1/+1','-1/-1'].includes(event.counterType))return {supported:false,reason:'Tipo segnalino non supportato'};
    target.counters=target.counters||{};target.counters[event.counterType]=(target.counters[event.counterType]||0)+amount;
   }
   if(event.type==='dealDamage')target.damage=(target.damage||0)+amount;
  }
  log.push({type:event.type,amount:amount??null,target:event.target||event.player,replacements:replacement.trace});
 }
 const outcome=root.JudgeCoordinator.evaluate(state);
 if(!outcome.supported)return outcome;
 const uncertainty=state.effects.some(e=>e.kind)||state.objects.some(o=>o.oracleUnknown?.length||o.oracle_text?.trim())||outcome.results.some(r=>r.status==='unsupported');
 const sba=[];
 if(uncertainty){blocked=true;sba.push({status:'not-executed',reason:'Effetti o testo Oracle non completamente verificati: azioni basate sullo stato non applicate'});}
 else {
  const game=outcome.game;
  // Core SBA is used only for simple, fully entered battlefield characteristics.
  const changes=root.JudgeRulesCore.stateBasedActions(game);
  for(const change of changes)sba.push(change);
  // The core mutates its own copy, not the returned state. Report preview only.
 }
 return {supported:true,state,outcome,events:log,appliedEvents,sba,sbaExecuted:false,warnings:[...outcome.warnings,'Eventi espliciti soltanto; gli inneschi sono gestiti dal flusso turni quando disponibile.']};
}
root.JudgeEventPipeline={run};
})(typeof window!=='undefined'?window:globalThis);
