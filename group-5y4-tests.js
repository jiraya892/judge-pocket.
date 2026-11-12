(function(root){'use strict';function run(){
const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
const C=root.JudgeCoordinator,R=root.JudgeRulesCore;
root.JudgeCoordinator={evaluate:()=>({supported:true,game:{},results:[],warnings:[]})};
root.JudgeRulesCore={stateBasedActions:()=>[]};
const base=()=>root.JudgeTurnPipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects:[{id:'x',zone:'battlefield',objectIdentity:'x1',controller:'A',types:['creature'],toughness:2,damage:0,abilities:[{id:'death',kind:'triggered',event:{type:'dies'}},{id:'damage',kind:'triggered',event:{type:'dealDamage'}}]}],effects:[],replacements:[],stack:[],pendingTriggers:[],activePlayer:'A',turn:{activePlayer:'A',priorityPlayer:'A'}});
const resolve=(s,events)=>{let a=root.JudgeTurnPipeline.apply(s,{type:'pushStack',controller:'A',description:'events',instruction:events});if(!a.supported)return a;let b=root.JudgeTurnPipeline.apply(a.state,{type:'passPriority',player:'A'});return b.supported?root.JudgeTurnPipeline.apply(b.state,{type:'passPriority',player:'B'}):b};
try{
check('unknown creature toughness requests fact',()=>{let s=base();delete s.objects[0].toughness;let r=root.JudgeLocalSBA.stabilize(s);return !r.supported&&!!r.requiredFacts});
check('unknown toughness prevents definitive resolution',()=>{let s=base();delete s.objects[0].toughness;return !resolve(s,[{type:'tap',target:'x'}]).supported});
check('known toughness still resolves',()=>resolve(base(),[{type:'tap',target:'x'}]).supported);
check('prevention blocks lethal and death trigger',()=>{let s=base();s.replacements=[{id:'p',operation:'prevent',match:{type:'dealDamage'},value:2}];let r=resolve(s,[{type:'dealDamage',target:'x',amount:2}]);return r.supported&&r.state.objects[0].zone==='battlefield'&&!r.state.pendingTriggers.some(t=>t.abilityId==='death')});
check('lethal damage queues death trigger',()=>{let r=resolve(base(),[{type:'dealDamage',target:'x',amount:2}]);return r.supported&&r.state.objects[0].zone==='graveyard'&&r.state.pendingTriggers.some(t=>t.abilityId==='death')});
check('pending triggers block priority',()=>{let r=resolve(base(),[{type:'dealDamage',target:'x',amount:2}]);return r.supported&&!root.JudgeTurnPipeline.apply(r.state,{type:'passPriority',player:'A'}).supported});
check('SBA remains atomic across instructions',()=>{let r=resolve(base(),[{type:'dealDamage',target:'x',amount:2},{type:'putCounters',target:'x',counterType:'+1/+1',amount:1}]);return r.supported&&r.state.objects[0].zone==='battlefield'});
check('priority passes before resolution',()=>{let s=base();let p=root.JudgeTurnPipeline.apply(s,{type:'pushStack',controller:'A',description:'tap',instruction:{type:'tap',target:'x'}});let a=root.JudgeTurnPipeline.apply(p.state,{type:'passPriority',player:'A'});return a.supported&&a.step==='priorityPassed'&&a.state.stack.length===1});
check('APNAP asks for ambiguous order',()=>{let s=base();s.pendingTriggers=[{id:'t1',controller:'A'},{id:'t2',controller:'A'}];let r=root.JudgeAPNAP.place(s);return !r.supported&&!!r.requiredFacts});
check('APNAP respects explicit order',()=>{let s=base();s.pendingTriggers=[{id:'t1',controller:'A'},{id:'t2',controller:'A'}];let r=root.JudgeAPNAP.place(s,{A:['t2','t1']});return r.supported&&r.placements.join(',')==='t2,t1'});
}finally{root.JudgeCoordinator=C;root.JudgeRulesCore=R}
return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5Y4Tests={run};})(typeof window!=='undefined'?window:globalThis);
