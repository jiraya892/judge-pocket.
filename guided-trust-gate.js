/* Chapter 13: fail-closed presentation boundary for guided Judge outcomes. */
(function(root){'use strict';
function guard(output){
 const source=root.JudgeBuiltInTrust?.status();
 // No authenticated official publisher trust chain is provisioned yet.
 const trusted=false;
 const diagnostic=output?.diagnostic&&typeof output.diagnostic==='object'?output.diagnostic:{};
 const blocked=output?.status==='verified'||output?.verdict!=null;
 const reasons=Array.isArray(diagnostic.reasonCodes)?diagnostic.reasonCodes.filter(x=>typeof x==='string'):[];
 if(!trusted||blocked){return {status:output?.status==='partial'?'partial':'unsupported',title:output?.status==='partial'?'Risultato parziale — non è un verdetto':'Interazione non ancora supportata',reason:typeof output?.reason==='string'&&output.status!=='verified'?output.reason:'Impossibile attestare un verdetto senza una fonte ufficiale autenticata e prove complete.',verdict:null,diagnostic:{...diagnostic,reasonCodes:[...new Set([...reasons,'OFFICIAL_SOURCE_UNVERIFIED'])],officialSourceAuthenticated:false}}}
 return {status:output.status,title:output.title,reason:output.reason,verdict:null,diagnostic:{...diagnostic,officialSourceAuthenticated:true}};
}
root.JudgeGuidedTrustGate={guard};
})(typeof window!=='undefined'?window:globalThis);
