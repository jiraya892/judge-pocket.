(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const target=id=>({id,kind:'player'}),base=()=>({players:[{id:'A',life:20},{id:'B',life:20}],objects:[],stack:[],effects:[]});
 const setup=(instructions)=>{const s=base();s.stack=[{id:'spell',targets:[target('A'),target('B')],instruction:instructions}];return s};
 const both=[{type:'gainLife',player:'A',amount:2,targetId:'A'},{type:'gainLife',player:'B',amount:3,targetId:'B'}];
 check('both targets legal retain both instructions',()=>root.JudgeResolution.plan(setup(both),setup(both).stack[0]).events.length===2);
 check('one illegal target filters only its instruction',()=>{const s=setup(both);s.players.splice(1,1);const r=root.JudgeResolution.plan(s,s.stack[0]);return r.supported&&r.step==='resolveStructured'&&r.events.length===1&&r.events[0].targetId==='A'});
 check('all targets illegal does not resolve',()=>{const s=setup(both);s.players=[];return root.JudgeResolution.plan(s,s.stack[0]).step==='allTargetsIllegal'});
 check('ambiguous instruction fails closed',()=>{const s=setup([{type:'gainLife',player:'A',amount:2}]);s.players.splice(1,1);return !root.JudgeResolution.plan(s,s.stack[0]).supported});
 check('unrelated target reference fails closed',()=>{const s=setup([{type:'gainLife',player:'A',amount:2,targetId:'C'}]);s.players.splice(1,1);return !root.JudgeResolution.plan(s,s.stack[0]).supported});
 check('no matching events after filtering can settle',()=>{const s=setup([{type:'gainLife',player:'B',amount:2,targetId:'B'}]);s.players.splice(1,1);const p=root.JudgeResolution.plan(s,s.stack[0]);const r=root.JudgeAtomicResolution.resolve(s,p.events,()=>{throw Error('no events')},x=>({supported:true,state:x,changes:[],transitions:[]}));return p.supported&&p.events.length===0&&r.supported});
 check('repeated target ids fail closed under partial illegality',()=>{const s=setup(both);s.stack[0].targets=[target('A'),target('A'),target('B')];s.players.splice(1,1);return !root.JudgeResolution.plan(s,s.stack[0]).supported});
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5NTests={run};})(typeof window!=='undefined'?window:globalThis);
