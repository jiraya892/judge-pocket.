/* Judge Pocket: conservative continuous-effects interpreter (partial CR 613).
   Data-driven patterns, not named-card pair lookups. */
(function(root){
'use strict';
const textOf=c=>[c.oracle_text,...(c.card_faces||[]).map(f=>f.oracle_text)].filter(Boolean).join('\n');
function extract(card){
 const text=textOf(card), effects=[];
 if(/non(?:token|-token) creatures you control are Forest lands in addition to their other types/i.test(text))
  effects.push({kind:'addForest',layer:4,scope:'nontoken-creatures-you-control',source:card.name});
 if(/nonbasic lands are Mountains/i.test(text))
  effects.push({kind:'nonbasicMountain',layer:4,scope:'nonbasic-lands',source:card.name});
 return effects;
}
function analyze(cards){
 const effects=cards.flatMap(c=>extract(c));
 const forest=effects.filter(e=>e.kind==='addForest');
 const mountain=effects.filter(e=>e.kind==='nonbasicMountain');
 if(!forest.length&&!mountain.length)return {supported:false,effects:[]};
 if(!forest.length||!mountain.length)return {supported:false,effects,reason:'Rilevato un effetto continuo, ma questa combinazione non è ancora simulabile.'};
 return {supported:false,effects,reason:'Sono presenti effetti continui di modifica dei tipi di terra nello stesso layer (613.1d). Per determinare il risultato occorre implementare le dipendenze (613.8), le abilità rimosse dalle terre che diventano tipi di terra base (305.7) e lo stato di gioco. Il motore non fornisce ancora un verdetto automatico.'};
}
root.JudgeContinuous={extract,analyze};
})(typeof window!=='undefined'?window:globalThis);
