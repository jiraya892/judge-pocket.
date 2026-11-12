/* Chapter 15: browser-only live acquisition diagnostic, never an import authorization. */
(function(root){'use strict';
function summary(result){
 const ok=result?.supported===true;
 return {status:ok?'review-required':'unsupported',stage:result?.stage||'transport',edition:ok?result.edition:null,ruleCount:ok?result.ruleCount:0,localDigest:ok?result.localDigest:null,reason:ok?'Documento estratto; provenienza non autenticata':String(result?.reason||'Acquisizione non disponibile'),authenticated:false,importable:false,officialDigestVerified:false};
}
async function probe(fetcher,edition,minimum=1000){
 if(typeof fetcher!=='function')return summary({reason:'Fetch non disponibile'});
 try{
  const result=await root.JudgeOfficialAcquisitionPipeline?.acquireAndReview(fetcher,edition,minimum);
  return summary(result);
 }catch(e){return summary({reason:'Errore nel controllo del documento; possibile restrizione CORS o formato inatteso'});}
}
root.JudgeLiveRulesProbe={probe,summary};
})(typeof window!=='undefined'?window:globalThis);
