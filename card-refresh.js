/* Scryfall updates for consulted cards and search names. This updates source data,
   never rule-engine capabilities or the rules provenance gate. */
(function(root){'use strict';
const DAY=86400000,cacheName='judge-pocket-source-data:v1:'+String(root.location?.pathname||'/').replace(/[^/]*$/,''),memory=new Map(),pending=new Map(),backoff=new Map();
let slots=Promise.resolve();
const clone=x=>JSON.parse(JSON.stringify(x));
const online=()=>!!root.navigator&&root.navigator.onLine!==false;
const urlFor=(kind,name)=>'https://api.scryfall.com/'+(kind==='card'?'cards/named?exact='+encodeURIComponent(name):kind==='names'?'cards/autocomplete?q='+encodeURIComponent(name):'cards/'+name+'/rulings');
function valid(kind,body){
 if(kind==='rulings')return Array.isArray(body)&&body.length<=500&&body.every(r=>r&&typeof r.comment==='string'&&['wotc','scryfall'].includes(r.source)&&/^\d{4}-\d{2}-\d{2}$/.test(r.published_at||''));
 if(kind==='names')return Array.isArray(body)&&body.length<=100&&body.every(s=>typeof s==='string'&&s.length>0&&s.length<=300);
 return body&&typeof body.name==='string'&&body.name.length>0&&body.name.length<=300&&typeof body.type_line==='string'&&body.type_line.length>0&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.id||'')&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.oracle_id||'')&&(Array.isArray(body.colors)&&body.colors.every(c=>['W','U','B','R','G'].includes(c))||Array.isArray(body.card_faces)&&body.card_faces.length>0&&body.card_faces.every(f=>f&&Array.isArray(f.colors)&&f.colors.every(c=>['W','U','B','R','G'].includes(c))))&&(typeof body.oracle_text==='string'||Array.isArray(body.card_faces)&&body.card_faces.length>0&&body.card_faces.every(f=>f&&typeof f.name==='string'&&typeof f.oracle_text==='string'));
}
async function read(url,kind){
 let entry=memory.get(url);
 if(!entry&&root.caches){try{const response=await(await root.caches.open(cacheName)).match(url);if(response)entry=await response.json();}catch(e){}}
 if(entry?.version!==1||!Number.isFinite(entry.fetchedAt)||entry.fetchedAt>Date.now()+60000||!valid(kind,entry.body))return null;
 memory.set(url,entry);return entry;
}
async function write(url,entry){memory.set(url,entry);if(root.caches)try{await(await root.caches.open(cacheName)).put(url,new Response(JSON.stringify(entry),{headers:{'Content-Type':'application/json'}}));}catch(e){/* Storage quota/private mode: memory and bundled fallback remain usable. */}}
async function request(kind,name){
 const url=urlFor(kind,name),old=await read(url,kind),ttl=kind==='names'?6*3600000:DAY;
 if(old&&Date.now()-old.fetchedAt<ttl)return old;
 if(!online()||(backoff.get(url)||0)>Date.now())return old;
 if(pending.has(url))return pending.get(url);
 const work=(async()=>{let timer;try{
  const slot=slots.then(()=>new Promise(resolve=>setTimeout(resolve,150)));slots=slot.catch(()=>{});await slot;
  const controller=new AbortController();timer=setTimeout(()=>controller.abort(),2000);
  const response=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
  if(!response.ok){if(response.status===429){const retry=Number(response.headers?.get('Retry-After'));if(Number.isFinite(retry)&&retry>0)backoff.set(url,Date.now()+Math.max(30000,retry*1000));}throw Error('Scryfall HTTP '+response.status);}
  const data=await response.json(),body=kind==='card'?data:data.data;
  if(!valid(kind,body))throw Error('Dati Scryfall non validi');
  const entry={version:1,fetchedAt:Date.now(),body};await write(url,entry);return entry;
 }catch(e){backoff.set(url,Math.max(backoff.get(url)||0,Date.now()+30000));return old;}finally{clearTimeout(timer);pending.delete(url);}})();
 pending.set(url,work);return work;
}
async function get(name){
 if(typeof name!=='string'||!name.trim())return null;
 const entry=await request('card',name.trim());
 return entry?{...clone(entry.body),_judgeData:{source:'scryfall',retrievedAt:new Date(entry.fetchedAt).toISOString(),stale:Date.now()-entry.fetchedAt>=DAY}}:null;
}
async function suggest(query){if(typeof query!=='string'||query.trim().length<3)return [];return clone((await request('names',query.trim()))?.body||[]);}
async function rulings(card){if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(card?.id||''))return null;const entry=await request('rulings',card.id);return entry?clone(entry.body):null;}
root.JudgeCardRefresh={get,suggest,rulings};
})(typeof window!=='undefined'?window:globalThis);
