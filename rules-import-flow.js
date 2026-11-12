/* Chapter 12: final conservative review gate; a reviewed digest is not proof of publisher identity. */
(function(root){'use strict';
function review(text,url,edition,policy,previous){
 const staged=root.JudgeRulesAcquisition?.prepare(text,url,edition,policy?.minRules);
 if(!staged?.supported)return {supported:false,stage:'extraction',reason:staged?.reason||'Estrazione non disponibile',importable:false};
 const checked=root.JudgeCorpusVersionReview?.check(staged,policy,previous);
 if(!checked?.supported)return {supported:false,stage:'review',reason:checked?.reason||'Verifica non disponibile',importable:false};
 return {supported:true,stage:'review',readyForReview:checked.readyForReview,importable:false,authenticated:false,edition:staged.edition,digest:staged.digest,sourceUrl:staged.sourceUrl,coverage:checked.coverage,version:checked.version,delta:checked.delta,reason:checked.reason,policy:{minRules:policy.minRules,requiredRules:Array.isArray(policy.requiredRules)?[...policy.requiredRules]:[],requiredSections:Array.isArray(policy.requiredSections)?[...policy.requiredSections]:[]},previous:previous||null,staged};
}
function importReviewed(report,manifest,pins){
 if(!report?.supported||report.readyForReview!==true||report.authenticated!==false||report.importable!==false||!report.staged)return {supported:false,reason:'Revisione incompleta o incoerente'};
 const staged=report.staged;
 if(report.digest!==staged.digest||report.edition!==staged.edition)return {supported:false,reason:'Report alterato'};
 const coverage=root.JudgeCorpusVersionReview?.check(staged,report.policy,report.previous);
 if(!coverage?.supported||!coverage.readyForReview)return {supported:false,reason:'Copertura non valida'};
 return root.JudgeRulesAcquisition?.commit(staged,manifest,pins)||{supported:false,reason:'Importazione non disponibile'};
}
root.JudgeRulesImportFlow={review,importReviewed};
})(typeof window!=='undefined'?window:globalThis);
