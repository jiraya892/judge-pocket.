(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const make=targets=>{const s={players:[{id:'A',life:20}],objects:[],effects:[],stack:[]};s.stack=[{id:'spell',targets,instruction:{type:'gainLife',player:'A',amount:1}}];return s};
 const plan=s=>root.JudgeResolution.plan(s,s.stack[0]);
 check('valid player kind accepted',()=>plan(make([{id:'A',kind:'player'}])).supported);
 check('empty target collection accepted',()=>plan(make([])).supported);
 check('missing target kind rejected',()=>!plan(make([{id:'A'}])).supported);
 check('empty target kind rejected',()=>!plan(make([{id:'A',kind:''}])).supported);
 check('numeric target kind rejected',()=>!plan(make([{id:'A',kind:2}])).supported);
 check('null target kind rejected',()=>!plan(make([{id:'A',kind:null}])).supported);
 check('mixed valid and missing kind rejected',()=>!plan(make([{id:'A',kind:'player'},{id:'B'}])).supported);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5STests={run};})(typeof window!=='undefined'?window:globalThis);
