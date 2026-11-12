'use strict';
const assert=require('node:assert/strict');
require('./question-planner.js');
const plan=globalThis.JudgeQuestionPlanner.plan;
const facts=[{key:'controller',question:'Chi controlla?',options:[{id:'A'},{id:'B'}]},{key:'target',question:'Quale bersaglio?',options:[{id:'one'},{id:'two'}]}];
let n=0;
function check(name,fn){fn();n++;console.log('PASS '+name)}
check('irrelevant controller suppressed',()=>{const r=plan({facts,answers:{}},x=>({supported:true,outcome:{target:x.answers.target}}));assert.equal(r.key,'target');assert.deepEqual(r.relevantKeys,['target'])});
check('all scenarios equal',()=>assert.equal(plan({facts,answers:{}},()=>({supported:true,outcome:{ok:true}})).status,'ready'));
check('controller matters',()=>assert.equal(plan({facts,answers:{}},x=>({supported:true,outcome:x.answers.controller})).key,'controller'));
check('known answer retained',()=>assert.equal(plan({facts,answers:{target:'one'}},x=>({supported:true,outcome:x.answers.target})).status,'ready'));
check('unsupported branch stops',()=>assert.equal(plan({facts,answers:{}},x=>({supported:x.answers.controller==='A',outcome:'ok'})).status,'unsupported'));
check('invalid options rejected',()=>assert.equal(plan({facts:[{key:'x',options:[]}],answers:{}},()=>({supported:true,outcome:1})).status,'unsupported'));
check('bounded scenarios',()=>assert.equal(plan({facts:Array.from({length:11},(_,i)=>({key:'k'+i,options:[{id:0},{id:1}]})),answers:{}},()=>({supported:true,outcome:1})).status,'unsupported'));
check('independent choices',()=>assert.deepEqual(plan({facts,answers:{}},x=>({supported:true,outcome:x.answers.controller+x.answers.target})).relevantKeys,['controller','target']));
check('duplicate keys rejected',()=>assert.equal(plan({facts:[facts[0],facts[0]],answers:{}},()=>({supported:true,outcome:1})).status,'unsupported'));
check('invalid answered fact rejected',()=>assert.equal(plan({facts:[{key:'',options:[]}],answers:{'':'A'}},()=>({supported:true,outcome:1})).status,'unsupported'));
console.log(n+'/'+n+' question-planner tests passed');
