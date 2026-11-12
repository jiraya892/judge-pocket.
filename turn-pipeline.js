/* Explicit replacement, trigger and priority pipeline. No free-text execution. */
(function(root){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
function create(input){const state=clone(input);state.stack=state.stack||[];state.pending=state.pending||[];state.pendingTriggers=state.pendingTriggers||[];state.delayedTriggers=state.delayedTriggers||[];state.priority=state.turn?.priorityPlayer||'A';state.passes=0;state.history=[];return state}
function apply(state,action){const s=clone(state);if(!action||!action.type)return {supported:false,reason:'Azione mancante'};
 const players=(s.players||[]).map(x=>x.id),validPlayer=id=>players.includes(id);
 if(action.type==='event'){
  if(!root.JudgeEventPipeline)return {supported:false,reason:'Motore eventi assente'};
  // Replacement and prevention belong exclusively to JudgeEventPipeline.
  // Never apply them here a second time, or report the original event as modified.
  if((s.pendingTriggers||[]).length&&!action._duringResolution)return {supported:false,reason:'Inneschi in attesa: inserirli nella pila prima di altri eventi'};
  const ev=clone(action.event||{});
  const before=clone(s);
  const out=root.JudgeEventPipeline.run(s,[ev]);if(!out.supported)return out;
  Object.assign(s,{players:out.state.players,objects:out.state.objects});
  if(!root.JudgeTriggerFlow)return {supported:false,reason:'Flusso trigger 4F non disponibile'};
  const applied=out.appliedEvents;
  if(!Array.isArray(applied)||applied.length>1)return {supported:false,reason:'Eventi effettivi post-sostituzione non disponibili'};
  const integrated=root.JudgeTriggerFlow.transition(before,s,applied[0]||null);
  if(!integrated.supported)return integrated;
  Object.assign(s,{pendingTriggers:integrated.state.pendingTriggers,delayedTriggers:integrated.state.delayedTriggers,firedDelayed:integrated.state.firedDelayed,nextTriggerId:integrated.state.nextTriggerId});
  if(!root.JudgeLocalSBA)return {supported:false,reason:'Modulo SBA 4F.5 non disponibile'};
  let settled=root.JudgeLocalSBA.stabilize(s);if(!settled.supported)return settled;
  let sbaQueued=0;
  for(const change of settled.transitions){
   const snap={...clone(change.after),pendingTriggers:s.pendingTriggers,delayedTriggers:s.delayedTriggers,firedDelayed:s.firedDelayed,nextTriggerId:s.nextTriggerId};
   const tr=root.JudgeTriggerFlow.transition(change.before,snap);
   if(!tr.supported)return tr;
   Object.assign(s,{objects:tr.state.objects,pendingTriggers:tr.state.pendingTriggers,delayedTriggers:tr.state.delayedTriggers,firedDelayed:tr.state.firedDelayed,nextTriggerId:tr.state.nextTriggerId});
   sbaQueued+=tr.queued;
  }
  s.pending=s.pendingTriggers;
  s.history.push({kind:'event',event:ev,sba:out.sba,sbaExecuted:out.sbaExecuted});
  return {supported:true,state:s,event:applied[0]||null,queued:integrated.queued+sbaQueued,sba:[...out.sba,...settled.changes],sbaExecuted:settled.changes.length>0,warnings:out.warnings};
 }
 if(action.type==='putTriggersOnStack'){
  if(!root.JudgeTriggerFlow)return {supported:false,reason:'Flusso trigger 4F non disponibile'};
  const out=root.JudgeTriggerFlow.place(s,action.orders||{});
  if(!out.supported)return {...out,requiresChoice:out.reason==='Scelta ordine richiesta'};
  const updated=out.state;updated.pending=[];updated.passes=0;updated.priority=updated.turn?.activePlayer||updated.activePlayer||'A';
  return {supported:true,state:updated,stack:updated.stack,placements:out.placements};
 }
 if(action.type==='pushStack'){
  if(!validPlayer(action.controller)||!action.description)return {supported:false,reason:'Elemento della pila incompleto'};if(!root.JudgePriority)return {supported:false,reason:'Motore priorità mancante'};const allowed=root.JudgePriority.act(s,action.controller);if(!allowed.supported)return allowed;
  const instruction=action.instruction||null;if(instruction&&(![instruction].flat().every(e=>e&&['gainLife','loseLife','putCounters','dealDamage','tap','untap'].includes(e.type))))return {supported:false,reason:'Istruzione di risoluzione non supportata'};if(!root.JudgeStack)return {supported:false,reason:'Motore pila 5A mancante'};if(action.targets!==undefined){if(!root.JudgeTargets)return {supported:false,reason:'Motore bersagli 5C mancante'};const targetChoice=root.JudgeTargets.choose(s,action.targets);if(!targetChoice.supported)return targetChoice;}if(!root.JudgeChoicesCosts)return {supported:false,reason:'Motore costi e scelte 5E mancante'};const prepared=root.JudgeChoicesCosts.prepare(s,action);if(!prepared.supported)return prepared;const item={id:action.id||'stack-'+(s.history.length+1)+'-'+s.stack.length,kind:action.kind||'activatedAbility',source:action.source||'explicit:'+action.controller,controller:action.controller,description:action.description,resolution:instruction?'structured':'manual',instruction,...(action.targets!==undefined?{targets:action.targets}:{}),selectedModes:prepared.selectedModes,answers:prepared.answers,paidCosts:prepared.paidCosts,...(action.kind==='spell'?{card:action.card}:{} )};const pushed=root.JudgeStack.push(prepared.state,item);if(!pushed.supported)return pushed;Object.assign(s,{players:pushed.state.players,stack:pushed.state.stack});s.passes=0;s.priority=action.controller;return {supported:true,state:s};
 }
 if(['copyStackObject','counterStackObject','removeStackObject'].includes(action.type)){
  if(!root.JudgeStackOperations)return {supported:false,reason:'Operazioni pila 5F mancanti'};
  if(!root.JudgePriority)return {supported:false,reason:'Motore priorità mancante'};
  const allowed=root.JudgePriority.act(s,action.player);if(!allowed.supported)return allowed;
  const out=action.type==='copyStackObject'?root.JudgeStackOperations.copyObject(s,action.targetId,action.newId,action.controller||action.player,action.overrides||{}):action.type==='counterStackObject'?root.JudgeStackOperations.counter(s,action.targetId,action.options||{}):root.JudgeStackOperations.remove(s,action.targetId,action.reason);
  if(!out.supported)return out;
  if(out.zoneTransitionRequired){if(!root.JudgeStackZone)return {supported:false,reason:'Motore zone pila 5F mancante'};const moved=root.JudgeStackZone.transition(out.state,out.removed,out.destination);if(!moved.supported)return moved;out.state=moved.state;out.zoneTransition=moved.transition;if(root.JudgeTriggerFlow){const tr=root.JudgeTriggerFlow.transition(moved.before,moved.state);if(!tr.supported)return tr;out.state.pendingTriggers=tr.state.pendingTriggers;out.state.delayedTriggers=tr.state.delayedTriggers;out.state.firedDelayed=tr.state.firedDelayed;out.state.nextTriggerId=tr.state.nextTriggerId;}}
  const next=out.state;next.history.push({kind:action.type,targetId:action.targetId,result:out.countered??true});return {...out,state:next};
 }
 if(action.type==='passPriority'){
  if((s.pendingTriggers||[]).length)return {supported:false,reason:'Inneschi in attesa: inserirli nella pila prima della priorità'};
  if(!validPlayer(action.player)||s.priority!==action.player)return {supported:false,reason:'Il giocatore non ha priorità'};
  if(!root.JudgePriority)return {supported:false,reason:'Motore priorità mancante'};const passed=root.JudgePriority.pass(s,action.player);if(!passed.supported)return passed;if(passed.step==='priorityPassed'||passed.step==='advanceStepManually')return passed;Object.assign(s,{priority:passed.state.priority,passes:passed.state.passes});
  const top=s.stack[s.stack.length-1];if(top.interveningIf!=null){if(!root.JudgeTriggers)return {supported:false,reason:'Motore condizioni non disponibile'};const check=root.JudgeTriggers.recheck(top,s);if(!check.supported)return check;if(!check.resolves){s.stack.pop();s.history.push({kind:'triggerConditionFailed',top:top.id});return {supported:true,state:s,step:'triggerConditionFailed',top};}}if(!root.JudgeResolution)return {supported:false,reason:'Motore risoluzione 5D mancante'};const plan=root.JudgeResolution.plan(s,top);if(!plan.supported)return plan;if(plan.step==='allTargetsIllegal'){s.stack.pop();s.history.push({kind:'allTargetsIllegal',top:top.id});return {supported:true,state:s,step:'allTargetsIllegal',top,legality:plan.legality};}if(plan.step==='resolveManually'){s.history.push({kind:'resolutionRequired',top});return {supported:true,state:s,step:'resolveManually',top,warning:'Risoluzione Oracle non strutturata: elemento ancora sulla pila'};}let resolving=clone(s);resolving.stack.pop();let last=null;const events=[];for(const event of plan.events){const resolved=apply(resolving,{type:'event',event,_duringResolution:true});if(!resolved.supported)return {supported:false,reason:'Risoluzione non eseguita: '+resolved.reason,requiredFacts:resolved.requiredFacts,top};resolving=resolved.state;events.push(resolved.event);last=resolved;}resolving.priority=resolving.turn?.activePlayer||resolving.activePlayer;resolving.passes=0;resolving.history.push({kind:'resolved',top});return {supported:true,state:resolving,step:'resolved',top,events,event:events[0]||null,sba:last?.sba,sbaExecuted:last?.sbaExecuted};
 }
 return {supported:false,reason:'Azione non supportata'};
}
root.JudgeTurnPipeline={create,apply};
})(typeof window!=='undefined'?window:globalThis);
