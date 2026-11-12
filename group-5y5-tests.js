(function(root){'use strict';function run(){
const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
const base=()=>({cards:['Card One','Card Two'],event:'cast',casting:'0'});
check('two cards and event suffice without global board',()=>root.JudgeContextInterview.next(base()).status==='ready');
check('unrelated card does not force question',()=>root.JudgeContextInterview.next({...base(),cards:['Card One','Card Two','Unrelated']}).status==='ready');
check('missing event asks only event',()=>{let r=root.JudgeContextInterview.next({cards:['Card One','Card Two']});return r.status==='question'&&r.key==='event'});
check('explicit missing fact asks targeted question',()=>{let r=root.JudgeContextInterview.next({...base(),requiredFacts:[{key:'controller',question:'Who controls source?'}]});return r.status==='question'&&r.key==='answers.controller'});
check('answer preserves prior answers and reaches ready',()=>{let r=root.JudgeContextInterview.next({...base(),requiredFacts:[{key:'controller',question:'Who controls source?'}],answers:{controller:'A',other:'kept'}});return r.status==='ready'&&r.context.answers.other==='kept'});
check('irrelevant answered fact does not change verdict readiness',()=>root.JudgeContextInterview.next({...base(),answers:{irrelevant:123}}).status==='ready');
check('unknown spell target legality requests fact',()=>{let s={players:[{id:'A'}],objects:[{id:'x',zone:'battlefield',targetingUnknown:true}],effects:[],stack:[]};let r=root.JudgeTargets.check(s,{id:'x',kind:'object'});return !r.supported&&r.requiredFacts?.length>0});
check('unknown protection requests fact',()=>{let s={players:[{id:'A'}],objects:[{id:'x',zone:'battlefield',protectionUnknown:true}],effects:[],stack:[]};let r=root.JudgeTargets.check(s,{id:'x',kind:'object'});return !r.supported&&r.requiredFacts?.length>0});
return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5Y5Tests={run};})(typeof window!=='undefined'?window:globalThis);
