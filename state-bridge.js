/* 2A: state editor delegates to the same coordinator as guided mode. */
(function(root){'use strict';
function evaluate(input){
 if(!root.JudgeCoordinator)return {supported:false,reason:'Coordinatore non caricato'};
 if(!input||!Array.isArray(input.objects)||!Array.isArray(input.effects))return {supported:false,reason:'Stato non valido'};
 const normalized={...input,players:input.players||[{id:'A',life:40},{id:'B',life:40}],objects:input.objects.map(o=>({...o,abilities:o.abilities||[],subtypes:o.subtypes||[],supertypes:o.supertypes||[]}))};
 const result=root.JudgeCoordinator.evaluate(normalized);
 if(result.supported)result.warnings.push('Le caratteristiche inserite manualmente non sono state verificate con Oracle.');
 return result;
}
root.JudgeStateBridge={evaluate};
})(typeof window!=='undefined'?window:globalThis);