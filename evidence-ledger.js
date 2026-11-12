/* Chapter 11: evidence ledger. Rule references are accepted only from explicit, validated source records. */
(function(root){'use strict';
const rule=/^(?:[1-9]\d{2})(?:\.\d{1,3}[a-z]?)?$/i;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
function reference(record){
 if(!record||typeof record!=='object'||Array.isArray(record))return {supported:false,reason:'Fonte non valida'};
 const id=typeof record.rule==='string'?record.rule.trim():'';
 if(!rule.test(id)||typeof record.source!=='string'||record.source.trim()!=='Comprehensive Rules'||typeof record.excerpt!=='string'||!record.excerpt.trim())return {supported:false,reason:'Riferimento non verificato'};
 const checked=root.JudgeLocalRulesSource?.verify(record);
 if(!checked?.supported)return {supported:false,reason:checked?.reason||'Corpus locale non disponibile'};
 return {supported:true,rule:id,source:'Comprehensive Rules',excerpt:checked.excerpt,edition:checked.edition,verifiedAgainstLocalText:true};
}
function explain(result,records){
 const trust=root.JudgeOutcomeTrust?.classify(result);
 if(!trust)return {status:'unsupported',reason:'Classificatore assente',references:[],verdict:null};
 const refs=Array.isArray(records)?records.map(reference).filter(x=>x.supported):[];
 const unique=[...new Map(refs.map(x=>[x.rule,x])).values()];
 const claims=Array.isArray(result?.claims)?result.claims.filter(x=>x&&typeof x.text==='string'&&x.text.trim()).map(x=>({text:x.text.trim(),rules:Array.isArray(x.rules)?x.rules.filter(id=>unique.some(r=>r.rule===id)):[]})):[];
 const ungrounded=claims.some(c=>c.rules.length===0);
 const status=trust.status==='verified'&&ungrounded?'partial':trust.status;
 return {status,verdict:status==='verified'?trust.verdict:null,reason:status==='partial'&&ungrounded?'Motivazione priva di riferimento verificato':trust.reason,references:unique,claims,reasonCodes:trust.reasonCodes||[],warnings:trust.warnings||[]};
}
function audit(result,records){const out=explain(result,records);return {status:out.status,verifiedReferences:out.references.length,ungroundedClaims:out.claims.filter(c=>!c.rules.length).length,verdictAllowed:out.status==='verified'&&!!out.verdict};}
root.JudgeEvidenceLedger={reference,explain,audit};
})(typeof window!=='undefined'?window:globalThis);
