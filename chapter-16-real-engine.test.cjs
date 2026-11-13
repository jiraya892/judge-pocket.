'use strict';
// Oracle bytes come from the repository's supplied database. Only transport is
// replaced; recognition, game facts, layers, dependencies and coordinator are real.
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm');
const cards=new Map();
for(const name of fs.readdirSync(__dirname).filter(n=>/^oracle-cards.*\.jsonl\.gz$/.test(n))){
 for(const line of zlib.gunzipSync(fs.readFileSync(__dirname+'/'+name)).toString().split('\n').filter(Boolean)){
  const c=JSON.parse(line);if(['Ashaya, Soul of the Wild','Blood Moon'].includes(c.name))cards.set(c.name,c);
 }
}
assert.equal(cards.size,2,'Both real Oracle records must be present');
const context={console,fetch:async url=>{const name=new URL(url).searchParams.get('exact');assert.ok(cards.has(name));return {ok:true,json:async()=>JSON.parse(JSON.stringify(cards.get(name)))}}};context.window=context;
vm.createContext(context);
const scripts=[...fs.readFileSync(__dirname+'/context.html','utf8').matchAll(/<script src="\.\/([^"?]+\.js)"><\/script>/g)].map(m=>m[1]);
for(const file of scripts){if(file==='context-ui.js')break;vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),context,{filename:file})}
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
const names=[...cards.keys()].sort(),objects=names.map((name,i)=>context.JudgeGuidedBridge.cardObject(cards.get(name),i));
const ashIndex=names.indexOf('Ashaya, Soul of the Wild');
check('real Oracle reminder and abbreviated self-reference recognized',()=>{const r=context.JudgeOracleRecognition.recognize(cards.get(names[ashIndex]),objects[ashIndex]);assert.equal(r.unknown.length,0);assert.equal(r.effects[0].kind,'addLandSubtype');assert.equal(objects[ashIndex].ptDefinition.kind,'landCount')});
for(const controllers of [['A','A'],['A','B'],['B','A'],['B','B']])for(const order of [[0,1],[1,0]]){
 const built=context.JudgeGameFacts.build({cards:names,controllers,order,event:'present',board:'complete'},names.map((name,i)=>context.JudgeGuidedBridge.cardObject(cards.get(name),i)));
 const effects=[];
 for(let i=0;i<names.length;i++){
  const r=context.JudgeOracleRecognition.recognize(cards.get(names[i]),built.objects[i]);assert.equal(r.unknown.length,0);
  effects.push(...r.effects.map(e=>({...e,id:'e'+i,oracleGenerated:true,timestamp:built.timestamps[built.objects[i].id]})));
 }
 const out=context.JudgeCoordinator.evaluate({...built,effects});
 check('real layer calculation '+controllers+' / '+order,()=>{const r=out.results[ashIndex];assert.equal(out.supported,true);assert.equal(r.status,'partial');assert.equal(r.subtypes.includes('Mountain'),true);assert.equal(r.subtypes.includes('Forest'),false);assert.equal(r.power,0);assert.equal(r.toughness,0);assert.equal(r.possibleZeroToughness,true);assert.deepEqual(Array.from(r.order,x=>x.kind),['addLandSubtype','setNonbasicLandSubtype'])});
 const unified=context.JudgeUnifiedContinuous.evaluate(built.objects,effects);
 check('rules-text abilities removed, mana retained '+controllers+' / '+order,()=>{const a=unified.objects[ashIndex];assert.equal(a.abilities.some(x=>x.origin==='rulesText'),false);assert.equal(a.abilities.some(x=>x.origin==='basicLandType'&&x.color==='R'),true)});
}
(async()=>{
 const out=await context.JudgeGuidedBridge.evaluate({cards:names,event:'present'});
 check('actual bridge rejects partial engine before asking irrelevant questions',()=>{assert.equal(out.status,'unsupported');assert.equal(out.diagnostic.reasonCodes[0],'SCENARIO_NOT_VERIFIED');assert.equal(out.diagnostic.questionPlanning.status,'unsupported');assert.equal(out.key,undefined);assert.equal(out.outcome,undefined)});
 const gate=context.JudgeGuidedTrustGate.guard(out);
 check('presentation does not manufacture a verified verdict',()=>{assert.equal(gate.status,'unsupported');assert.equal(gate.verdict,null)});
 console.log(count+'/'+count+' real-engine integration checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
