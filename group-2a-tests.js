/* Group 2A: authoritative path and fail-closed integration regressions. */
(function(root){'use strict';function run(){const tests=[];const check=(name,ok)=>tests.push({name,pass:!!ok});
const o={id:'x',name:'X',owner:'A',controller:'A',zone:'battlefield',types:['creature'],power:2,toughness:3,counters:{'+1/+1':1}};
const input={objects:[o],players:[{id:'A',life:20},{id:'B',life:20}],effects:[{kind:'addType',layer:'4',value:'artifact',targetId:'x',timestamp:1},{kind:'modifyPT',layer:'7c',power:2,toughness:0,targetId:'x',timestamp:2}]};
const a=root.JudgeCoordinator.evaluate(input),b=root.JudgeStateBridge.evaluate(input);
check('coordinator one pipeline',a.results[0].coverage==='restricted-shared-state'&&a.results[0].power===5&&a.results[0].types.includes('artifact'));
check('editor matches coordinator',JSON.stringify(a.results)===JSON.stringify(b.results));
check('no source mutation',o.types.length===1&&o.power===2);
const unknown=root.JudgeCoordinator.evaluate({...input,effects:[...input.effects,{kind:'unknownGlobal',targetId:'all',timestamp:3}]});
check('unknown global effect fails closed',unknown.results[0].status==='unsupported');
const noScope=root.JudgeCoordinator.evaluate({...input,effects:[{kind:'modifyPT',layer:'7c',power:1,toughness:1,timestamp:1}]});
check('missing scope fails closed',noScope.results[0].status==='unsupported');
const noModule=root.JudgeCoordinator.evaluate({...input,effects:[{kind:'copyCharacteristics',layer:'1a',targetId:'x',sourceId:'missing',timestamp:1}]});
check('missing copy source fails closed',noModule.results[0].status==='unsupported');
const oracle=root.JudgeCoordinator.evaluate({...input,objects:[{...o,oracleUnknown:['Unparsed static effect']} ]});
check('unknown Oracle fails closed',oracle.results[0].status==='unsupported');
return {passed:tests.filter(t=>t.pass).length,total:tests.length,tests}}
root.JudgeGroup2ATests={run}})(typeof window!=='undefined'?window:globalThis);