(function(){
 const base=[
 {types:['creature'],subtypes:[],supertypes:['legendary'],abilities:[{id:'size',origin:'rulesText'}],controller:'A',token:false,ptDefinition:{kind:'landCount',abilityId:'size'}},
 {types:['enchantment'],subtypes:[],supertypes:[],abilities:[],controller:'B',token:false}
 ];
 const add={kind:'addLandSubtype',scope:'nontokenCreaturesYouControl',controller:'A',subtype:'Forest',timestamp:2};
 const change={kind:'setNonbasicLandSubtype',subtype:'Mountain',timestamp:1};
 const withBoth=window.JudgeContinuousState.evaluate(base,[change,add]);
 if(!withBoth.supported||withBoth.objects[0].toughness!==0||!withBoth.objects[0].graveyardBySBA||withBoth.order[0].kind!=='addLandSubtype')throw Error('Combined effect not resolved');
 const withoutChange=window.JudgeContinuousState.evaluate(base,[add]);
 if(!withoutChange.supported||withoutChange.objects[0].power!==1||withoutChange.objects[0].graveyardBySBA)throw Error('P/T calculation failed');
 const plain=window.JudgeContinuousState.evaluate([{types:['creature'],subtypes:[],supertypes:[],abilities:[],controller:'A',token:false,power:2,toughness:2}],[]);
 if(!plain.supported||plain.objects[0].graveyardBySBA)throw Error('Unrelated creature affected');
 document.getElementById('continuousStateSummary').textContent='3 test superati, 0 falliti.';
})();