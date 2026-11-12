/* Strict production boundary: caller-supplied pins cannot claim official provenance. */
(function(root){'use strict';
function verifyOfficial(prepared,manifest){
 if(!prepared?.supported||!manifest)return {supported:false,authenticated:false,reason:'Dati non validi'};
 const trust=root.JudgeBuiltInTrust?.verify(manifest);
 if(!trust?.supported)return {supported:false,authenticated:false,reason:'Impronta ufficiale non approvata nella build'};
 const check=root.JudgeCorpusIntegrity?.verify({entries:prepared.entries},manifest,[trust.pin]);
 if(!check?.supported)return {supported:false,authenticated:false,reason:check?.reason||'Integrità non verificata'};
 return {supported:true,authenticated:false,integrityVerified:true,sourceIdentityVerified:false,reason:'Digest approvato, autenticazione del produttore non attestata'};
}
function safeImport(report,manifest){
 const approved=verifyOfficial(report?.staged,manifest);
 if(!approved.supported)return approved;
 const result=root.JudgeRulesImportFlow?.importReviewed(report,manifest,[root.JudgeBuiltInTrust.verify(manifest).pin]);
 return result?.supported?{...result,authenticated:false,sourceIdentityVerified:false,integrityVerified:true}:result||{supported:false,reason:'Importazione non disponibile'};
}
root.JudgeOfficialImportBoundary={verifyOfficial,safeImport};
})(typeof window!=='undefined'?window:globalThis);
