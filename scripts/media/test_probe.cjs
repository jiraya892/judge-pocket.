'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {probe}=require('./probe-reviewed-case.cjs');
(async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'judge-media-case-'));const file=path.join(folder,'review.json');
 try{
  fs.writeFileSync(file,JSON.stringify({reviewed:false,context:{cards:['Shock','Silver Knight'],event:'cast'}}));
  await assert.rejects(probe(file),/reviewed scenario/);
  fs.writeFileSync(file,JSON.stringify({id:'test-only-source',reviewed:true,creator_claim_verified:true,expected_engine_result:'verified',context:{cards:['Shock','Silver Knight'],event:'cast',casting:'Shock',castingIndex:0,board:'complete'}}));
  const result=await probe(file);assert.equal(result.creator_claim_verified,false);assert.equal(result.observation.status,'partial');assert.equal(result.observation.outcome.events[0].type,'castingBlocked');assert.equal(result.observation.diagnostic.sourceAuthenticationVerified,false);
  fs.writeFileSync(file,JSON.stringify({reviewed:true,context:{cards:['process.exit(99)','Silver Knight'],event:'cast',casting:'process.exit(99)',castingIndex:0,board:'complete'}}));
  const invalid=await probe(file);assert.equal(invalid.observation.status,'unsupported');
  console.log('3/3 reviewed-case probe checks passed (actual rules engine; no media or model download)');
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
