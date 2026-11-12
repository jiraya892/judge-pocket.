(function(root){'use strict';function run(){const t=[],ok=(n,v)=>t.push({name:n,pass:!!v}),copy=x=>JSON.parse(JSON.stringify(x));
const base={players:[{id:'A',life:20},{id:'B',life:20}],objects:[],effects:[],stack:[],activePlayer:'A',turn:{activePlayer:'A'},pendingTriggers:[],nextTriggerId:7};
const s={...copy(base),triggerDefinitions:[{id:'life',controller:'A',eventType:'gainLife'}],pendingTriggers:[{id:'saved',controller:'B',abilityId:'saved',event:{type:'old'}}]};
let r=root.JudgeTriggerFlow.transition(s,s,{type:'gainLife',player:'A',amount:2});
ok('preserves existing ID',r.supported&&r.state.pendingTriggers[0].id==='saved');
ok('new ID unique',r.supported&&r.state.pendingTriggers[1].id!=='saved');
ok('queued excludes previous',r.supported&&r.queued===1);
ok('input unchanged',s.pendingTriggers.length===1);
const next=root.JudgeTriggerFlow.transition(r.state,r.state,{type:'gainLife',player:'A',amount:2});
ok('second transition preserves prior IDs',next.supported&&next.state.pendingTriggers[1].id===r.state.pendingTriggers[1].id);
ok('second transition unique IDs',next.supported&&new Set(next.state.pendingTriggers.map(x=>x.id)).size===3);
const duplicate={...s,pendingTriggers:[{id:'same'},{id:'same'}]};ok('duplicate IDs rejected',!root.JudgeTriggerFlow.transition(duplicate,duplicate,{type:'gainLife'}).supported);
const conditions=root.JudgeTriggerConditions;root.JudgeTriggerConditions=null;
try{ok('missing conditions fail closed',!root.JudgeTriggers.observe(base,[{type:'gainLife'}],[{id:'x',controller:'A',event:{type:'gainLife'}}]).supported);}finally{root.JudgeTriggerConditions=conditions;}
const delayed=root.JudgeDelayedTriggers;root.JudgeDelayedTriggers=null;
try{ok('missing delayed engine fails closed',!root.JudgeTriggerFlow.transition(base,base,{type:'gainLife'}).supported);}finally{root.JudgeDelayedTriggers=delayed;}
const repl=root.JudgeReplacements;root.JudgeReplacements=null;const coord=root.JudgeCoordinator,rules=root.JudgeRulesCore;
try{root.JudgeCoordinator={evaluate:()=>({supported:true,game:{},results:[],warnings:[]})};root.JudgeRulesCore={stateBasedActions:()=>[]};ok('missing replacement engine fails closed',!root.JudgeEventPipeline.run(base,[{type:'gainLife',player:'A',amount:2}]).supported);}finally{root.JudgeReplacements=repl;root.JudgeCoordinator=coord;root.JudgeRulesCore=rules;}
const start=root.JudgeTurnPipeline.create({...copy(base),pendingTriggers:[{id:'waiting',controller:'A'}]});
ok('pending blocks new event',!root.JudgeTurnPipeline.apply(start,{type:'event',event:{type:'gainLife',player:'A',amount:2}}).supported);
ok('pending blocks priority',!root.JudgeTurnPipeline.apply(start,{type:'passPriority',player:'A'}).supported);
return {passed:t.filter(x=>x.pass).length,total:t.length,tests:t};}root.JudgeGroup4F1Tests={run};})(typeof window!=='undefined'?window:globalThis);