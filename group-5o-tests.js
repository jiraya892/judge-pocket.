(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const base=(instructions)=>({players:[{id:'A',life:20}],objects:[{id:'X',zone:'battlefield',types:['creature']}],stack:[{id:'spell',targets:[{id:'A',kind:'player'},{id:'B',kind:'player'}],instruction:instructions}],effects:[]});
 const plan=s=>root.JudgeResolution.plan(s,s.stack[0]);
 check('valid recipient binding retained',()=>{const s=base([{type:'gainLife',player:'A',amount:2,targetId:'A'}]);const r=plan(s);return r.supported&&r.events.length===1});
 check('illegal target event filtered',()=>{const s=base([{type:'gainLife',player:'B',amount:2,targetId:'B'}]);const r=plan(s);return r.supported&&r.events.length===0});
 check('misbound player effect rejected',()=>{const s=base([{type:'gainLife',player:'B',amount:2,targetId:'A'}]);return !plan(s).supported});
 check('misbound legal player effect rejected',()=>{const s=base([{type:'gainLife',player:'A',amount:2,targetId:'B'}]);return !plan(s).supported});
 check('missing event recipient rejected',()=>{const s=base([{type:'gainLife',amount:2,targetId:'A'}]);return !plan(s).supported});
 check('object recipient mismatch rejected',()=>{const s=base([{type:'tap',target:'X',targetId:'A'}]);return !plan(s).supported});
 check('object recipient matching target accepted',()=>{const s=base([{type:'tap',target:'X',targetId:'X'}]);s.stack[0].targets=[{id:'X',kind:'object',zone:'battlefield'},{id:'B',kind:'player'}];const r=plan(s);return r.supported&&r.events.length===1});
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5OTests={run};})(typeof window!=='undefined'?window:globalThis);
