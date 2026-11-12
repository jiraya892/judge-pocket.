/* Chapter 11: safe, human-readable, fail-closed explanation model. */
(function(root){'use strict';
function present(output){
 const diag=output?.diagnostic&&typeof output.diagnostic==='object'?output.diagnostic:{};
 const audit=diag.evidenceAudit&&typeof diag.evidenceAudit==='object'?diag.evidenceAudit:null;
 const trust=diag.outcomeTrust&&typeof diag.outcomeTrust==='object'?diag.outcomeTrust:null;
 const codes=Array.isArray(diag.reasonCodes)?diag.reasonCodes.filter(x=>typeof x==='string').slice(0,30):[];
 const missing=Array.isArray(diag.missingSupport)?diag.missingSupport.filter(x=>typeof x==='string').slice(0,30):[];
 const warnings=Array.isArray(diag.warnings)?diag.warnings.filter(x=>typeof x==='string').slice(0,30):[];
 const verified=output?.status==='verified'&&trust?.status==='verified'&&audit?.verdictAllowed===true&&root.JudgeLocalRulesSource?.status()?.available===true;
 const partial=output?.status==='partial'||trust?.status==='partial'||audit?.status==='partial';
 const status=verified?'verified':partial?'partial':'unsupported';
 return {status,title:status==='verified'?'Verdetto verificato':status==='partial'?'Risultato parziale — non è un verdetto':'Interazione non ancora supportata',reason:typeof output?.reason==='string'?output.reason:'Il motore non dispone di prove sufficienti.',codes,missing,warnings,ruleSource:root.JudgeLocalRulesSource?.status()?.available?'Testo locale caricato (origine non autenticata)':'Testo ufficiale delle regole non disponibile localmente',references:[],verdict:verified&&typeof output?.verdict==='string'?output.verdict:null};
}
function lines(model){if(!model||typeof model!=='object')return ['Esito non disponibile'];return [model.title,model.reason,model.ruleSource,...(model.missing.length?['Funzionalità mancanti: '+model.missing.join(', ')]:[]),...(model.codes.length?['Codici diagnostici: '+model.codes.join(', ')]:[]),...(model.warnings.length?['Avvertenze: '+model.warnings.join('; ')]:[])];}
root.JudgeExplanationView={present,lines};
})(typeof window!=='undefined'?window:globalThis);
