/* Conservative explicit layer operations; dependencies are intentionally unsupported. */
(function(root){
'use strict';
const ordered=['1a','1b','2','3','4','5','6','7a','7b','7c','7d'];
const rank=l=>ordered.indexOf(String(l));
function evaluate(base,effects=[],options={}){
 if(!base||!Array.isArray(base.types)||!Array.isArray(effects))return {supported:false,reason:'Input non valido'};
 if(effects.some(e=>!e||rank(e.layer)<0||e.kind==='nonbasicMountain'||e.kind==='addForest'))
  return {supported:false,reason:'Dipendenza o modifica di tipo terra non supportata: verifica CR 613 e 305.7'};
 const supported=new Set(['addType','removeType','setColor','addAbility','removeAbility','setPT','modifyPT','definePT','switchPT','addColor','removeColor','removeAllAbilities','copyCharacteristics','setController','replaceText']);
 if(effects.some(e=>!supported.has(e.kind)))return {supported:false,reason:'Operazione layer sconosciuta'};
 if(effects.some(e=>!Number.isSafeInteger(e.timestamp)))return {supported:false,reason:'Timestamp esplicito necessario'};
 if(effects.some(e=>e.kind==='copyCharacteristics'&&e.layer!=='1a'||e.kind==='setController'&&e.layer!=='2'||e.kind==='replaceText'&&e.layer!=='3'))return {supported:false,reason:'Layer errato per copia, controllo o testo'};
 if(effects.some(e=>(e.kind==='addType'||e.kind==='removeType')&&e.layer!=='4'))return {supported:false,reason:'Tipo fuori layer 4'};
 if(effects.some(e=>['setColor','addColor','removeColor'].includes(e.kind)&&e.layer!=='5'))return {supported:false,reason:'Colore fuori layer 5'};
 if(effects.some(e=>['addAbility','removeAbility','removeAllAbilities'].includes(e.kind)&&e.layer!=='6'))return {supported:false,reason:'Abilità fuori layer 6'};
 if(effects.some(e=>e.kind==='definePT'&&e.layer!=='7a'||e.kind==='setPT'&&e.layer!=='7b'||e.kind==='modifyPT'&&e.layer!=='7c'||e.kind==='switchPT'&&e.layer!=='7d'))return {supported:false,reason:'Forza/costituzione fuori sottolayer'};
 if(effects.some(e=>e.kind==='modifyPT'&&(!Number.isFinite(e.power)||!Number.isFinite(e.toughness))))return {supported:false,reason:'Modifica P/T invalida'};
 if(effects.some(e=>['setPT','definePT'].includes(e.kind)&&(!Number.isFinite(e.power)||!Number.isFinite(e.toughness))))return {supported:false,reason:'Valore P/T invalido'};
 const state={controller:base.controller??null,text:base.text??'',types:[...base.types],colors:[...(base.colors||[])],abilities:[...(base.abilities||[])],power:base.power??null,toughness:base.toughness??null};
 const tagged=effects.map((e,i)=>({...e,_index:i,_id:e.id||'effect-'+i}));
 if(new Set(tagged.map(e=>e._id)).size!==tagged.length)return {supported:false,reason:'Identificatori effetti duplicati'};
 if(tagged.some(e=>e.dependency&&!Array.isArray(e.dependency)))return {supported:false,reason:'Dipendenze esplicite non valide'};
 if(tagged.some(e=>(e.dependency||[]).some(id=>!tagged.some(x=>x._id===id&&x.layer===e.layer))))return {supported:false,reason:'Dipendenza assente o in layer diverso'};
 const sorted=[];
 if(options.preordered){sorted.push(...tagged)}else for(const layer of ordered){let pending=tagged.filter(e=>String(e.layer)===layer);
  while(pending.length){
   const ready=pending.filter(e=>(e.dependency||[]).every(id=>!pending.some(x=>x._id===id)));
   // CR 613.8: circular dependencies are ignored for ordering; timestamp breaks the tie.
   const pool=ready.length?ready:pending;
   pool.sort((a,b)=>a.timestamp-b.timestamp||a._index-b._index);
   const next=pool[0];sorted.push(next);pending=pending.filter(e=>e!==next);
  }
 }

 for(const e of sorted){
  if(e.kind==='copyCharacteristics'){
   if(!e.source||!Array.isArray(e.source.types))return {supported:false,reason:'Sorgente di copia non valida'};
   state.types=[...e.source.types];state.colors=[...(e.source.colors||[])];state.abilities=[...(e.source.abilities||[])];state.power=e.source.power??null;state.toughness=e.source.toughness??null;state.text=e.source.text??'';
  }
  if(e.kind==='setController'){if(typeof e.value!=='string'||!e.value)return {supported:false,reason:'Controllore non valido'};state.controller=e.value}
  if(e.kind==='replaceText'){
   if(typeof e.from!=='string'||!e.from||typeof e.to!=='string')return {supported:false,reason:'Sostituzione testo non valida'};
   state.text=state.text.split(e.from).join(e.to);
  }
  if(e.kind==='addType'&&!state.types.includes(e.value))state.types.push(e.value);
  if(e.kind==='removeType')state.types=state.types.filter(x=>x!==e.value);
  if(e.kind==='setColor')state.colors=[...e.values];
  if(e.kind==='addColor'&&!state.colors.includes(e.value))state.colors.push(e.value);
  if(e.kind==='removeColor')state.colors=state.colors.filter(x=>x!==e.value);
  if(e.kind==='addAbility'&&!state.abilities.includes(e.value))state.abilities.push(e.value);
  if(e.kind==='removeAbility')state.abilities=state.abilities.filter(x=>x!==e.value);
  if(e.kind==='removeAllAbilities')state.abilities=[];
  if(e.kind==='definePT'){state.power=e.power;state.toughness=e.toughness}
  if(e.kind==='setPT'){state.power=e.power;state.toughness=e.toughness}
  if(e.kind==='switchPT'){if(state.power===null||state.toughness===null)return {supported:false,reason:'P/T non determinata per inversione'};[state.power,state.toughness]=[state.toughness,state.power]}
  if(e.kind==='modifyPT'){if(state.power===null||state.toughness===null)return {supported:false,reason:'P/T base non determinata'};state.power+=e.power;state.toughness+=e.toughness}
 }
 return {supported:true,state,order:sorted.map(e=>({layer:e.layer,kind:e.kind,timestamp:e.timestamp}))};
}
root.JudgeLayers={ordered,evaluate,applyOrdered:(base,effects)=>evaluate(base,effects.map(e=>({...e,dependency:[]})),{preordered:true})};
})(typeof window!=='undefined'?window:globalThis);
