'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const index=JSON.parse(fs.readFileSync('data/oracle/index.json','utf8'));
let n=0;const check=async(name,fn)=>{await fn();n++;console.log('PASS '+name)};
function provider(corrupt=false){
 const hits=[];const context={DecompressionStream,Response,Blob,crypto:crypto.webcrypto,fetch:async path=>{
  assert.match(path,/^\.\/data\/oracle\/(index\.json|(?:rulings-)?[0-3][0-9a-f]\.json\.gz)$/);
  hits.push(path);let bytes=fs.readFileSync(path);
  if(corrupt&&path.endsWith('.gz')){bytes=Buffer.from(bytes);bytes[bytes.length-1]^=1;}
  return new Response(bytes,{status:200,headers:{'Content-Type':path.endsWith('.json')?'application/json':'application/gzip'}});
 }};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('card-data.js','utf8'),context);return {data:context.JudgeCardData,hits};
}
(async()=>{
 await check('every generated Oracle and ruling shard verifies digest, length and record count',()=>{
  let count=0;for(const [prefix,manifest] of [['',index.shards],['rulings-',index.rulingShards]])for(const [id,entry]of Object.entries(manifest)){
   const bytes=fs.readFileSync('data/oracle/'+prefix+id+'.json.gz');assert.equal(bytes.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);const records=JSON.parse(zlib.gunzipSync(bytes));assert.equal(records.length,entry.records);if(!prefix)count+=records.length;
  }assert.equal(count,index.count);assert.equal(index.cards.length,index.count);
 });
 const {data,hits}=provider();
 await check('local name search finds canonical card without network APIs',async()=>assert.ok((await data.suggest('Blood Moo')).includes('Blood Moon')));
 await check('short prefix suggests Blood Moon among the first choices',async()=>assert.ok((await data.suggest('Blood')).indexOf('Blood Moon')>=0));
 await check('one-letter typo suggests the canonical Ashaya name',async()=>assert.ok((await data.suggest('Ashaia')).includes('Ashaya, Soul of the Wild')));
 await check('partial words of a long name work together',async()=>assert.ok((await data.suggest('Soul Wild')).includes('Ashaya, Soul of the Wild')));
 await check('exact local retrieval preserves Oracle bytes',async()=>assert.equal((await data.get('blood moon')).oracle_text,'Nonbasic lands are Mountains.'));
 await check('local card results are immutable copies',async()=>{const card=await data.get('Blood Moon');card.name='changed';assert.equal((await data.get('Blood Moon')).name,'Blood Moon')});
 await check('vanilla creature has numeric P/T and valid empty Oracle',async()=>{const card=await data.get('Grizzly Bears');assert.equal(card.oracle_text,'');assert.equal(card.toughness,'2')});
 await check('unknown exact names do not invent records',async()=>assert.equal(await data.get('not a real card 10101'),null));
 await check('rulings are selected by Oracle ID, not by guessed pair matching',async()=>{const card=await data.get('Blood Moon'),rules=await data.rulings(card.oracle_id);assert.ok(rules.length>0);assert.ok(rules.every(r=>r.oracle_id===card.oracle_id));assert.ok(rules.some(r=>r.source==='wotc'))});
 await check('corrupt compressed bytes are rejected before use',async()=>{const broken=provider(true).data;await assert.rejects(broken.get('Blood Moon'),/Integrità/)});
 await check('retry after integrity failure does not cache invalid bytes',async()=>{const broken=provider(true);await assert.rejects(broken.data.get('Blood Moon'));await assert.rejects(broken.data.get('Blood Moon'));assert.equal(broken.hits.filter(h=>h.endsWith('.gz')).length,2)});
 await check('all provider requests remain local and shard reads are deduplicated',()=>{assert.ok(hits.every(h=>h.startsWith('./data/oracle/')));assert.equal(new Set(hits).size,hits.length)});
 console.log(n+'/'+n+' card database checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
