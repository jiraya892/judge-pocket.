/* Local supplied Oracle snapshot, lazy compressed shards with integrity checks.
   The manifest hash detects corruption; it does not authenticate a publisher. */
(function(root){'use strict';
const base='./data/oracle/';let manifestPromise;const shards=new Map();
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
async function manifest(){
 if(!manifestPromise)manifestPromise=fetch(base+'index.json').then(async response=>{
  if(!response.ok)throw Error('Indice carte locale non disponibile');
  const data=await response.json();
  if(data.version!==1||!Array.isArray(data.cards)||data.cards.length!==data.count||!data.shards)throw Error('Indice carte locale non valido');
  const byName=new Map(data.cards.map(([name,shard])=>[normalize(name),shard]));
  return {...data,byName};
 }).catch(error=>{manifestPromise=null;throw error});
 return manifestPromise;
}
async function load(shard,index,prefix=''){
 const key=prefix+shard;
 if(!/^[0-3][0-9a-f]$/.test(shard)||!index.shards[shard])throw Error('Archivio Oracle sconosciuto');
 if(!shards.has(key)){
  const pending=(async()=>{
   if(!root.DecompressionStream||!root.crypto?.subtle)throw Error('Questo browser non supporta il database compresso offline');
   const response=await fetch(base+prefix+shard+'.json.gz');if(!response.ok)throw Error('Archivio Oracle non disponibile');
   const bytes=await response.arrayBuffer(),expected=index.shards[shard];
   if(bytes.byteLength!==expected.bytes)throw Error('Dimensione archivio Oracle non valida');
   const digest=Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   if(digest!==expected.sha256)throw Error('Integrità archivio Oracle non valida');
   const text=await new Response(new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'))).text();
   const cards=JSON.parse(text);if(!Array.isArray(cards)||cards.length!==expected.records)throw Error('Archivio Oracle non valido');
   return cards;
  })().catch(error=>{shards.delete(key);throw error});
  shards.set(key,pending);
 }
 return shards.get(key);
}
async function get(name){
 const index=await manifest(),key=normalize(name.trim()),shard=index.byName.get(key);
 if(!shard)return null;
 const card=(await load(shard,index)).find(c=>normalize(c.name)===key);
 if(!card)throw Error('Carta assente dall’archivio dichiarato');
 return JSON.parse(JSON.stringify(card));
}
async function suggest(query,limit=10){
 const q=normalize(query.trim());if(q.length<2)return [];
 const index=await manifest();
 return index.cards.filter(([name])=>normalize(name).includes(q)).slice(0,Math.min(20,Math.max(1,limit))).map(([name])=>name);
}
async function rulings(oracleId){
 if(typeof oracleId!=='string'||!(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(oracleId)))throw Error('Identificativo Oracle non valido');
 const index=await manifest(),shard=(parseInt(oracleId.slice(0,2),16)%64).toString(16).padStart(2,'0');
 if(!index.rulingShards)throw Error('Database ruling locale non disponibile');
 return (await load(shard,{shards:index.rulingShards},'rulings-')).filter(r=>r.oracle_id===oracleId).map(r=>({...r}));
}
root.JudgeCardData={get,suggest,rulings,info:async()=>{const m=await manifest();return {count:m.count,source:m.source,version:m.version}}};
})(typeof window!=='undefined'?window:globalThis);
