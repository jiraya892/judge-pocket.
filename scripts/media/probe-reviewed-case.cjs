'use strict';
// Research observation, never a creator claim promoted to an expected ruling.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
async function probe(file){
 const root=path.resolve(__dirname,'../..'),draft=JSON.parse(fs.readFileSync(file,'utf8'));
 if(draft.reviewed!==true||!draft.context||!Array.isArray(draft.context.cards)||draft.context.cards.length<2||draft.context.cards.length>4||draft.context.cards.some(c=>typeof c!=='string'||!c.trim()))throw Error('A reviewed scenario with 2–4 confirmed card names is required');
 if(!['cast','present','enter','other','gainLife','putCounters','beginEndStep','combat','drawCards'].includes(draft.context.event))throw Error('Scenario event is missing or invalid');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/oracle/index.json'),'utf8')),cache=new Map();
 function card(name){const entry=manifest.cards.find(([n])=>n.toLowerCase()===name.toLowerCase());if(!entry)throw Error('Card absent from supplied Oracle snapshot: '+name);
  const id=entry[1];if(!cache.has(id)){const bytes=fs.readFileSync(path.join(root,'data/oracle',id+'.json.gz'));if(crypto.createHash('sha256').update(bytes).digest('hex')!==manifest.shards[id].sha256)throw Error('Oracle shard integrity failed');cache.set(id,JSON.parse(zlib.gunzipSync(bytes)))}
  return cache.get(id).find(c=>c.name.toLowerCase()===name.toLowerCase());
 }
 const context={console,fetch:async url=>{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!=='api.scryfall.com'||parsed.pathname!=='/cards/named')throw Error('Only local Oracle lookup transport is available');return {ok:true,json:async()=>card(parsed.searchParams.get('exact'))}}};context.window=context;vm.createContext(context);
 const html=fs.readFileSync(path.join(root,'context.html'),'utf8');
 for(const [,file]of html.matchAll(/<script src="\.\/([^"?]+\.js)"><\/script>/g)){if(file==='context-ui.js')break;vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file,timeout:3000})}
 const observation=await context.JudgeGuidedBridge.evaluate(draft.context);
 return {case_id:draft.id||null,reviewed_input:true,creator_claim_verified:false,observation,warning:'An engine observation is not an independently verified expected ruling. Missing facts must not be inferred from ASR.'};
}
module.exports={probe};
if(require.main===module){if(process.argv.length!==3){process.stderr.write('Usage: node scripts/media/probe-reviewed-case.cjs reviewed-scenario.json\n');process.exitCode=2;}else probe(process.argv[2]).then(result=>process.stdout.write(JSON.stringify(result,null,2)+'\n')).catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1})}
