/* Group 4D: explicit delayed triggers and last-known snapshots.
   Structured registrations only; never infer Oracle text. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function register(state,descriptor){
 if(!state||!Array.isArray(state.players)||!descriptor||typeof descriptor.id!=='string'||!descriptor.id||!descriptor.event||typeof descriptor.event.type!=='string'||!descriptor.event.type)return {supported:false,reason:'Registrazione non valida'};
 if(!state.players.some(p=>p.id===descriptor.controller))return {supported:false,reason:'Controllore non valido'};
 if(descriptor.interveningIf!=null&&(!root.JudgeTriggerConditions||!root.JudgeTriggerConditions.valid(descriptor.interveningIf)))return {supported:false,reason:'Condizione non valida'};
 const registrations=clone(state.delayedTriggers||[]);
 if(!Array.isArray(registrations)||registrations.some(a=>a.id===descriptor.id))return {supported:false,reason:'ID ritardato duplicato'};
 if(descriptor.once!==undefined&&typeof descriptor.once!=='boolean')return {supported:false,reason:'Flag once non valido'};
 const record={id:descriptor.id,kind:'delayed',controller:descriptor.controller,event:clone(descriptor.event),once:descriptor.once!==false,description:descriptor.description||'',source:descriptor.source??null,interveningIf:clone(descriptor.interveningIf??null)};
 registrations.push(record);return {supported:true,delayedTriggers:registrations};
}
function observe(state,records,ordinary=[]){
 if(!root.JudgeTriggers||!Array.isArray(records)||!Array.isArray(ordinary))return {supported:false,reason:'Moduli o eventi mancanti'};
 const delayed=state?.delayedTriggers||[];
 if(!Array.isArray(delayed))return {supported:false,reason:'Registrazioni ritardate non valide'};
 const abilities=[...ordinary,...delayed];
 const result=root.JudgeTriggers.observe(state,records,abilities);
 if(!result.supported)return result;
 return {...result,delayedTriggers:clone(delayed).filter(a=>a.once===false||!result.firedDelayed.includes(a.id))};
}
function lastKnown(record,id,side='before'){
 if(!record||!['before','after'].includes(side)||!Array.isArray(record[side]?.objects))return {supported:false,reason:'Snapshot mancante'};
 const object=record[side].objects.find(o=>o.id===id);
 if(!object)return {supported:false,reason:'Oggetto assente nello snapshot'};
 return {supported:true,object:clone(object)};
}
root.JudgeDelayedTriggers={register,observe,lastKnown};
})(typeof window!=='undefined'?window:globalThis);