(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const state={players:[{id:'A',life:20},{id:'A',life:15}],objects:[{id:'X',zone:'battlefield',types:['creature']},{id:'X',zone:'battlefield',types:['artifact']}],effects:[],stack:[]};
 check('duplicate player ids rejected',()=>!root.JudgeTargets.check(state,{id:'A',kind:'player'}).supported);
 check('duplicate object ids rejected',()=>!root.JudgeTargets.check(state,{id:'X',kind:'object'}).supported);
 check('duplicate player selection rejected',()=>!root.JudgeTargets.choose(state,[{id:'A',kind:'player'}]).supported);
 check('duplicate object assessment rejected',()=>!root.JudgeTargets.assess(state,[{id:'X',kind:'object'}]).supported);
 check('unique player accepted',()=>root.JudgeTargets.check({...state,players:state.players.slice(0,1)},{id:'A',kind:'player'}).legal);
 check('unique object accepted',()=>root.JudgeTargets.check({...state,objects:state.objects.slice(0,1)},{id:'X',kind:'object'}).legal);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5WTests={run};})(typeof window!=='undefined'?window:globalThis);
