'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const selected=['Shock','Lightning Bolt','Silver Knight','White Knight','Slippery Bogle','Deadly Insect','Grizzly Bears'];
const cards=new Map();
for(const file of fs.readdirSync('.').filter(n=>/^oracle-cards.*\.jsonl\.gz$/.test(n)))for(const line of zlib.gunzipSync(fs.readFileSync(file)).toString().split('\n').filter(Boolean)){const c=JSON.parse(line);if(selected.includes(c.name))cards.set(c.name,c)}
assert.equal(cards.size,selected.length);
function engine(baseline){
 const read=file=>fs.readFileSync(file,'utf8');
 const ctx={console,fetch:async url=>({ok:true,json:async()=>JSON.parse(JSON.stringify(cards.get(new URL(url).searchParams.get('exact'))))})};ctx.window=ctx;vm.createContext(ctx);
 for(const [,file]of read('context.html').matchAll(/<script src="\.\/([^"?]+\.js)"><\/script>/g)){if(file==='context-ui.js')break;vm.runInContext(read(file),ctx,{filename:file})}
 if(baseline)vm.runInContext(read('case-studies/fixtures/creature-traits-before-targeting.js'),ctx,{filename:'baseline-creature-traits.js'});
 return ctx;
}
const before=engine(true),after=engine(false);
let n=0;const check=async(name,fn)=>{await fn();n++;console.log('PASS '+name)};
const scenario=(spell,target,extra={})=>({cards:[spell,target],event:'cast',casting:spell,castingIndex:0,board:'complete',...extra});
(async()=>{
 for(const target of ['Silver Knight','White Knight','Slippery Bogle','Deadly Insect'])await check('baseline records unsupported real case: Shock / '+target,async()=>assert.equal((await before.JudgeGuidedBridge.evaluate(scenario('Shock',target))).status,'unsupported'));
 await check('red protection prevents targeting before any damage or zone change',async()=>{const r=await after.JudgeGuidedBridge.evaluate(scenario('Shock','Silver Knight'));assert.equal(r.status,'partial');assert.equal(r.diagnostic.calculationVerified,true);assert.equal(r.outcome.events[0].type,'castingBlocked');assert.equal(r.outcome.results[0].zone,'battlefield');assert.equal(r.outcome.results[0].damage,0);assert.ok(r.outcome.rules.includes('702.16b'))});
 await check('protection from a different color does not prevent Shock',async()=>{const r=await after.JudgeGuidedBridge.evaluate(scenario('Shock','White Knight'));assert.equal(r.status,'partial');assert.equal(r.outcome.events[0].type,'dealDamage');assert.equal(r.outcome.results.find(o=>o.name==='White Knight').zone,'graveyard')});
 await check('shroud prohibits both your own and opponents sources without a controller question',async()=>{const r=await after.JudgeGuidedBridge.evaluate(scenario('Shock','Deadly Insect'));assert.equal(r.status,'partial');assert.equal(r.outcome.events[0].type,'castingBlocked');assert.ok(r.outcome.rules.includes('702.18a'));assert.equal(r.key,undefined)});
 await check('hexproof produces a necessary controller-relation question',async()=>{const r=await after.JudgeGuidedBridge.evaluate(scenario('Shock','Slippery Bogle'));assert.equal(r.key,'answers.spellController:guided-1');assert.equal(r.options.length,2)});
 await check('hexproof does not stop your own spell',async()=>{const r=await after.JudgeGuidedBridge.evaluate(scenario('Shock','Slippery Bogle',{answers:{'spellController:guided-1':'own'}}));assert.equal(r.status,'partial');assert.equal(r.outcome.events[0].type,'dealDamage');assert.equal(r.outcome.results.find(o=>o.name==='Slippery Bogle').zone,'graveyard')});
 await check('hexproof stops an opponent spell without pretending it resolved',async()=>{const r=await after.JudgeGuidedBridge.evaluate(scenario('Shock','Slippery Bogle',{answers:{'spellController:guided-1':'opponent'}}));assert.equal(r.status,'partial');assert.equal(r.outcome.events[0].type,'castingBlocked');assert.ok(r.outcome.rules.includes('702.11b'));assert.equal(r.outcome.results.find(o=>o.name==='Slippery Bogle').zone,'battlefield')});
 await check('an unrelated hexproof creature does not produce a redundant question',async()=>{const r=await after.JudgeGuidedBridge.evaluate(scenario('Shock','Slippery Bogle',{cards:['Shock','Slippery Bogle','Grizzly Bears'],answers:{spellTarget:'guided-2'}}));assert.equal(r.status,'partial');assert.equal(r.key,undefined);assert.equal(r.outcome.results.find(o=>o.name==='Grizzly Bears').zone,'graveyard')});
 await check('the same protection mechanism applies to another actual spell',async()=>{const r=await after.JudgeGuidedBridge.evaluate(scenario('Lightning Bolt','Silver Knight'));assert.equal(r.outcome.events[0].type,'castingBlocked')});
 await check('unknown source colors are not silently treated as colorless',()=>{const o=after.JudgeCreatureTraits.prepare(cards.get('Silver Knight'),0).object;assert.equal(after.JudgeTargets.check({players:[{id:'A'},{id:'B'}],objects:[o]},{id:o.id,kind:'object',sourceController:'A'}).supported,false)});
 await check('a known colorless source is distinct from an unknown-color source',()=>{const o=after.JudgeCreatureTraits.prepare(cards.get('Silver Knight'),0).object;assert.equal(after.JudgeTargets.check({players:[{id:'A'},{id:'B'}],objects:[o]},{id:o.id,kind:'object',sourceController:'A',sourceColors:[]}).legal,true)});
 await check('a known protection block makes hexproof ownership irrelevant',()=>{const fake={...cards.get('Silver Knight'),name:'Synthetic test creature',oracle_text:'Hexproof, protection from red'};const o=after.JudgeCreatureTraits.prepare(fake,0).object;for(const controller of ['A','B']){const r=after.JudgeSpellScenario.evaluate(cards.get('Shock'),[{...o,owner:controller,controller}],o.id);assert.equal(r.status,'verified');assert.equal(r.events[0].type,'castingBlocked');assert.ok(r.rules.includes('702.16b'))}});
 await check('unimplemented protection and conditional keywords stay unsupported',()=>{for(const text of ['Protection from everything','Hexproof from black'])assert.equal(after.JudgeCreatureTraits.prepare({...cards.get('Grizzly Bears'),oracle_text:text},0).supported,false)});
 console.log(n+'/'+n+' targeting case-study checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
