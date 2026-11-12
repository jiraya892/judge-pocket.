/* Conservative explicit layer operations; dependencies are intentionally unsupported. */
(function(root){
'use strict';
const ordered=['1a','1b','2','3','4','5','6','7a','7b','7c','7d'];
const rank=l=>ordered.indexOf(String(l));
function evaluate(base,effects=[]){
 if(!base||!Array.isArray(base.types)||!Array.isArray(effects))return {supported:false,reason:'Input non valido'};
 if(effects.some(e=>!e||rank(e.layer)<0||e.dependency||e.kind==='nonbasicMountain'||e.kind==='addForest'))
  return {supported:false,reason:'Dipendenza o modifica di tipo terra non supportata: verifica CR 613 e 305.7'};
 const supported=new Set(['addType','removeType','setColor','addAbility','removeAbility','setPT','modifyPT']);
 if(effects.some(e=>!supported.has(e.kind)))return {supported:false,reason:'Operazione layer sconosciuta'};
 if(effects.some(e=>!Number.isSafeInteger(e.timestamp)))return {supported:false,reason:'Timestamp esplicito necessario'};
 if(effects.some(e=>(e.kind==='addType'||e.kind==='removeType')&&e.layer!=='4'))return {supported:false,reason:'Tipo fuori layer 4'};
 if(effects.some(e=>e.kind==='setColor'&&e.layer!=='5'))return {supported:false,reason:'Colore fuori layer 5'};
 if(effects.some(e=>(e.kind==='addAbility'||e.kind==='removeAbility')&&e.layer!=='6'))return {supported:false,reason:'Abilità fuori layer 6'};
 if(effects.some(e=>e.kind==='setPT'&&e.layer!=='7b'||e.kind==='modifyPT'&&e.layer!=='7c'))return {supported:false,reason:'Forza/costituzione fuori sottolayer'};
 if(effects.some(e=>e.kind==='modifyPT'&&(!Number.isFinite(e.power)||!Number.isFinite(e.toughness))))return {supported:false,reason:'Modifica P/T invalida'};
 if(effects.some(e=>e.kind==='setPT'&&(!Number.isFinite(e.power)||!Number.isFinite(e.toughness))))return {supported:false,reason:'Valore P/T invalido'};
 const state={types:[...base.types],colors:[...(base.colors||[])],abilities:[...(base.abilities||[])],power:base.power??null,toughness:base.toughness??null};
 const sorted=effects.map((e,i)=>({...e,_index:i})).sort((a,b)=>rank(a.layer)-rank(b.layer)||a.timestamp-b.timestamp||a._index-b._index);
 for(const e of sorted){
  if(e.kind==='addType'&&!state.types.includes(e.value))state.types.push(e.value);
  if(e.kind==='removeType')state.types=state.types.filter(x=>x!==e.value);
  if(e.kind==='setColor')state.colors=[...e.values];
  if(e.kind==='addAbility'&&!state.abilities.includes(e.value))state.abilities.push(e.value);
  if(e.kind==='removeAbility')state.abilities=state.abilities.filter(x=>x!==e.value);
  if(e.kind==='setPT'){state.power=e.power;state.toughness=e.toughness}
  if(e.kind==='modifyPT'){if(state.power===null||state.toughness===null)return {supported:false,reason:'P/T base non determinata'};state.power+=e.power;state.toughness+=e.toughness}
 }
 return {supported:true,state,order:sorted.map(e=>({layer:e.layer,kind:e.kind,timestamp:e.timestamp}))};
}
root.JudgeLayers={ordered,evaluate};
})(typeof window!=='undefined'?window:globalThis);
