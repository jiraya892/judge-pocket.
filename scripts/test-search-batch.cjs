'use strict';
// A PASS records a real capability gap; it does not verify the reported ruling.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {probe}=require('./media/probe-reviewed-case.cjs');
(async()=>{const folder=fs.mkdtempSync(path.join(os.tmpdir(),'judge-discussion-'));let n=0;try{for(const row of JSON.parse(fs.readFileSync('case-studies/search-batch-results.json'))){const file=path.join(folder,'case.json');fs.writeFileSync(file,JSON.stringify({reviewed:true,context:row.constructed_context}));const r=await probe(file);assert.equal(r.observation.status,'unsupported');assert.equal(r.creator_claim_verified,false);n++;console.log('PASS recorded unsupported boundary: '+row.cards.join(' + '));}console.log(n+'/'+n+' discovered capability-gap checks passed');}finally{fs.rmSync(folder,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
