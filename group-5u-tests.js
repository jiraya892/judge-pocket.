(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const state={players:[{id:'A',life:20}],objects:[{id:'X',zone:'battlefield',types:['creature']}],effects:[],stack:[]};
 check('typed player assessment accepted',()=>root.JudgeTargets.check(state,{id:'A',kind:'player'}).legal);
 check('typed object assessment accepted',()=>root.JudgeTargets.check(state,{id:'X',kind:'object'}).legal);
 check('unknown kind rejected by check',()=>!root.JudgeTargets.check(state,{id:'A',kind:'spell'}).supported);
 check('missing kind rejected by check',()=>!root.JudgeTargets.check(state,{id:'A'}).supported);
 check('unknown kind rejected by assess',()=>!root.JudgeTargets.assess(state,[{id:'A',kind:'creature'}]).supported);
 check('unknown kind rejected by choose',()=>!root.JudgeTargets.choose(state,[{id:'A',kind:'artifact'}]).supported);
 check('mixed valid and unknown kind rejected',()=>!root.JudgeTargets.assess(state,[{id:'A',kind:'player'},{id:'X',kind:'creature'}]).supported);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5UTests={run};})(typeof window!=='undefined'?window:globalThis);
