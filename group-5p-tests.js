(function(root){'use strict';function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const make=(instruction)=>{const s={players:[{id:'A',life:20},{id:'B',life:20}],objects:[{id:'X',zone:'battlefield',types:['creature']}],stack:[],effects:[]};s.stack=[{id:'spell',targets:[{id:'A',kind:'player'},{id:'B',kind:'player'},{id:'X',kind:'object',zone:'battlefield'}],instruction}];return s};
 const plan=s=>root.JudgeResolution.plan(s,s.stack[0]);
 check('legal target with matching player binding resolves',()=>{const r=plan(make({type:'gainLife',player:'A',amount:1,targetId:'A'}));return r.supported&&r.events.length===1});
 check('legal target cannot redirect life gain',()=>!plan(make({type:'gainLife',player:'B',amount:1,targetId:'A'})).supported);
 check('legal target cannot redirect life loss',()=>!plan(make({type:'loseLife',player:'B',amount:1,targetId:'A'})).supported);
 check('legal target cannot redirect damage',()=>!plan(make({type:'dealDamage',target:'X',amount:1,targetId:'A'})).supported);
 check('legal object binding accepted',()=>plan(make({type:'tap',target:'X',targetId:'X'})).supported);
 check('undeclared target binding rejected',()=>!plan(make({type:'gainLife',player:'A',amount:1,targetId:'Z'})).supported);
 check('unbound nontargeted instruction remains supported',()=>plan(make({type:'gainLife',player:'A',amount:1})).supported);
 check('empty target id rejected',()=>!plan(make({type:'gainLife',player:'A',amount:1,targetId:''})).supported);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5PTests={run};})(typeof window!=='undefined'?window:globalThis);
