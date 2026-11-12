(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const s={players:[{id:'A',life:20}],objects:[{id:'X',zone:'battlefield',types:['creature'],controller:'A'}],effects:[],stack:[]};
 const test=require=>root.JudgeTargets.check(s,{id:'X',kind:'object',require});
 check('valid type restriction accepted',()=>test({types:['creature']}).legal);
 check('valid controller restriction accepted',()=>test({controller:'A'}).legal);
 check('numeric type restriction rejected',()=>!test({types:[3]}).supported);
 check('null type restriction rejected',()=>!test({types:[null]}).supported);
 check('empty type restriction rejected',()=>!test({types:['']}).supported);
 check('numeric controller restriction rejected',()=>!test({controller:2}).supported);
 check('object controller restriction rejected',()=>!test({controller:{id:'A'}}).supported);
 check('valid mismatch is illegal not unsupported',()=>{const r=test({controller:'B'});return r.supported&&!r.legal});
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5XTests={run};})(typeof window!=='undefined'?window:globalThis);
