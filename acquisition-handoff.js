/* Chapter 14: distinguish browser CORS failures from server-controlled acquisition. */
(function(root){'use strict';
function classify(result,environment){
 if(result?.supported)return {supported:true,mode:environment==='server'?'server-controlled':'browser',authenticated:false,readyForReview:true};
 const reason=typeof result?.reason==='string'?result.reason:'Acquisizione non riuscita';
 const cors=/CORS|non raggiungibile|lettura/i.test(reason)&&environment==='browser';
 return {supported:false,mode:environment==='server'?'server-controlled':'browser',corsPossible:cors,retryServerSide:cors,reason,authenticated:false};
}
function validateHandoff(handoff){
 if(!handoff||typeof handoff!=='object'||handoff.authenticated!==false||handoff.officialDigestVerified!==false||handoff.importable!==false||handoff.stage!=='review-required'||!/^[0-9a-f]{64}$/i.test(handoff.localDigest||''))return {supported:false,reason:'Rapporto di acquisizione non valido'};
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(handoff.edition||'')||!Number.isSafeInteger(handoff.ruleCount)||handoff.ruleCount<1000)return {supported:false,reason:'Edizione o copertura non valida'};
 return {supported:true,authenticated:false,importable:false,reason:'Report locale coerente; provenienza non autenticata'};
}
root.JudgeAcquisitionHandoff={classify,validateHandoff};
})(typeof window!=='undefined'?window:globalThis);
