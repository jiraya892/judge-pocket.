/* Chapter 13: no official trusted pins are shipped; fail closed by default. */
(function(root){'use strict';
function secureImport(review,manifest,authority){
 const auth=root.JudgePinAuthority?.authorize(authority,manifest);
 if(!auth?.supported)return {supported:false,reason:auth?.reason||'Verifica della provenienza non disponibile',authenticated:false};
 const imported=root.JudgeRulesImportFlow?.importReviewed(review,manifest,[auth.pin]);
 if(!imported?.supported)return {supported:false,reason:imported?.reason||'Importazione rifiutata',authenticated:false};
 return {...imported,authenticated:false,integrityVerified:true,sourceIdentityVerified:false,reason:'Integrità verificata rispetto al pin approvato; identità della fonte non autenticata crittograficamente'};
}
function judgeGate(result,importState){
 if(!result||typeof result!=='object')return {status:'unsupported',verdict:null,reason:'Esito non valido'};
 if(importState?.integrityVerified!==true||importState?.sourceIdentityVerified!==true||importState?.authenticated!==true)return {status:'unsupported',verdict:null,reason:'Fonte delle regole non autenticata'};
 return {status:'partial',verdict:null,reason:'Fonte verificata; verdetto non autorizzato senza prove del motore'};
}
root.JudgeSecureRulesImport={secureImport,judgeGate};
})(typeof window!=='undefined'?window:globalThis);
