(function(root){'use strict';function run(){
const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
const C=root.JudgeCoordinator,R=root.JudgeRulesCore,T=root.JudgeTriggerFlow;
root.JudgeCoordinator={evaluate:()=>({supported:true,game:{},results:[],warnings:[]})};
root.JudgeRulesCore={stateBasedActions:()=>[]};
root.JudgeTriggerFlow={...T,transition:(before,after)=>({supported:true,state:{...after,pendingTriggers:after.pendingTriggers||[],delayedTriggers:after.delayedTriggers||[]},queued:0})};
const base=()=>root.JudgeTurnPipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects:[{id:'card',zone:'stack',objectIdentity:'original'}],effects:[],replacements:[],stack:[],pendingTriggers:[],activePlayer:'A',turn:{activePlayer:'A',priorityPlayer:'A'}});
const play=(extra={})=>{let s=base();const a=root.JudgeTurnPipeline.apply(s,{type:'pushStack',controller:'A',kind:'spell',card:'Test',description:'Test spell',instruction:{type:'gainLife',player:'A',amount:2},...extra});if(!a.supported)return a;let p=root.JudgeTurnPipeline.apply(a.state,{type:'passPriority',player:'A'});return p.supported?root.JudgeTurnPipeline.apply(p.state,{type:'passPriority',player:'B'}):p};
try{
check('resolved instant to graveyard',()=>{const r=play({cardObjectId:'card',resolvesTo:'graveyard'});return r.supported&&r.state.objects[0].zone==='graveyard'&&r.state.players[0].life===22&&r.state.stack.length===0});
check('resolved permanent to battlefield',()=>{const r=play({cardObjectId:'card',resolvesTo:'battlefield'});return r.supported&&r.state.objects[0].zone==='battlefield'&&r.zoneTransition?.to==='battlefield'});
check('resolved card identity changes',()=>{const r=play({cardObjectId:'card',resolvesTo:'graveyard'});return r.supported&&r.state.objects[0].objectIdentity!=='original'});
check('missing destination fails closed',()=>{const r=play({cardObjectId:'card'});return !r.supported&&!!r.requiredFacts});
check('missing card identity fails closed',()=>{const r=play({resolvesTo:'graveyard'});return !r.supported&&!!r.requiredFacts});
check('wrong card identity fails closed',()=>!play({cardObjectId:'other',resolvesTo:'graveyard'}).supported);
check('ability still resolves without zone transition',()=>{let s=base();s.objects=[];let a=root.JudgeTurnPipeline.apply(s,{type:'pushStack',controller:'A',description:'Ability',instruction:{type:'gainLife',player:'A',amount:2}});let p=root.JudgeTurnPipeline.apply(a.state,{type:'passPriority',player:'A'});let r=root.JudgeTurnPipeline.apply(p.state,{type:'passPriority',player:'B'});return r.supported&&r.state.players[0].life===22&&!r.zoneTransition});
}finally{root.JudgeCoordinator=C;root.JudgeRulesCore=R;root.JudgeTriggerFlow=T}
return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5Y1Tests={run};})(typeof window!=='undefined'?window:globalThis);
