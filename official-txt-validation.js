/* Chapter 14: completeness heuristics for extracted official TXT; never authentication. */
(function(root){'use strict';
const ids=['100.1','101.1','613.1','614.1','615.1','704.1','903.1'];
function inspect(text,parsed,minimum=1000){
 if(typeof text!=='string'||!parsed?.supported||!Array.isArray(parsed.entries))return {supported:false,reason:'Estrazione assente'};
 const lines=text.replace(/\r\n?/g,'\n').split('\n');
 const intro=lines.findIndex(x=>/^100\.1\.\s/.test(x.trim()));
 const glossary=lines.findIndex((x,i)=>i>intro&&/^Glossary\s*$/.test(x.trim()));
 const credits=lines.findIndex((x,i)=>i>intro&&/^Credits\s*$/.test(x.trim()));
 const seen=new Set(parsed.entries.map(x=>x.id)),missing=ids.filter(x=>!seen.has(x));
 const order=parsed.entries.every((e,i,a)=>i===0||Number(e.id.slice(0,3))>=Number(a[i-1].id.slice(0,3)));
 const duplicate=seen.size!==parsed.entries.length;
 const valid=intro>=0&&glossary>intro&&credits>glossary&&missing.length===0&&order&&!duplicate&&parsed.entries.length>=minimum;
 return {supported:true,structurallyComplete:valid,authenticated:false,missingRules:missing,hasGlossary:glossary>intro,hasCredits:credits>glossary,orderedSections:order,duplicates:duplicate,count:parsed.entries.length,minimum};
}
function prepareAcquired(acquired,expectedEdition,minimum=1000){
 if(!acquired?.supported||acquired.authenticated!==false||acquired.digestVerified!==false)return {supported:false,reason:'Trasporto non verificato o dichiarazione di fiducia non valida'};
 const parsed=root.JudgeRulesTextParser?.parse(acquired.text,{expectedEdition,minRules:minimum});
 if(!parsed?.supported)return {supported:false,reason:parsed?.reason||'Parsing non disponibile'};
 const coverage=inspect(acquired.text,parsed,minimum);
 return {supported:true,structurallyComplete:coverage.structurallyComplete,authenticated:false,digestVerified:false,edition:parsed.edition,url:acquired.url,coverage,entries:parsed.entries};
}
root.JudgeOfficialTxtValidation={inspect,prepareAcquired};
})(typeof window!=='undefined'?window:globalThis);
