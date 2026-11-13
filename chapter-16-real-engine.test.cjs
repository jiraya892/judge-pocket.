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
let fixture;let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
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
 fixture={...built,effects,scope:'clean-static-snapshot'};
 const settled=context.JudgeCoordinator.evaluateScenario(fixture);
 check('real SBA and source recalculation '+controllers+' / '+order,()=>{assert.equal(settled.status,'verified');assert.equal(settled.results[ashIndex].zone,'graveyard');assert.equal(settled.events.length,1);assert.equal(settled.steps.length,2);assert.equal(settled.steps[1].objects.some(o=>o.id===built.objects[ashIndex].id),false)});
 check('rules-text abilities removed, mana retained '+controllers+' / '+order,()=>{const a=unified.objects[ashIndex];assert.equal(a.abilities.some(x=>x.origin==='rulesText'),false);assert.equal(a.abilities.some(x=>x.origin==='basicLandType'&&x.color==='R'),true)});
}
const clone=x=>JSON.parse(JSON.stringify(x));
check('complete scenario evaluator never calls the partial legacy path',()=>{const original=context.JudgeCoordinator.evaluate;context.JudgeCoordinator.evaluate=()=>{throw Error('partial path used')};assert.equal(context.JudgeCoordinator.evaluateScenario(fixture).status,'verified');context.JudgeCoordinator.evaluate=original});
for(const [name,change] of [
 ['unknown scope',s=>{s.scope=null}],
 ['unknown Oracle',s=>{s.objects[0].oracleUnknown=['opaque']}],
 ['unmodeled modifier',s=>{s.effects[0].kind='modifyPT';s.effects[0].layer='7c'}],
 ['unmodeled counter',s=>{s.objects[0].counters['+1/+1']=1}],
 ['pending zone event',s=>{s.objects[0].pendingDestroy=true}],
 ['already-land source dependency',s=>{s.objects[0].types.push('land')}],
 ['unmodeled damage',s=>{s.objects[0].damage=1}],
 ['unmodeled commander choice',s=>{s.objects[0].isCommander=true}]
])check('scope exclusion: '+name,()=>{const s=clone(fixture);change(s);assert.equal(context.JudgeCoordinator.evaluateScenario(s).status,'unsupported')});
check('no card-name exception in scenario evaluation',()=>{const s=clone(fixture);s.objects.forEach((o,i)=>{o.name='Unrelated label '+i});const r=context.JudgeCoordinator.evaluateScenario(s);assert.equal(r.status,'verified');assert.equal(r.events.length,1)});
check('surviving creature loses the departed source effect after SBA',()=>{const s=clone(fixture),controller=s.objects[ashIndex].controller;s.objects.push({id:'extra',name:'Generic creature',owner:controller,controller,zone:'battlefield',types:['creature'],subtypes:[],supertypes:[],abilities:[],power:2,toughness:2,counters:{},damage:0,token:false});const out=context.JudgeCoordinator.evaluateScenario(s);assert.equal(out.status,'verified');assert.equal(out.steps[0].objects.find(o=>o.id==='extra').types.includes('land'),true);assert.equal(out.results.find(o=>o.id==='extra').types.includes('land'),false);assert.equal(out.results.find(o=>o.id==='extra').power,2)});
(async()=>{
 const boundary=await context.JudgeGuidedBridge.evaluate({cards:names,event:'present'});
 check('real planner asks only the explicit scenario boundary',()=>{assert.equal(boundary.status,'question');assert.equal(boundary.key,'board');assert.equal(boundary.diagnostic.questionPlanning.status,'ready');assert.equal(boundary.diagnostic.questionPlanning.scenarios,8)});
 const out=await context.JudgeGuidedBridge.evaluate({cards:names,event:'present',board:'complete'});
 check('actual bridge stabilizes real interaction without controller or order questions',()=>{assert.equal(out.status,'partial');assert.equal(out.diagnostic.calculationVerified,true);assert.equal(out.outcome.results[ashIndex].zone,'graveyard');assert.equal(out.outcome.events.length,1)});
 const gate=context.JudgeGuidedTrustGate.guard(out);
 check('presentation does not manufacture a verified verdict',()=>{assert.equal(gate.status,'partial');assert.equal(gate.verdict,null)});
 console.log(count+'/'+count+' real-engine integration checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
