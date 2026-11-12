(function(root){'use strict';
function run(){const tests=[];const check=(name,v)=>tests.push({name,pass:!!v});
const base=(id,types,power,extra={})=>({id,types,subtypes:[],supertypes:[],abilities:[],colors:[],power,toughness:power,controller:'A',owner:'A',zone:'battlefield',counters:{},...extra});
const a=base('a',['creature'],2,{name:'Original',abilities:['flying'],colors:['red'],manaCost:'{2}{R}'});
const b=base('b',['artifact'],1,{controller:'B',counters:{'+1/+1':2}});
const c=base('c',['enchantment'],3);
const cp=(id,sourceId,targetId,timestamp)=>({id,kind:'copyCharacteristics',layer:'1a',sourceId,targetId,timestamp});
const result=root.JudgeUnifiedContinuous.evaluate([a,b,c],[cp('ab','a','b',1),cp('bc','b','c',2)]);
check('chained copies resolve',result.supported&&result.objects[2].name==='Original'&&result.objects[2].power===2);
check('copiable abilities colors and mana cost',result.supported&&result.objects[2].abilities.includes('flying')&&result.objects[2].colors.includes('red')&&result.objects[2].manaCost==='{2}{R}');
check('controller and counters not copied',result.supported&&result.objects[1].controller==='B'&&result.objects[1].power===4);
check('copy leaves originals immutable',a.types[0]==='creature'&&b.types[0]==='artifact');
const later=root.JudgeUnifiedContinuous.evaluate([a,b],[cp('ab','a','b',1),{id:'boost',kind:'modifyPT',layer:'7c',targetId:'b',timestamp:2,power:3,toughness:1}]);
check('copy followed by later PT layer',later.supported&&later.objects[1].power===7&&later.objects[1].toughness===3);
const multiple=root.JudgeCopyLayer.evaluate([a,b,c],[cp('a','a','c',1),cp('b','b','c',2)]);
check('later copy timestamp wins',multiple.supported&&multiple.objects[2].types.includes('artifact'));
const loop=root.JudgeCopyLayer.evaluate([a,b],[cp('a','a','b',1),cp('b','b','a',2)]);
check('copy cycles fail closed',!loop.supported);
const self=root.JudgeCopyLayer.evaluate([a],[cp('self','a','a',1)]);
check('self-copy fails closed',!self.supported);
const invalid=root.JudgeCopyLayer.evaluate([a,b],[{...cp('ab','a','b',1),faceDown:true}]);
check('unsupported copy exception fails closed',!invalid.supported);
const missing=root.JudgeCopyLayer.evaluate([a,b],[cp('ab','missing','b',1)]);
check('missing copy source fails closed',!missing.supported);
return {passed:tests.filter(t=>t.pass).length,total:tests.length,tests}
}
root.JudgeGroup2CTests={run};
})(typeof window!=='undefined'?window:globalThis);