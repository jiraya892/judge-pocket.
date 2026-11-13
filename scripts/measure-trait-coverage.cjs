'use strict';
// Grammar coverage is not proof that every interaction of a card is supported.
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
function grammar(file){const ctx={};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('guided-bridge.js','utf8'),ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx);return ctx.JudgeCreatureTraits.prepare}
const before=grammar('case-studies/fixtures/creature-traits-before-targeting.js'),after=grammar('creature-traits.js'),cards=new Map();
for(const file of fs.readdirSync('.').filter(n=>/^oracle-cards.*\.jsonl\.gz$/.test(n)).sort())for(const line of zlib.gunzipSync(fs.readFileSync(file)).toString().split('\n').filter(Boolean)){const card=JSON.parse(line);cards.set(card.name,card)}
let oldCount=0,newCount=0;const unlocked=[];
for(const card of cards.values()){
 const old=before(card,0).supported,now=after(card,0).supported;if(old)oldCount++;if(now)newCount++;if(now&&!old)unlocked.push(card.name);
}
const result={scope:'Preparing creatures for the bounded noncombat spell-damage path, not all interactions of each card',snapshotCards:cards.size,before:oldCount,after:newCount,newlyRecognized:unlocked.sort()};
fs.writeFileSync('case-studies/trait-coverage.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cards:cards.size,before:oldCount,after:newCount,additional:unlocked.length}));
