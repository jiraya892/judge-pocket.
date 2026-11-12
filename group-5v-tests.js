(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const state={players:[{id:'A',life:20}],objects:[{id:'A',zone:'battlefield',types:['creature']},{id:'X',zone:'battlefield',types:['creature']}],effects:[],stack:[]};
 check('ambiguous player target rejected',()=>!root.JudgeTargets.check(state,{id:'A',kind:'player'}).supported);
 check('ambiguous object target rejected',()=>!root.JudgeTargets.check(state,{id:'A',kind:'object'}).supported);
 check('ambiguous player selection rejected',()=>!root.JudgeTargets.choose(state,[{id:'A',kind:'player'}]).supported);
 check('ambiguous object assessment rejected',()=>!root.JudgeTargets.assess(state,[{id:'A',kind:'object'}]).supported);
 check('unambiguous object accepted',()=>root.JudgeTargets.check(state,{id:'X',kind:'object'}).legal);
 check('unambiguous player accepted without collision',()=>root.JudgeTargets.check({...state,objects:state.objects.slice(1)},{id:'A',kind:'player'}).legal);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5VTests={run};})(typeof window!=='undefined'?window:globalThis);
