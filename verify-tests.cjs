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
for(const path of ['engine.js','rules-core.js','rules-tests.js','turn-kernel.js','turn-tests.js','effect-executor.js','effect-tests.js','layer-engine.js','layer-tests.js','oracle-compiler.js','oracle-tests.js']){
 vm.runInContext(fs.readFileSync(__dirname+'/'+path,'utf8'),context,{filename:path,timeout:3000});
}
let failed=0,passed=0;
for(const [summary,details] of [['testSummary','testResults'],['turnTestSummary','turnTestResults'],['effectTestSummary','effectTestResults'],['layerTestSummary','layerTestResults'],['oracleTestSummary','oracleTestResults']]){
 console.log(elements[summary].textContent);
 for(const line of elements[details].children){
  if(line.className==='fail'){failed++;console.error(line.textContent)}
  else if(line.className==='ok')passed++;
 }
}
console.log('Total: '+passed+' passed, '+failed+' failed');
if(failed)process.exitCode=1;
