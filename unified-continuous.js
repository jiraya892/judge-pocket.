/* Single ordered pipeline for supported continuous effects, layers 2-7d.
   No automatic general dependency inference: unsupported cases remain partial. */
(function(root){'use strict';
const ranks=['1a','1b','2','3','4','5','6','7a','7b','7c','7d'];
const supported=new Set(['addType','removeType','addLandSubtype','setNonbasicLandSubtype','setColor','addColor','removeColor','addAbility','removeAbility','removeAllAbilities','setPT','definePT','modifyPT','switchPT','setController','replaceText','copyCharacteristics']);
function evaluate(objects,input){if(!root.JudgeUnifiedLayer4||!root.JudgeLayers||!root.JudgeEffectModel)return {supported:false,reason:'Motori dei layer mancanti'};
if(!Array.isArray(objects))return {supported:false,reason:'Stato non valido'};
 const built=Array.isArray(input)?root.JudgeEffectModel.build(objects,input):{supported:true,model:input};
 if(!built.supported)return built;
 const runtime=root.JudgeEffectModel.runtime(built.model);if(!runtime.supported)return runtime;
 const effects=runtime.effects;
if(effects.some(e=>!supported.has(e.kind)||!ranks.includes(String(e.layer))))return {supported:false,reason:'Effetto continuo non supportato'};
const layer4=effects.filter(e=>String(e.layer)==='4');
const early=effects.filter(e=>ranks.indexOf(String(e.layer))<ranks.indexOf('4'));
const late=effects.filter(e=>ranks.indexOf(String(e.layer))>ranks.indexOf('4'));
if(early.some(e=>e.targetId==='all'))return {supported:false,reason:'Effetti globali nei layer precedenti al 4 non ancora integrati'};
if(effects.some(e=>e.dependency?.length&&e.layer!=='4'&&(e.dependency||[]).some(id=>!effects.some(x=>x.id===id&&x.layer===e.layer))))return {supported:false,reason:'Dipendenza extra layer mancante o in layer diverso'};
const copies=early.filter(e=>e.kind==='copyCharacteristics');
if(copies.some(e=>e.layer!=='1a'||!e.targetId||e.targetId==='all'||!e.sourceId||!objects.some(o=>o.id===e.sourceId)||!Number.isSafeInteger(e.timestamp)))return {supported:false,reason:'Copia senza sorgente o destinazione valida'};
if(copies.some(e=>copies.some(other=>other!==e&&other.targetId===e.sourceId)))return {supported:false,reason:'Catena di copie non ancora verificata'};
if(copies.some(e=>e.sourceId===e.targetId))return {supported:false,reason:'Copia di se stessa non supportata'};
let before=[];
for(const o of objects){const ownCopies=copies.filter(e=>e.targetId===o.id).sort((a,b)=>a.timestamp-b.timestamp);
 const last=ownCopies[ownCopies.length-1];const source=last?objects.find(x=>x.id===last.sourceId):null;
 const copied=source?{...o,types:[...source.types],subtypes:[...(source.subtypes||[])],supertypes:[...(source.supertypes||[])],abilities:[...(source.abilities||[])],colors:[...(source.colors||[])],power:source.power,toughness:source.toughness,ptDefinition:source.ptDefinition,oracle_text:source.oracle_text}:o;
 const r=root.JudgeLayers.evaluate({types:copied.types,controller:copied.controller,abilities:copied.abilities||[],colors:copied.colors||[],text:copied.oracle_text||'',power:copied.power,toughness:copied.toughness},root.JudgeEffectModel.subset(built.model,early.filter(e=>e.targetId===o.id&&e.kind!=='copyCharacteristics').map(e=>e.id)));if(!r.supported)return r;before.push({...copied,...r.state,subtypes:copied.subtypes||[],supertypes:copied.supertypes||[]})}
const middle=layer4.length?root.JudgeUnifiedLayer4.evaluate(before,root.JudgeEffectModel.subset(built.model,layer4.map(e=>e.id))):{supported:true,objects:before,order:[]};if(!middle.supported)return middle;
const result=[];
for(const o of middle.objects){const relevant=late.filter(e=>e.targetId===o.id||e.targetId==='all');const hasCounters=!!((o.counters?.['+1/+1']||0)||(o.counters?.['-1/-1']||0));

if(o.ptDefinition&& !o.abilities.some(a=>a.id===o.ptDefinition.abilityId))return {supported:false,reason:'Abilità definitoria rimossa: valutazione completa non disponibile'};
if(o.ptDefinition&&o.ptDefinition.kind!=='landCount')return {supported:false,reason:'Definizione dinamica sconosciuta'};
if(o.ptDefinition&&relevant.some(e=>e.layer==='7a'))return {supported:false,reason:'Definizioni concorrenti in 7a non ancora integrate'};
const orderedLate=[];
// The planner evaluates actual state changes, not placeholder identities. Effects that
// alter whether another effect applies are ordered before it; dependencies are
// recalculated after each application. Global late-layer effects are scoped per object.
let planning={types:[...o.types],controller:o.controller,abilities:[...o.abilities],colors:[...(o.colors||[])],text:o.text||'',power:o.power,toughness:o.toughness};
for(const layer of ['5','6','7a','7b','7c','7d']){
 const group=relevant.filter(e=>e.layer===layer);if(!group.length)continue;
 if(!root.JudgeDependencies)return {supported:false,reason:'Pianificatore dipendenze mancante'};
 let invalid=null;
 const apply=(e,s)=>{const outcome=root.JudgeLayers.evaluate(s,[{...e,dependency:[]}]);if(!outcome.supported){invalid=outcome.reason;return s}return outcome.state};
 const plan=root.JudgeDependencies.order(root.JudgeEffectModel.subset(built.model,group.map(e=>e.id)),planning,{
  exists:(e,s)=>{
   if(!e.sourceAbilityId)return true;
   if(e.sourceId!==o.id)return undefined; // cross-object ability state needs board-wide layer evaluation
   return s.abilities.some(a=>a.id===e.sourceAbilityId);
  },
  affected:(e,s)=>[o.id],
  apply,
  signature:(e,s)=>{
   // Only model semantic dependencies that are provable for the operation.
   // Absolute post-state comparisons incorrectly make independent setPTs dependent.
   if(e.kind==='setPT'||e.kind==='definePT'||e.kind==='modifyPT'||e.kind==='setColor'||e.kind==='setController'||e.kind==='addAbility'||e.kind==='removeAbility'||e.kind==='removeAllAbilities'||e.kind==='addColor'||e.kind==='removeColor')return [e.kind,e.value,e.power,e.toughness,e.values];
   if(e.kind==='switchPT')return [s.power,s.toughness];
   return [e.kind,e.value,e.power,e.toughness,e.values];

  }
 });
 if(invalid)return {supported:false,reason:invalid};
 if(!plan.supported)return plan;
 planning=plan.state;orderedLate.push(...plan.order);
}
const prior=orderedLate.filter(e=>e.layer!=='7d');const switches=orderedLate.filter(e=>e.layer==='7d');
const count=o.ptDefinition?middle.objects.filter(x=>x.controller===o.controller&&x.types.includes('land')).length:null;
const r=root.JudgeLayers.applyOrdered({types:o.types,controller:o.controller,abilities:o.abilities,colors:o.colors||[],text:o.text||'',power:count??o.power,toughness:count??o.toughness},prior);if(!r.supported)return r;
if(o.ptDefinition&&!r.state.abilities.some(a=>a.id===o.ptDefinition.abilityId))return {supported:false,reason:'Abilità definitoria rimossa durante il layer 6'};
const state={...o,...r.state,subtypes:o.subtypes};
const delta=(o.counters?.['+1/+1']||0)-(o.counters?.['-1/-1']||0);
if(state.power!=null)state.power+=delta;if(state.toughness!=null)state.toughness+=delta;
if(switches.length){const swapped=root.JudgeLayers.applyOrdered(state,switches);if(!swapped.supported)return swapped;state.power=swapped.state.power;state.toughness=swapped.state.toughness;}
result.push(state)}
return {supported:true,objects:result,order:[...middle.order],coverage:'restricted-shared-state',warnings:['Calcolo parziale: dipendenze generali e durata degli effetti non ancora verificate']}}
root.JudgeUnifiedContinuous={evaluate};
})(typeof window!=='undefined'?window:globalThis);