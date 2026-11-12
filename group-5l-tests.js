(function(root){'use strict';
function run(){
 const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
 const base=()=>({players:[{id:'A',life:20},{id:'B',life:20}],objects:[{id:'c',types:['creature'],zone:'battlefield',toughness:2,damage:0,counters:{}}],effects:[]});
 const execute=(s,e)=>{const o=s.objects[0];if(e.type==='damage')o.damage+=e.amount;else if(e.type==='counter')o.counters['+1/+1']=(o.counters['+1/+1']||0)+e.amount;else return {supported:false,reason:'unknown'};return {supported:true,state:s}};
 const sba=s=>root.JudgeLocalSBA.stabilize(s);
 check('damage then counter survives one resolution',()=>{const r=root.JudgeAtomicResolution.resolve(base(),[{type:'damage',amount:2},{type:'counter',amount:1}],execute,sba);return r.supported&&r.state.objects[0].zone==='battlefield'&&r.state.objects[0].damage===2});
 check('damage alone kills',()=>{const r=root.JudgeAtomicResolution.resolve(base(),[{type:'damage',amount:2}],execute,sba);return r.supported&&r.state.objects[0].zone==='graveyard'});
 check('separate resolution kills before counter',()=>{const first=root.JudgeAtomicResolution.resolve(base(),[{type:'damage',amount:2}],execute,sba);return first.supported&&first.state.objects[0].zone==='graveyard'});
 check('unknown instruction fails closed',()=>!root.JudgeAtomicResolution.resolve(base(),[{type:'unknown'}],execute,sba).supported);
 check('failed instruction leaves input unchanged',()=>{const s=base();root.JudgeAtomicResolution.resolve(s,[{type:'damage',amount:2},{type:'unknown'}],execute,sba);return s.objects[0].damage===0&&s.objects[0].zone==='battlefield'});
 check('missing SBA refuses resolution',()=>!root.JudgeAtomicResolution.resolve(base(),[{type:'damage',amount:1}],execute,()=>({supported:false,reason:'unknown characteristics'})).supported);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}
root.JudgeGroup5LTests={run};
})(typeof window!=='undefined'?window:globalThis);
