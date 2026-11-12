/* Explicit replacement, trigger and priority pipeline. No free-text execution. */
(function(root){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
function create(input){const state=clone(input);state.stack=state.stack||[];state.pending=state.pending||[];state.priority=state.turn?.priorityPlayer||'A';state.passes=0;state.history=[];return state}
function apply(state,action){const s=clone(state);if(!action||!action.type)return {supported:false,reason:'Azione mancante'};
 const players=(s.players||[]).map(x=>x.id),validPlayer=id=>players.includes(id);
 if(action.type==='event'){
  if(!root.JudgeEventPipeline)return {supported:false,reason:'Motore eventi assente'};
  const ev=clone(action.event||{});const replacement=(s.replacements||[]).filter(r=>r.eventType===ev.type&&(!r.player||r.player===ev.player)&&(!r.target||r.target===ev.target));
  if(replacement.length>1)return {supported:false,requiresChoice:true,reason:'Più effetti di sostituzione applicabili: ordine da scegliere',options:replacement};
  if(replacement.length===1){const r=replacement[0];if(!['prevent','multiply','add'].includes(r.operation))return {supported:false,reason:'Sostituzione non supportata'};if(r.operation==='prevent'){ev.amount=0}else if(r.operation==='multiply'){if(!Number.isSafeInteger(r.factor)||r.factor<0)return {supported:false,reason:'Fattore non valido'};ev.amount*=r.factor}else{if(!Number.isSafeInteger(r.amount))return {supported:false,reason:'Modifica non valida'};ev.amount+=r.amount}if(!Number.isSafeInteger(ev.amount)||ev.amount<0)return {supported:false,reason:'Quantità dopo sostituzione non valida'};s.history.push({kind:'replacement',id:r.id||null})}
  const out=root.JudgeEventPipeline.run(s,[ev]);if(!out.supported)return out;
  Object.assign(s,{players:out.state.players,objects:out.state.objects});
  const matches=(s.triggerDefinitions||[]).filter(t=>t.eventType===ev.type&&(!t.player||t.player===ev.player)&&(!t.target||t.target===ev.target));
  for(const t of matches){if(!validPlayer(t.controller))return {supported:false,reason:'Controllore innesco non valido'};s.pending.push({id:'trigger-'+(s.history.length+1)+'-'+s.pending.length,controller:t.controller,description:t.description||'Abilità innescata',resolution:'manual'})}
  s.history.push({kind:'event',event:ev,sba:out.sba,sbaExecuted:out.sbaExecuted});return {supported:true,state:s,event:ev,queued:matches.length,sba:out.sba,sbaExecuted:out.sbaExecuted,warnings:out.warnings};
 }
 if(action.type==='putTriggersOnStack'){
  const order=action.order||[];if(order.length!==s.pending.length||new Set(order).size!==order.length||s.pending.some(t=>!order.includes(t.id)))return {supported:false,requiresChoice:true,reason:'Specifica ordine di tutti gli inneschi',options:s.pending};
  const ordered=order.map(id=>s.pending.find(t=>t.id===id));const apnap=[s.turn?.activePlayer||'A',...players.filter(x=>x!==(s.turn?.activePlayer||'A'))];
  if(ordered.some((t,i)=>i>0&&apnap.indexOf(ordered[i-1].controller)>apnap.indexOf(t.controller)))return {supported:false,reason:'Ordine APNAP non valido'};
  s.stack.push(...ordered);s.pending=[];s.passes=0;s.priority=s.turn?.activePlayer||'A';return {supported:true,state:s,stack:s.stack};
 }
 if(action.type==='pushStack'){
  if(!validPlayer(action.controller)||!action.description)return {supported:false,reason:'Elemento della pila incompleto'};
  s.stack.push({id:'stack-'+(s.history.length+1)+'-'+s.stack.length,controller:action.controller,description:action.description,resolution:'manual'});s.passes=0;s.priority=action.controller;return {supported:true,state:s};
 }
 if(action.type==='passPriority'){
  if(!validPlayer(action.player)||s.priority!==action.player)return {supported:false,reason:'Il giocatore non ha priorità'};
  const i=players.indexOf(action.player);s.passes++;s.priority=players[(i+1)%players.length];if(s.passes<players.length)return {supported:true,state:s,step:'priorityPassed'};
  s.passes=0;s.priority=s.turn?.activePlayer||'A';if(!s.stack.length)return {supported:true,state:s,step:'advanceStepManually'};
  const top=s.stack.pop();s.history.push({kind:'resolutionRequired',top});return {supported:true,state:s,step:'resolveManually',top,warning:'La risoluzione non è automatica: servono istruzioni strutturate'};
 }
 return {supported:false,reason:'Azione non supportata'};
}
root.JudgeTurnPipeline={create,apply};
})(typeof window!=='undefined'?window:globalThis);
