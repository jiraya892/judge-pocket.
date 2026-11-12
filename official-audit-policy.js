/* Chapter 15: conservative checks for read-only official audit reports. */
(function(root){'use strict';
function evaluateReport(report){
 if(!report||typeof report!=='object'||Array.isArray(report))return {supported:false,reason:'Report mancante'};
 const safe=report.authenticated===false&&report.officialDigestVerified===false&&report.importable===false&&report.sourceIdentityVerified===false;
 if(!safe)return {supported:false,reason:'Attestazione non valida'};
 if(report.status!=='review-required')return {supported:false,reason:'Acquisizione incompleta'};
 if(report.edition!=='2026-11-06'||!Number.isSafeInteger(report.ruleCount)||report.ruleCount<1000)return {supported:false,reason:'Edizione o copertura non valida'};
 if(report.hasGlossary!==true||report.hasCredits!==true||!Array.isArray(report.missingRules)||report.missingRules.length!==0)return {supported:false,reason:'Struttura incompleta'};
 if(!/^[a-f0-9]{64}$/i.test(report.localTextSha256||''))return {supported:false,reason:'Impronta locale non valida'};
 if(typeof report.url!=='string'||!/^https:\/\/media\.wizards\.com\/[^?#@]+\.txt(?:\?[^#@]*)?$/i.test(report.url))return {supported:false,reason:'URL non valido'};
 return {supported:true,authenticated:false,importable:false,reason:'Diagnostica coerente; autenticazione indipendente assente'};
}
root.JudgeOfficialAuditPolicy={evaluateReport};
})(typeof window!=='undefined'?window:globalThis);
