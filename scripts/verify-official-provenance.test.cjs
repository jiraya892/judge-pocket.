'use strict';
const assert=require('node:assert/strict');
const {evaluate}=require('./verify-official-provenance.cjs');
const sha='a'.repeat(64);
const report={status:'review-required',edition:'2026-11-06',expectedEdition:'2026-11-06',ruleCount:3182,hasGlossary:true,hasCredits:true,missingRules:[],localTextSha256:sha,url:'https://media.wizards.com/2026/example.txt'};
const evidence={publisher:'Wizards of the Coast',edition:report.edition,url:report.url,sha256:sha,verificationMethod:'independent-publisher-signed-digest'};
for(const [name,r,e] of [
 ['missing evidence',report,null],
 ['matching but unauthenticated assertion',report,evidence],
 ['digest mismatch',report,{...evidence,sha256:'b'.repeat(64)}],
 ['wrong edition',{...report,edition:'2026-01-01'},evidence],
 ['missing rule',{...report,missingRules:['613.1']},evidence],
 ['wrong URL',report,{...evidence,url:'https://example.org/rules.txt'}]
]) {
 const result=evaluate(r,e);
 assert.equal(result.authenticated,false,name);
 assert.equal(result.officialDigestVerified,false,name);
 assert.equal(result.importable,false,name);
 assert.ok(result.problems.length>0,name);
}
console.log('6/6 provenance fail-closed tests passed');
