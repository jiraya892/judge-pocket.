#!/usr/bin/env node
'use strict';
// Chapter 15/4: offline, fail-closed evidence gate. This never authenticates a publisher.
const fs=require('node:fs');
const path=require('node:path');
function evaluate(report, evidence) {
  const problems=[];
  if (!report || report.status!=='review-required') problems.push('Acquisition/structure not accepted');
  if (report?.edition!==report?.expectedEdition) problems.push('Edition mismatch');
  if (!Number.isInteger(report?.ruleCount)||report.ruleCount<1000||report.hasGlossary!==true||report.hasCredits!==true||!Array.isArray(report.missingRules)||report.missingRules.length) problems.push('Structure incomplete');
  const sha=report?.localTextSha256;
  if(typeof sha!=='string'||!/^[0-9a-f]{64}$/.test(sha)) problems.push('Missing acquisition SHA-256');
  if(!evidence || evidence.publisher!=='Wizards of the Coast'||evidence.edition!==report?.edition||!/^https:\/\/media\.wizards\.com\//.test(evidence.url||'')) problems.push('Publisher evidence incomplete');
  if(evidence?.url!==report?.url) problems.push('Source URL mismatch');
  if(!/^[0-9a-f]{64}$/.test(evidence?.sha256||'')||evidence.sha256!==sha) problems.push('Digest mismatch');
  if(evidence?.verificationMethod!=='independent-publisher-signed-digest') problems.push('No independently authenticated publisher signature');
  // An assertion in a JSON file cannot prove a cryptographic signature.
  problems.push('Cryptographic publisher signature validation not implemented');
  return {status:'review-required',authenticated:false,officialDigestVerified:false,importable:false,checksPassed:false,problems};
}
if(require.main===module){
 const reportPath=process.argv[2]||'test-reports/official/diagnostic.json';
 const evidencePath=process.argv[3];
 let result;
 try {
  const report=JSON.parse(fs.readFileSync(path.resolve(reportPath),'utf8'));
  const evidence=evidencePath?JSON.parse(fs.readFileSync(path.resolve(evidencePath),'utf8')):null;
  result=evaluate(report,evidence);
 }catch(err){result={status:'unsupported',authenticated:false,officialDigestVerified:false,importable:false,problems:[String(err.message||err)]};}
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 process.exitCode=result.problems.length?1:0;
}
module.exports={evaluate};
