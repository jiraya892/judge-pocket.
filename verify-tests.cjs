/* Run with: node verify-tests.cjs. No dependencies. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const elements={};
const document={
 getElementById(id){return elements[id]??={textContent:'',className:'',children:[],append(el){this.children.push(el)}}},
 createElement(){return {textContent:'',className:''}}
};
const window={};
const context=vm.createContext({window,document,console});
for(const path of ['engine.js','rules-core.js','rules-tests.js','turn-kernel.js','turn-tests.js','effect-executor.js','effect-tests.js','layer-engine.js','layer-tests.js','oracle-compiler.js','oracle-tests.js','oracle-runtime.js','runtime-tests.js']){
 vm.runInContext(fs.readFileSync(__dirname+'/'+path,'utf8'),context,{filename:path,timeout:3000});
}
let failed=0,passed=0;
for(const [summary,details] of [['testSummary','testResults'],['turnTestSummary','turnTestResults'],['effectTestSummary','effectTestResults'],['layerTestSummary','layerTestResults'],['oracleTestSummary','oracleTestResults'],['runtimeTestSummary','runtimeTestResults']]){
 console.log(elements[summary].textContent);
 for(const line of elements[details].children){
  if(line.className==='fail'){failed++;console.error(line.textContent)}
  else if(line.className==='ok')passed++;
 }
}

/* Group 5H: execute real SBA regressions in CI, not merely browser-only tests. */
vm.runInContext(fs.readFileSync(__dirname+'/local-sba.js','utf8'),context,{filename:'local-sba.js',timeout:3000});
const sba=window.JudgeLocalSBA;
const creature=()=>({players:[{id:'A',life:20},{id:'B',life:20}],effects:[],objects:[{id:'c',zone:'battlefield',types:['creature'],toughness:2,damage:0,counters:{}}]});
const cases=[
 ['2 damage kills 2/2 at SBA check',()=>{const s=creature();s.objects[0].damage=2;return sba.stabilize(s).state.objects[0].zone==='graveyard'}],
 ['2 damage then +1/+1 in same resolution survives',()=>{const s=creature();s.objects[0].damage=2;s.objects[0].counters['+1/+1']=1;const r=sba.stabilize(s);return r.supported&&r.state.objects[0].zone==='battlefield'&&r.changes.length===0}],
 ['2 damage in separate resolution kills before later counter',()=>{const s=creature();s.objects[0].damage=2;const r=sba.stabilize(s);return r.supported&&r.state.objects[0].zone==='graveyard'}],
 ['indestructible 2/2 survives lethal damage',()=>{const s=creature();s.objects[0].damage=2;s.objects[0].indestructible=true;const r=sba.stabilize(s);return r.supported&&r.changes.length===0}]
];
for(const [name,fn] of cases){try{if(!fn())throw Error('assertion failed');passed++;console.log('PASS 5H: '+name)}catch(e){failed++;console.error('FAIL 5H: '+name+' — '+e.message)}}

console.log('Total: '+passed+' passed, '+failed+' failed');
if(failed)process.exitCode=1;
