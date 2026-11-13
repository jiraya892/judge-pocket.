'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const cr=JSON.parse(fs.readFileSync('case-studies/forty-cr-review.json'));
const sources=JSON.parse(fs.readFileSync('case-studies/forty-online-sources.json')).sources;
const index=JSON.parse(fs.readFileSync('data/oracle/index.json')),chunks=new Map();
function card(name){const [,id]=index.cards.find(([n])=>n===name)||[];assert.ok(id,name);if(!chunks.has(id))chunks.set(id,JSON.parse(zlib.gunzipSync(fs.readFileSync('data/oracle/'+id+'.json.gz'))));return chunks.get(id).find(c=>c.name===name)}
const root={console,fetch:async url=>({ok:true,json:async()=>structuredClone(card(new URL(url).searchParams.get('exact')))})};root.window=root;vm.createContext(root);
for(const [,file]of fs.readFileSync('context.html','utf8').matchAll(/<script src="\.\/([^"?]+\.js)"><\/script>/g)){if(file==='context-ui.js')break;vm.runInContext(fs.readFileSync(file,'utf8'),root,{filename:file});}
(async()=>{const cases=JSON.parse(fs.readFileSync('case-studies/forty-online-cases.json')).cases;let failures=0;
assert.equal(cases.length,40);assert.equal(new Set(cases.map(c=>c.id)).size,40);assert.equal(new Set(cases.map(c=>JSON.stringify([c.cards,c.event,c.controllers]))).size,40);
for(const c of cases){try{assert.ok(c.ruleBasis.length);for(const id of c.ruleBasis)assert.ok(cr.excerpts[id],'CR evidence '+id);for(const name of c.cards){const source=sources.find(s=>s.name===name);assert.ok(source,'Online evidence for '+name);assert.deepEqual(source.local_mismatches,[]);assert.ok(c.sources.includes(source.url));for(const [key,value]of Object.entries(source.oracle))assert.deepEqual(card(name)[key]??null,value,'Online/local '+name+' '+key);}
const result=await root.JudgeGuidedBridge.evaluate({...c,board:'complete'});assert.equal(result.status,'partial',JSON.stringify(result));assert.equal(result.diagnostic.calculationVerified,true);assert.equal(result.diagnostic.sourceAuthenticationVerified,false);const o=JSON.parse(JSON.stringify(result.outcome));for(const [key,value]of Object.entries(c.expected)){assert.deepEqual(key==='zones'?o.results.map(x=>x.zone):key==='damage'?o.results.map(x=>x.damage):o[key],value,key);}console.log('PASS '+c.id+' '+c.question);}catch(e){failures++;console.log('FAIL '+c.id+' '+c.cards.join(' / ')+' '+e.message.slice(0,1600));}}
console.log((cases.length-failures)+'/'+cases.length+' online study scenarios passed');if(failures)process.exitCode=1;})().catch(e=>{console.error(e);process.exitCode=1});
