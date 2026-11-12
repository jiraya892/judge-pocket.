/* Importing extracted text never grants source authenticity by itself. */
(function(root){'use strict';
function prepare(text,sourceUrl,expectedEdition,minRules){
 const origin=root.JudgeRulesTextParser?.source(sourceUrl);
 if(!origin?.supported)return {supported:false,reason:origin?.reason||'Origine non valida'};
 const parsed=root.JudgeRulesTextParser.parse(text,{expectedEdition,minRules});
 if(!parsed.supported)return parsed;
 const canonical=root.JudgeCorpusIntegrity?.canonical({entries:parsed.entries});
 if(!canonical)return {supported:false,reason:'Contenuto estratto non valido'};
 return {supported:true,edition:parsed.edition,sourceUrl:origin.url,entries:parsed.entries,digest:root.JudgeCorpusIntegrity.sha256(canonical),authentication:'not-authenticated',importable:false};
}
function commit(prepared,manifest,independentPins){
 if(!prepared?.supported||prepared.authentication!=='not-authenticated'||prepared.importable!==false)return {supported:false,reason:'Preparazione non valida'};
 if(!manifest||manifest.edition!==prepared.edition||manifest.sha256!==prepared.digest)return {supported:false,reason:'Versione o digest incoerente'};
 return root.JudgeCorpusImporter?.importCorpus({entries:prepared.entries},manifest,independentPins)||{supported:false,reason:'Importatore assente'};
}
root.JudgeRulesAcquisition={prepare,commit};
})(typeof window!=='undefined'?window:globalThis);
