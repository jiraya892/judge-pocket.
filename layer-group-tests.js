/* Regression tests: explicit layer ordering, cycles, and conservative boundaries. */
(function(root){'use strict';function run(){const tests=[];const check=(name,ok)=>tests.push({name,pass:!!ok});const base={types:['creature'],power:2,toughness:2};const e=root.JudgeLayers.evaluate;
 let r=e(base,[{id:'later',layer:'4',kind:'removeType',value:'artifact',timestamp:1,dependency:['first']},{id:'first',layer:'4',kind:'addType',value:'artifact',timestamp:2}]);check('dependency before timestamp',r.supported&&r.order[0].kind==='addType'&&!r.state.types.includes('artifact'));
 r=e(base,[{id:'a',layer:'4',kind:'addType',value:'artifact',timestamp:2,dependency:['b']},{id:'b',layer:'4',kind:'removeType',value:'artifact',timestamp:1,dependency:['a']}]);check('cycle deterministic',r.supported&&r.order[0].kind==='removeType');
 check('unknown dependency blocked',!e(base,[{id:'a',layer:'4',kind:'addType',value:'land',timestamp:1,dependency:['missing']}]).supported);
 check('cross layer dependency blocked',!e(base,[{id:'a',layer:'4',kind:'addType',value:'land',timestamp:1,dependency:['b']},{id:'b',layer:'5',kind:'setColor',values:['red'],timestamp:1}]).supported);
 r=e(base,[{layer:'7c',kind:'modifyPT',power:1,toughness:2,timestamp:1},{layer:'7b',kind:'setPT',power:3,toughness:3,timestamp:2}]);check('P/T layer ordering',r.supported&&r.state.power===4&&r.state.toughness===5);
 const land=root.JudgeLandLayers.evaluate([{types:['land'],subtypes:['Forest'],supertypes:['basic'],abilities:[],controller:'A',token:false}],[{kind:'setNonbasicLandSubtype',subtype:'Mountain',timestamp:1}]);check('basic land unaffected',land.supported&&land.objects[0].subtypes[0]==='Forest');
 const nonbasic=root.JudgeLandLayers.evaluate([{types:['land'],subtypes:['Forest'],supertypes:[],abilities:[{origin:'rulesText',id:'old'}],controller:'A',token:false}],[{kind:'setNonbasicLandSubtype',subtype:'Mountain',timestamp:1}]);
 check('nonbasic land loses printed abilities',nonbasic.supported&&!nonbasic.objects[0].abilities.some(a=>a.id==='old'));
 check('mountain grants red mana ability',nonbasic.objects[0].abilities.some(a=>a.kind==='tapForMana'&&a.color==='R'));
 const ashaya=[{types:['creature'],subtypes:[],supertypes:['legendary'],abilities:[{id:'pt',origin:'rulesText'},{id:'land',origin:'rulesText'}],controller:'A',token:false,ptDefinition:{kind:'landCount',abilityId:'pt'}}];
 const interacting=root.JudgeContinuousState.evaluate(ashaya,[{kind:'setNonbasicLandSubtype',subtype:'Mountain',timestamp:1},{kind:'addLandSubtype',subtype:'Forest',scope:'nontokenCreaturesYouControl',controller:'A',timestamp:2}]);
 check('automatic land dependency ordering',interacting.supported&&interacting.order[0].kind==='addLandSubtype');
 check('removed CDA warning',interacting.warnings?.length===1);
 return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};}root.JudgeLayerGroupTests={run};})(typeof window!=='undefined'?window:globalThis);
