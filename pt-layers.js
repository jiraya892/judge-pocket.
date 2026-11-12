/* 2E: CR 613.4 P/T pipeline: 7a characteristic definitions, 7b setters,
   7c modifiers then counters, 7d switches. Fail closed on unknown definitions. */
(function(root){'use strict';
const integer=n=>Number.isSafeInteger(n);
function evaluate(object,board,ordered){
 if(!object||!Array.isArray(board)||!Array.isArray(ordered))return {supported:false,reason:'Input P/T incompleto'};
 const effects=ordered.filter(e=>['7a','7b','7c','7d'].includes(String(e.layer)));
 if(effects.some(e=>!['definePT','setPT','modifyPT','switchPT'].includes(e.kind)))return {supported:false,reason:'Operazione P/T non riconosciuta'};
 if(effects.some(e=>e.kind==='definePT'&&e.layer!=='7a'||e.kind==='setPT'&&e.layer!=='7b'||e.kind==='modifyPT'&&e.layer!=='7c'||e.kind==='switchPT'&&e.layer!=='7d'))return {supported:false,reason:'Operazione P/T nel sottolayer errato'};
 const definition=object.ptDefinition;
 let power=object.power??null,toughness=object.toughness??null;
 if(definition){
  if(!definition.abilityId||!Array.isArray(object.abilities)||!object.abilities.some(a=>a&&a.id===definition.abilityId))return {supported:false,reason:'Abilità definitoria P/T non presente'};
  if(definition.kind==='landCount'){
   const n=board.filter(o=>o.controller===object.controller&&o.types.includes('land')).length;
   power=n;toughness=n;
  }else return {supported:false,reason:'Definizione dinamica P/T non supportata'};
 }
 const layers=['7a','7b','7c','7d'];
 for(const layer of layers){
  for(const e of effects.filter(x=>String(x.layer)===layer)){
   if(e.kind==='definePT'||e.kind==='setPT'){
    if(!integer(e.power)||!integer(e.toughness))return {supported:false,reason:'Valori P/T non interi'};
    power=e.power;toughness=e.toughness;
   }else if(e.kind==='modifyPT'){
    if(!integer(e.power)||!integer(e.toughness)||!integer(power)||!integer(toughness))return {supported:false,reason:'Modificatore P/T non calcolabile'};
    power+=e.power;toughness+=e.toughness;
   }else if(e.kind==='switchPT'){
    if(!integer(power)||!integer(toughness))return {supported:false,reason:'Inversione P/T non calcolabile'};
    [power,toughness]=[toughness,power];
   }
  }
  if(layer==='7c'){
   const counters=object.counters||{};
   const plus=counters['+1/+1']??0,minus=counters['-1/-1']??0;
   if(!integer(plus)||!integer(minus)||plus<0||minus<0)return {supported:false,reason:'Segnalini P/T invalidi'};
   if(plus||minus){
    if(!integer(power)||!integer(toughness))return {supported:false,reason:'P/T non definita prima dei segnalini'};
    power+=plus-minus;toughness+=plus-minus;
   }
  }
 }
 return {supported:true,power,toughness,coverage:'pt-7a-7d'};
}
root.JudgePTLayers={evaluate};
})(typeof window!=='undefined'?window:globalThis);