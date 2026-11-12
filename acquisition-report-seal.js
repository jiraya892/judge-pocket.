/* Chapter 14: deterministic review reports, never a publisher signature. */
(function(root){'use strict';
const allowed=['stage','edition','url','ruleCount','localDigest','authenticated','sourceIdentityVerified','officialDigestVerified','importable'];
function validate(report){
 if(!report||typeof report!=='object'||Array.isArray(report))return {supported:false,reason:'Report assente'};
 if(report.stage!=='review-required'||report.authenticated!==false||report.sourceIdentityVerified!==false||report.officialDigestVerified!==false||report.importable!==false)return {supported:false,reason:'Attestazione non valida'};
 if(!/^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(report.edition||'')||!Number.isSafeInteger(report.ruleCount)||report.ruleCount<1000)return {supported:false,reason:'Versione o copertura non valida'};
 if(!/^[0-9a-f]{64}$/i.test(report.localDigest||''))return {supported:false,reason:'Digest locale non valido'};
 if(typeof report.url!=='string'||!/^https:\/\/media\.wizards\.com\/[^?#@]+\.txt(?:\?[^#@]*)?$/i.test(report.url))return {supported:false,reason:'URL documento non valido'};
 return {supported:true,authenticated:false,importable:false};
}
function fingerprint(report){
 const check=validate(report);if(!check.supported)return check;
 const normalized=Object.fromEntries(allowed.map(k=>[k,report[k]]));
 const digest=root.JudgeCorpusIntegrity?.sha256(JSON.stringify(normalized));
 if(typeof digest!=='string'||!/^[0-9a-f]{64}$/i.test(digest))return {supported:false,reason:'Impronta non disponibile'};
 return {supported:true,fingerprint:digest,authenticated:false,importable:false,scope:'local-report-consistency-only'};
}
function compare(first,second){
 const a=fingerprint(first),b=fingerprint(second);
 if(!a.supported||!b.supported)return {supported:false,reason:'Rapporto non valido'};
 return {supported:true,same:a.fingerprint===b.fingerprint,authenticated:false,importable:false};
}
root.JudgeAcquisitionReportSeal={validate,fingerprint,compare};
})(typeof window!=='undefined'?window:globalThis);
