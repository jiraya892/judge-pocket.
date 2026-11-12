(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const make=targets=>{const s={players:[{id:'A',life:20}],objects:[],effects:[],stack:[]};s.stack=[{id:'spell',targets,instruction:{type:'gainLife',player:'A',amount:1}}];return s};
 const plan=s=>root.JudgeResolution.plan(s,s.stack[0]);
 check('valid empty target collection accepted',()=>plan(make([])).supported);
 check('valid declared target accepted',()=>plan(make([{id:'A',kind:'player'}])).supported);
 check('string target collection rejected',()=>!plan(make('A')).supported);
 check('object target collection rejected',()=>!plan(make({id:'A'})).supported);
 check('null target collection rejected',()=>!plan(make(null)).supported);
 check('missing target id rejected',()=>!plan(make([{}])).supported);
 check('empty target id rejected',()=>!plan(make([{id:''}])).supported);
 check('null target entry rejected',()=>!plan(make([null])).supported);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5RTests={run};})(typeof window!=='undefined'?window:globalThis);
