/* Group 4B: register explicit triggered ability descriptors and observe 4A transitions.
   No free-text Oracle inference. Unsupported descriptors fail closed. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function collect(state){
 if(!state||!Array.isArray(state.objects)||!Array.isArray(state.players))return {supported:false,reason:'Stato non valido'};
 const players=new Set(state.players.map(p=>p.id)),abilities=[],ids=new Set(),unsupported=[];
 for(const obj of state.objects){
  if(!obj||typeof obj.id!=='string'||!obj.id)return {supported:false,reason:'Oggetto non valido'};
  if(obj.abilities!==undefined&&!Array.isArray(obj.abilities))return {supported:false,reason:'Lista abilità non valida'};
  for(const ability of obj.abilities||[]){
   if(!ability||typeof ability!=='object')return {supported:false,reason:'Abilità non valida'};
   if(ability.kind!=='triggered')continue;
   if(!ability.event||typeof ability.event.type!=='string'||!ability.event.type){
    unsupported.push({source:obj.id,ability:ability.id??null,reason:'Evento di innesco non strutturato'});continue;
   }
   const id=ability.id??obj.id+':'+abilities.length;
   if(typeof id!=='string'||!id||ids.has(id))return {supported:false,reason:'ID abilità duplicato o non valido'};
   const controller=ability.controller??obj.controller;
   if(!players.has(controller))return {supported:false,reason:'Controllore non valido'};
   ids.add(id);
   abilities.push({id,source:obj.id,controller,event:clone(ability.event),kind:'normal',description:ability.text||ability.description||'',...(ability.interveningIf!==undefined?{interveningIf:clone(ability.interveningIf)}:{})});
  }
 }
 return {supported:true,abilities,unsupported};
}
function run(before,after,options={}){
 if(!root.JudgeEventDetector||!root.JudgeTriggers||!root.JudgeDelayedTriggers)return {supported:false,reason:'Moduli 4A o inneschi mancanti'};
 const detected=root.JudgeEventDetector.detect(before,after);if(!detected.supported)return detected;
 // Use both snapshots: sources of LTB triggers can disappear from the after-state.
 const collected=collect({...after,objects:[...after.objects,...before.objects.filter(o=>!after.objects.some(n=>n.id===o.id))]});
 if(!collected.supported)return collected;
 // A source that entered must not be used to trigger an event before its entry.
 const observed=root.JudgeDelayedTriggers?root.JudgeDelayedTriggers.observe(after,detected.records,collected.abilities):root.JudgeTriggers.observe(after,detected.records,collected.abilities);
 if(!observed.supported)return observed;
 return {supported:true,events:detected.records,abilities:collected.abilities,pending:observed.pending,firedDelayed:observed.firedDelayed,delayedTriggers:observed.delayedTriggers||[],unsupported:collected.unsupported,trace:observed.trace};
}
root.JudgeTriggerRecognition={collect,run};
})(typeof window!=='undefined'?window:globalThis);