/* Chapter 11: conservative evidence-gated result classification. */
(function(root){'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
function classify(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {status:'unsupported',reason:'Risultato assente o non valido',reasonCodes:['INVALID_RESULT']};
 const codes=Array.isArray(input.reasonCodes)?input.reasonCodes.filter(x=>typeof x==='string'&&x.trim()):[];
 const warnings=Array.isArray(input.warnings)?input.warnings.filter(x=>typeof x==='string'): [];
 const missing=Array.isArray(input.missingFacts)?input.missingFacts.filter(x=>typeof x==='string'&&x.trim()):[];
 const unsupported=Array.isArray(input.unsupportedLines)?input.unsupportedLines:[];
 const evidence=input.evidence;
 const coverage=evidence&&typeof evidence==='object'&&evidence.oracleVerified===true&&evidence.rulesVerified===true&&evidence.scenarioVerified===true&&evidence.stateActionsVerified===true;
 const hasVerdict=typeof input.verdict==='string'&&input.verdict.trim().length>0;
 const blockers=codes.length||unsupported.length||missing.length||warnings.length||input.supported===false||input.status==='unsupported'||input.status==='not-evaluated';
 const diagnostics={reasonCodes:codes,warnings,missingFacts:missing,unsupportedLines:unsupported};
 if(blockers){
  const hasPartial=input.supported!==false&&(input.status==='partial'||input.status==='ready'||Array.isArray(input.preview)&&input.preview.length>0);
  return {...diagnostics,status:hasPartial?'partial':'unsupported',verdict:null,reason:missing.length?'Informazioni necessarie mancanti':unsupported.length?'Copertura Oracle incompleta':codes.length?codes.join(' | '):warnings.length?'Avvertenze non risolte':'Interazione non supportata'};
 }
 if(coverage&&hasVerdict&&input.supported===true&&input.status==='verified')return {...diagnostics,status:'verified',verdict:input.verdict.trim(),reason:null};
 if(input.status==='partial'||Array.isArray(input.preview)&&input.preview.length>0)return {...diagnostics,status:'partial',verdict:null,reason:'Calcolo parziale: nessun verdetto verificato'};
 return {...diagnostics,status:'unsupported',verdict:null,reason:'Prove insufficienti per un verdetto'};
}
function fromCoordinator(outcome){
 if(!outcome||outcome.supported!==true)return classify({supported:false,reasonCodes:[outcome?.reason||'COORDINATOR_UNAVAILABLE']});
 const results=Array.isArray(outcome.results)?outcome.results:[];
 const unsupported=results.filter(r=>r?.status==='unsupported'||r?.status==='not-evaluated');
 return classify({supported:unsupported.length===0,status:unsupported.length?'unsupported':'partial',preview:results,warnings:outcome.warnings||[],reasonCodes:unsupported.map(r=>r.reason||'OBJECT_UNSUPPORTED')});
}
root.JudgeOutcomeTrust={classify,fromCoordinator};
})(typeof window!=='undefined'?window:globalThis);
