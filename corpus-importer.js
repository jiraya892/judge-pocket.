/* An explicit, independently reviewed pin is required; no trusted official pins are bundled. */
(function(root){'use strict';
function importCorpus(data,manifest,trustedPins){const check=root.JudgeCorpusIntegrity?.verify(data,manifest,trustedPins);if(!check?.supported)return {supported:false,reason:check?.reason||'Verifica integrità non disponibile'};if(!root.JudgeLocalRulesSource?.load)return {supported:false,reason:'Archivio regole non disponibile'};const loaded=root.JudgeLocalRulesSource.load({source:'Wizards of the Coast Comprehensive Rules',edition:check.edition,entries:data.entries});return loaded.supported?{supported:true,edition:check.edition,digest:check.digest,count:loaded.count,authentication:check.authentication}:loaded}
root.JudgeCorpusImporter={importCorpus};
})(typeof window!=='undefined'?window:globalThis);
