(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const base=()=>({players:[{id:'A',life:20}],objects:[],effects:[],stack:[{id:'s',targets:[{id:'A',kind:'player'},{id:'B',kind:'player'}],instruction:[]}]});
 const bound={type:'gainLife',player:'B',amount:2,targetId:'B'},independent={type:'gainLife',player:'A',amount:3,targetDependency:'none'};
 const plan=s=>root.JudgeResolution.plan(s,s.stack[0]);
 check('partial illegal keeps independent instruction',()=>{let s=base();s.stack[0].instruction=[bound,independent];let r=plan(s);return r.supported&&r.events.length===1&&r.events[0].targetDependency==='none'});
 check('independent before illegal target retains order',()=>{let s=base();s.stack[0].instruction=[independent,bound];let r=plan(s);return r.supported&&r.events.length===1&&r.events[0].amount===3});
 check('legal target and independent both survive',()=>{let s=base();s.stack[0].instruction=[{type:'gainLife',player:'A',amount:1,targetId:'A'},independent];let r=plan(s);return r.supported&&r.events.length===2});
 check('implicit dependency still rejected',()=>{let s=base();s.stack[0].instruction=[{type:'gainLife',player:'A',amount:3},bound];return !plan(s).supported});
 check('contradictory independent and target id rejected',()=>{let s=base();s.stack[0].instruction=[{...independent,targetId:'A'}];return !plan(s).supported});
 check('unknown dependency rejected',()=>{let s=base();s.stack[0].instruction=[{...independent,targetDependency:'magic'}];return !plan(s).supported});
 check('all illegal still cancels independent instruction',()=>{let s=base();s.players=[];s.stack[0].instruction=[independent];return plan(s).step==='allTargetsIllegal'});
 check('untargeted independent instruction remains valid',()=>{let s=base();s.stack[0].targets=[];s.stack[0].instruction=[independent];let r=plan(s);return r.supported&&r.events.length===1});
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5Y2Tests={run};})(typeof window!=='undefined'?window:globalThis);
