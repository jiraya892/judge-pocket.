(function(root){'use strict';function run(){const t=[],check=(n,v)=>t.push({name:n,pass:!!v}),f=root.JudgeTriggerFlow;
const obj=(id,zone,controller='A',abilities=[])=>({id,zone,controller,types:['creature'],abilities});
const state=(objects,extras={})=>({players:[{id:'A'},{id:'B'}],activePlayer:'A',turn:{activePlayer:'A'},objects,stack:[{id:'spell'}],pendingTriggers:[],...extras});
const a=[{id:'etb',kind:'triggered',event:{type:'enterBattlefield'}}];
let before=state([obj('watch','battlefield','A',a),obj('new','hand','B')]),after=state([obj('watch','battlefield','A',a),obj('new','battlefield','B')]);
let r=f.transition(before,after);check('ETB through 4A-4B',r.supported&&r.queued===1);
let placed=f.place(r.state);check('APNAP places trigger',placed.supported&&placed.top.abilityId==='etb');
check('spell stays below',placed.state.stack[0].id==='spell');
check('pending drained',placed.state.pendingTriggers.length===0);
check('transition immutable',before.objects[1].zone==='hand'&&after.pendingTriggers.length===0);
r=f.transition(before,after,{type:'gainLife',player:'A',amount:2});check('event plus zone change',r.supported&&r.queued===1);
const multi=state([], {pendingTriggers:[{id:'a1',controller:'A'},{id:'a2',controller:'A'},{id:'b1',controller:'B'}]});
r=f.place(multi);check('multiple same controller asks order',!r.supported&&r.player==='A');
r=f.place(multi,{A:['a2','a1']});check('explicit order and APNAP',r.supported&&r.placements.join(',')==='a2,a1,b1');
check('nonactive resolves first',r.top.id==='b1');
const delayed=state([], {delayedTriggers:[{id:'later',kind:'delayed',controller:'B',event:{type:'gainLife'},once:true}]});
r=f.transition(delayed,delayed,{type:'gainLife',player:'A',amount:2});check('delayed event triggers',r.supported&&r.queued===1);
check('delayed registration consumed',r.state.delayedTriggers.length===0);
const again=f.transition(r.state,r.state,{type:'gainLife',player:'A',amount:2});check('delayed does not retrigger',again.supported&&again.queued===0&&again.state.pendingTriggers.length===1);
const died=state([obj('victim','battlefield','A',[{id:'dies',kind:'triggered',event:{type:'dies'}}])]);
const grave=state([obj('victim','graveyard','A',[{id:'dies',kind:'triggered',event:{type:'dies'}}])]);
r=f.transition(died,grave);check('LKI death trigger',r.supported&&r.queued===1&&r.state.pendingTriggers[0].context.source.zone==='battlefield');
r=f.transition(state([obj('x','battlefield','A',[{kind:'triggered',text:'Whenever...'}])]),state([obj('x','battlefield','A',[{kind:'triggered',text:'Whenever...'}])]));check('unparsed Oracle fails closed',!r.supported);
const pipeline=root.JudgeTurnPipeline,original=root.JudgeEventPipeline;
root.JudgeEventPipeline={run:(s,events)=>{const x=JSON.parse(JSON.stringify(s));x.players[0].life+=events[0].amount;return {supported:true,state:x,appliedEvents:events,sba:[],sbaExecuted:false,warnings:[]};}};
try{
 const start=pipeline.create({...state([obj('watch','battlefield','A',[{id:'gain',kind:'triggered',event:{type:'gainLife'}}])]),players:[{id:'A',life:20},{id:'B',life:20}]});
 let out=pipeline.apply(start,{type:'event',event:{type:'gainLife',player:'A',amount:3}});
 check('turn pipeline queues actual event',out.supported&&out.queued===1&&out.state.players[0].life===23);
 if(out.supported){const next=pipeline.apply(out.state,{type:'putTriggersOnStack',orders:{}});check('turn pipeline APNAP places queued',next.supported&&next.state.pendingTriggers.length===0&&next.state.stack.at(-1).abilityId==='gain');}
 else check('turn pipeline APNAP places queued',false);
}finally{root.JudgeEventPipeline=original;}

// Real event pipeline path, with coordinator stub only (not a fabricated event executor).
const savedPipeline=root.JudgeEventPipeline,savedCoordinator=root.JudgeCoordinator,savedRules=root.JudgeRulesCore;
root.JudgeCoordinator={evaluate:s=>({supported:true,game:{},results:[],warnings:[]})};
root.JudgeRulesCore={stateBasedActions:()=>[]};
try{
 const start=root.JudgeTurnPipeline.create({...state([obj('watch','battlefield','A',[{id:'gain2',kind:'triggered',event:{type:'gainLife'}}])]),players:[{id:'A',life:20},{id:'B',life:20}],effects:[]});
 const eventResult=root.JudgeTurnPipeline.apply(start,{type:'event',event:{type:'gainLife',player:'A',amount:2}});
 check('real event pipeline queues trigger',eventResult.supported&&eventResult.queued===1&&eventResult.state.players[0].life===22);
 if(eventResult.supported){
  check('priority blocked with pending',!root.JudgeTurnPipeline.apply(eventResult.state,{type:'passPriority',player:'A'}).supported);
  const stackResult=root.JudgeTurnPipeline.apply(eventResult.state,{type:'putTriggersOnStack',orders:{}});
  check('real event pipeline stack placement',stackResult.supported&&stackResult.state.stack.at(-1).abilityId==='gain2');
 }else{check('priority blocked with pending',false);check('real event pipeline stack placement',false);}
}finally{root.JudgeCoordinator=savedCoordinator;root.JudgeRulesCore=savedRules;root.JudgeEventPipeline=savedPipeline;}
return {passed:t.filter(x=>x.pass).length,total:t.length,tests:t};}root.JudgeGroup4FTests={run};})(typeof window!=='undefined'?window:globalThis);