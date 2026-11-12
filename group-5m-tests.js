/* 5M: ordered structured instruction validation and atomic rollback. */
(function(root){'use strict';
function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const pipeline=root.JudgeTurnPipeline;
 const base=()=>pipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects:[],effects:[],stack:[],pendingTriggers:[],triggerDefinitions:[],activePlayer:'A',turn:{activePlayer:'A',priorityPlayer:'A'}});
 const original=root.JudgeEventPipeline;
 root.JudgeEventPipeline={run:(state,events)=>{const s=JSON.parse(JSON.stringify(state)),e=events[0];if(e.type==='gainLife')s.players.find(p=>p.id===e.player).life+=e.amount;else if(e.type==='loseLife')s.players.find(p=>p.id===e.player).life-=e.amount;else return {supported:false,reason:'Unsupported simulated event'};return {supported:true,state:s,appliedEvents:[e],sba:[],sbaExecuted:false,warnings:[]}}};
 try{
 const push=(instructions)=>pipeline.apply(base(),{type:'pushStack',controller:'A',description:'ordered effects',instruction:instructions});
 check('empty sequence rejected',()=>!push([]).supported);
 check('unknown instruction in sequence rejected',()=>!push([{type:'gainLife',player:'A',amount:2},{type:'notImplemented'}]).supported);
 check('ordered two-step sequence accepted',()=>push([{type:'gainLife',player:'A',amount:4},{type:'loseLife',player:'A',amount:1}]).supported);
 check('ordered sequence resolves in one priority cycle',()=>{const p=push([{type:'gainLife',player:'A',amount:4},{type:'loseLife',player:'A',amount:1}]);if(!p.supported)return false;const a=pipeline.apply(p.state,{type:'passPriority',player:'A'});if(!a.supported)return false;const b=pipeline.apply(a.state,{type:'passPriority',player:'B'});return b.supported&&b.step==='resolved'&&b.state.players[0].life===23&&b.events.length===2});
 check('single instruction remains compatible',()=>{const p=push({type:'gainLife',player:'A',amount:2});return p.supported&&p.state.stack[0].instruction.type==='gainLife'});
 check('failed instruction does not commit partial effects',()=>{const s=base(),p=push([{type:'gainLife',player:'A',amount:2},{type:'tap',object:'missing'}]);if(!p.supported)return false;const a=pipeline.apply(p.state,{type:'passPriority',player:'A'});const b=pipeline.apply(a.state,{type:'passPriority',player:'B'});return !b.supported&&p.state.players[0].life===20&&p.state.stack.length===1&&s.players[0].life===20});
 }finally{root.JudgeEventPipeline=original}
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}
root.JudgeGroup5MTests={run};
})(typeof window!=='undefined'?window:globalThis);
