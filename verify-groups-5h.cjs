/* Node CI runner for the complete browser-based Group 4–5H suites.
   Runs every suite registered by group-4-tests.html, plus Group 5H.
   Fails closed on missing modules, exceptions, skipped suites or assertions. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/group-4-tests.html','utf8');
const scripts=[...html.matchAll(/<script src="([^"]+\.js)"><\/script>/g)].map(x=>x[1]);
const registry=html.match(/const names=(\[[^;]+\]);function runAll/);
if(!registry)throw Error('Cannot parse browser suite registry');
const names=JSON.parse(registry[1].replace(/'/g,'"'));
names.push('JudgeGroup5HTests','JudgeGroup5LTests','JudgeGroup5MTests','JudgeGroup5NTests','JudgeGroup5OTests','JudgeGroup5PTests','JudgeGroup5QTests','JudgeGroup5RTests','JudgeGroup5STests');
scripts.push('group-5h-tests.js','group-5l-tests.js','group-5m-tests.js','group-5n-tests.js','group-5o-tests.js','group-5p-tests.js','group-5q-tests.js','group-5r-tests.js','group-5s-tests.js');
const window={};
const context=vm.createContext({window,console});
for(const path of scripts){
 if(!fs.existsSync(__dirname+'/'+path))throw Error('Missing test dependency: '+path);
 vm.runInContext(fs.readFileSync(__dirname+'/'+path,'utf8'),context,{filename:path,timeout:5000});
}
let passed=0,total=0,errors=0;
for(const name of names){
 try{
  if(!window[name]||typeof window[name].run!=='function')throw Error('Missing suite '+name);
  const r=window[name].run();
  if(!r||!Number.isSafeInteger(r.total)||!Number.isSafeInteger(r.passed)||!Array.isArray(r.tests)||r.tests.length!==r.total)throw Error('Invalid suite report');
  total+=r.total;passed+=r.passed;
  console.log(name+': '+r.passed+'/'+r.total);
  for(const t of r.tests)if(!t.pass)console.error('FAIL '+name+': '+t.name);
 }catch(e){errors++;console.error('ERROR '+name+': '+e.stack)}
}
console.log('Browser suites: '+passed+'/'+total+' passed; '+errors+' execution errors');
if(errors||passed!==total||total<375)process.exitCode=1;
