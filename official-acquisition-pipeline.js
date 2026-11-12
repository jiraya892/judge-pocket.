/* Chapter 14: a reproducible transport-neutral acquisition report. */
(function(root){'use strict';
async function acquireAndReview(fetcher,expectedEdition,minimum=1000){
 const fetched=await root.JudgeOfficialTxtAcquisition?.acquire(fetcher);
 if(!fetched?.supported)return {supported:false,stage:'transport',reason:fetched?.reason||'Acquisizione non disponibile',authenticated:false};
 const reviewed=root.JudgeOfficialTxtValidation?.prepareAcquired(fetched,expectedEdition,minimum);
 if(!reviewed?.supported)return {supported:false,stage:'extraction',reason:reviewed?.reason||'Estrazione non valida',authenticated:false};
 if(!reviewed.structurallyComplete)return {supported:false,stage:'coverage',reason:'Copertura strutturale incompleta',coverage:reviewed.coverage,authenticated:false};
 const digest=root.JudgeCorpusIntegrity?.sha256(root.JudgeCorpusIntegrity.canonical({entries:reviewed.entries}));
 if(typeof digest!=='string'||!/^[0-9a-f]{64}$/i.test(digest))return {supported:false,stage:'digest',reason:'Digest non disponibile',authenticated:false};
 return {supported:true,stage:'review-required',edition:reviewed.edition,url:reviewed.url,ruleCount:reviewed.entries.length,localDigest:digest,authenticated:false,sourceIdentityVerified:false,officialDigestVerified:false,importable:false,coverage:reviewed.coverage};
}
root.JudgeOfficialAcquisitionPipeline={acquireAndReview};
})(typeof window!=='undefined'?window:globalThis);
