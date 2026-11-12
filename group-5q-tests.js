(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const make=(instruction,targets)=>{const s={players:[{id:'A',life:20},{id:'B',life:20}],objects:[],effects:[],stack:[]};s.stack=[{id:'spell',instruction,...(targets===undefined?{}:{targets})}];return s};
 const plan=s=>root.JudgeResolution.plan(s,s.stack[0]);
 check('untargeted life gain accepted',()=>plan(make({type:'gainLife',player:'A',amount:1})).supported);
 check('undeclared target binding rejected',()=>!plan(make({type:'gainLife',player:'A',amount:1,targetId:'A'})).supported);
 check('empty declared targets with bound instruction rejected',()=>!plan(make({type:'gainLife',player:'A',amount:1,targetId:'A'},[])).supported);
 check('declared target binding accepted',()=>plan(make({type:'gainLife',player:'A',amount:1,targetId:'A'},[{id:'A',kind:'player'}])).supported);
 check('multiple untargeted instructions accepted',()=>plan(make([{type:'gainLife',player:'A',amount:1},{type:'loseLife',player:'B',amount:1}])).supported);
 check('mixed bound and unbound instructions without targets rejected',()=>!plan(make([{type:'gainLife',player:'A',amount:1},{type:'gainLife',player:'B',amount:1,targetId:'B'}])).supported);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5QTests={run};})(typeof window!=='undefined'?window:globalThis);
