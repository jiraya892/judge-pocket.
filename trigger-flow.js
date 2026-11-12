/* Group 4F: integrate 4A-4E into explicit turn event flow.
   Conservative: only structured descriptors; no Oracle-text guessing. */
(function(root){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
function transition(before,after,event){
 if(!root.JudgeEventDetector||!root.JudgeTriggerRecognition||!root.JudgeTriggers)return {supported:false,reason:'Moduli trigger mancanti'};
 const detected=root.JudgeEventDetector.detect(before,after);if(!detected.supported)return detected;
 const records=[...detected.records];
 if(event){if(!event.type||typeof event.type!=='string')return {supported:false,reason:'Evento non valido'};records.push({event:clone(event),before:clone(before),after:clone(after)});}
 const collected=root.JudgeTriggerRecognition.collect({...after,objects:[...after.objects,...before.objects.filter(o=>!after.objects.some(n=>n.id===o.id))]});
 if(!collected.supported)return collected;
 if(collected.unsupported.length)return {supported:false,reason:'Abilità innescate Oracle non strutturate',unsupported:collected.unsupported};
 const definitions=after.triggerDefinitions||[];
 if(!Array.isArray(definitions))return {supported:false,reason:'Definizioni inneschi non valide'};
 const players=new Set(after.players.map(p=>p.id));
 const converted=[];
 for(let i=0;i<definitions.length;i++){const d=definitions[i];if(!d||typeof d.eventType!=='string'||!players.has(d.controller))return {supported:false,reason:'Definizione innesco non valida'};converted.push({id:d.id||'legacy:'+i,controller:d.controller,event:{type:d.eventType,...(d.player?{player:d.player}:{}),...(d.target?{target:d.target}:{})},description:d.description||'',kind:'normal'});}
 const observed=root.JudgeDelayedTriggers?root.JudgeDelayedTriggers.observe(after,records,[...collected.abilities,...converted]):root.JudgeTriggers.observe(after,records,[...collected.abilities,...converted]);
 if(!observed.supported)return observed;
 const used=new Set((after.pendingTriggers||[]).map(t=>t.id));
 const pending=observed.pending.map((t,i)=>({...t,id:'trigger:'+String(after.nextTriggerId||0)+':'+i+':'+t.abilityId}));
 if(pending.some(t=>used.has(t.id)))return {supported:false,reason:'ID innesco duplicato'};
 const state={...clone(after),pendingTriggers:pending,delayedTriggers:observed.delayedTriggers||[],firedDelayed:observed.firedDelayed,nextTriggerId:(after.nextTriggerId||0)+1};
 return {supported:true,state,records,queued:pending.length-(after.pendingTriggers||[]).length};
}
function place(state,orders){if(!root.JudgeAPNAP)return {supported:false,reason:'APNAP mancante'};return root.JudgeAPNAP.place({...state,activePlayer:state.turn?.activePlayer||state.activePlayer},orders);}
root.JudgeTriggerFlow={transition,place};
})(typeof window!=='undefined'?window:globalThis);