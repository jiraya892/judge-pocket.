(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const make=targets=>{const s={players:[{id:'A',life:20}],objects:[{id:'X',zone:'battlefield',types:['creature']}],effects:[],stack:[]};s.stack=[{id:'spell',targets,instruction:{type:'gainLife',player:'A',amount:1}}];return s};
 const plan=s=>root.JudgeResolution.plan(s,s.stack[0]);
 check('player target kind supported',()=>plan(make([{id:'A',kind:'player'}])).supported);
 check('object target kind supported',()=>plan(make([{id:'X',kind:'object',zone:'battlefield'}])).supported);
 check('unknown target kind rejected',()=>!plan(make([{id:'A',kind:'planeswalker'}])).supported);
 check('mixed valid and unknown target kinds rejected',()=>!plan(make([{id:'A',kind:'player'},{id:'X',kind:'creature'}])).supported);
 check('uppercase target kind rejected',()=>!plan(make([{id:'A',kind:'PLAYER'}])).supported);
 check('whitespace target kind rejected',()=>!plan(make([{id:'A',kind:' player '}])).supported);
 check('numeric target kind rejected',()=>!plan(make([{id:'A',kind:1}])).supported);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5TTests={run};})(typeof window!=='undefined'?window:globalThis);
