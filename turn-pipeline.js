/* Explicit replacement, trigger and priority pipeline. No free-text execution. */
(function(root){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
function create(input){const state=clone(input);state.stack=state.stack||[];state.pending=state.pending||[];state.pendingTriggers=state.pendingTriggers||[];state.delayedTriggers=state.delayedTriggers||[];state.priority=state.turn?.priorityPlayer||'A';state.passes=0;state.history=[];return state}
function apply(state,action){const s=clone(state);if(!action||!action.type)return {supported:false,reason:'Azione mancante'};
 const players=(s.players||[]).map(x=>x.id),validPlayer=id=>players.includes(id);
 if(action.type==='event'){
  if(!root.JudgeEventPipeline)return {supported:false,reason:'Motore eventi assente'};
  const ev=clone(action.event||{});const replacement=(s.replacements||[]).filter(r=>r.eventType===ev.type&&(!r.player||r.player===ev.player)&&(!r.target||r.target===ev.target));
  if(replacement.length>1)return {supported:false,requiresChoice:true,reason:'Più effetti di sostituzione applicabili: ordine da scegliere',options:replacement};
  if(replacement.length===1){const r=replacement[0];if(!['gainLife','loseLife','putCounters','dealDamage'].includes(ev.type))return {supported:false,reason:'Sostituzione di eventi senza quantità non supportata'};if(!Number.isSafeInteger(ev.amount)||ev.amount<0)return {supported:false,reason:'Quantità originale non valida'};if(!['prevent','multiply','add'].includes(r.operation))return {supported:false,reason:'Sostituzione non supportata'};if(r.operation==='prevent'){ev.amount=0}else if(r.operation==='multiply'){if(!Number.isSafeInteger(r.factor)||r.factor<0)return {supported:false,reason:'Fattore non valido'};ev.amount*=r.factor}else{if(!Number.isSafeInteger(r.amount))return {supported:false,reason:'Modifica non valida'};ev.amount+=r.amount}if(!Number.isSafeInteger(ev.amount)||ev.amount<0)return {supported:false,reason:'Quantità dopo sostituzione non valida'};s.history.push({kind:'replacement',id:r.id||null})}
  const before=clone(s);
  const out=root.JudgeEventPipeline.run(s,[ev]);if(!out.supported)return out;
  Object.assign(s,{players:out.state.players,objects:out.state.objects});
  if(!root.JudgeTriggerFlow)return {supported:false,reason:'Flusso trigger 4F non disponibile'};
  const integrated=root.JudgeTriggerFlow.transition(before,s,ev);
  if(!integrated.supported)return integrated;
  Object.assign(s,{pendingTriggers:integrated.state.pendingTriggers,delayedTriggers:integrated.state.delayedTriggers,firedDelayed:integrated.state.firedDelayed,nextTriggerId:integrated.state.nextTriggerId});
  s.pending=s.pendingTriggers;
  s.history.push({kind:'event',event:ev,sba:out.sba,sbaExecuted:out.sbaExecuted});
  return {supported:true,state:s,event:ev,queued:integrated.queued,sba:out.sba,sbaExecuted:out.sbaExecuted,warnings:out.warnings};
 }
 if(action.type==='putTriggersOnStack'){
  if(!root.JudgeTriggerFlow)return {supported:false,reason:'Flusso trigger 4F non disponibile'};
  const out=root.JudgeTriggerFlow.place(s,action.orders||{});
  if(!out.supported)return {...out,requiresChoice:out.reason==='Scelta ordine richiesta'};
  const updated=out.state;updated.pending=[];updated.passes=0;updated.priority=updated.turn?.activePlayer||updated.activePlayer||'A';
  return {supported:true,state:updated,stack:updated.stack,placements:out.placements};
 }
 if(action.type==='pushStack'){
  if(!validPlayer(action.controller)||!action.description)return {supported:false,reason:'Elemento della pila incompleto'};
  const instruction=action.instruction||null;if(instruction&&(!['gainLife','loseLife','putCounters','dealDamage','tap','untap'].includes(instruction.type)))return {supported:false,reason:'Istruzione di risoluzione non supportata'};s.stack.push({id:'stack-'+(s.history.length+1)+'-'+s.stack.length,controller:action.controller,description:action.description,resolution:instruction?'structured':'manual',instruction});s.passes=0;s.priority=action.controller;return {supported:true,state:s};
 }
 if(action.type==='passPriority'){
  if(!validPlayer(action.player)||s.priority!==action.player)return {supported:false,reason:'Il giocatore non ha priorità'};
  const i=players.indexOf(action.player);s.passes++;s.priority=players[(i+1)%players.length];if(s.passes<players.length)return {supported:true,state:s,step:'priorityPassed'};
  s.passes=0;s.priority=s.turn?.activePlayer||'A';if(!s.stack.length)return {supported:true,state:s,step:'advanceStepManually'};
  const top=s.stack[s.stack.length-1];if(!top.instruction){s.history.push({kind:'resolutionRequired',top});return {supported:true,state:s,step:'resolveManually',top,warning:'Elemento ancora sulla pila: serve una risoluzione strutturata o manuale'};}const resolved=apply(s,{type:'event',event:top.instruction});if(!resolved.supported)return {supported:false,reason:'Risoluzione non eseguita: '+resolved.reason,top};const finished=resolved.state;finished.stack.pop();finished.priority=finished.turn?.activePlayer||'A';finished.passes=0;finished.history.push({kind:'resolved',top});return {supported:true,state:finished,step:'resolved',top,event:resolved.event,sba:resolved.sba,sbaExecuted:resolved.sbaExecuted};
 }
 return {supported:false,reason:'Azione non supportata'};
}
root.JudgeTurnPipeline={create,apply};
})(typeof window!=='undefined'?window:globalThis);
