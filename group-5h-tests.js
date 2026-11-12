/* Group 5H — regression checks for priority and multi-instruction resolution.
   Run after loading the same dependencies as Group 5G. */
(function(root){'use strict';
function run(){
 const tests=[],check=(name,pass)=>tests.push({name,pass:!!pass});
 const pipeline=root.JudgeTurnPipeline;
 if(!pipeline)return {passed:0,total:1,tests:[{name:'Turn pipeline loaded',pass:false}]};
 const base=()=>pipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects:[],effects:[],stack:[],pendingTriggers:[],triggerDefinitions:[],activePlayer:'A',turn:{activePlayer:'A',priorityPlayer:'A'}});
 const original=root.JudgeEventPipeline;
 root.JudgeEventPipeline={run:(state,events)=>{
  const s=JSON.parse(JSON.stringify(state)),e=events[0];
  if(e.type==='gainLife')s.players.find(p=>p.id===e.player).life+=e.amount;
  return {supported:true,state:s,appliedEvents:[e],sba:[],sbaExecuted:false,warnings:[]};
 }};
 try{
  const initial=base();
  const pushed=pipeline.apply(initial,{type:'pushStack',controller:'A',description:'two life gains',instruction:[{type:'gainLife',player:'A',amount:2},{type:'gainLife',player:'A',amount:3}]});
  check('structured stack object accepted',pushed.supported);
  if(pushed.supported){
   const first=pipeline.apply(pushed.state,{type:'passPriority',player:'A'});
   check('first priority pass does not resolve',first.supported&&first.step==='priorityPassed');
   if(first.supported){
    const second=pipeline.apply(first.state,{type:'passPriority',player:'B'});
    check('both instructions resolve atomically with respect to priority',second.supported&&second.step==='resolved'&&second.state.players[0].life===25);
    check('resolved stack item removed',second.supported&&second.state.stack.length===0);
    check('original input remains immutable',initial.players[0].life===20&&initial.stack.length===0);
   }
  }
  const unsupported=pipeline.apply(base(),{type:'pushStack',controller:'A',description:'unknown instruction',instruction:{type:'unknown'}});
  check('unknown instruction fails closed',!unsupported.supported);
  const wrong=pipeline.apply(base(),{type:'passPriority',player:'B'});
  check('wrong priority holder cannot pass',!wrong.supported);
 }finally{root.JudgeEventPipeline=original;}
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}
root.JudgeGroup5HTests={run};
})(typeof window!=='undefined'?window:globalThis);
