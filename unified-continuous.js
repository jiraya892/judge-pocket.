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
 const lifetime=root.JudgeEffectLifetime?.prepare(objects,runtime.effects);
if(!lifetime?.supported)return {supported:false,reason:lifetime?.reason||'Gestione durata effetti mancante'};
const effects=lifetime.effects;
const activeModel=root.JudgeEffectModel.subset(built.model,effects.map(e=>e.id));
if(effects.some(e=>!supported.has(e.kind)||!ranks.includes(String(e.layer))))return {supported:false,reason:'Effetto continuo non supportato'};
const layer4=effects.filter(e=>String(e.layer)==='4');
const early=effects.filter(e=>ranks.indexOf(String(e.layer))<ranks.indexOf('4'));
const late=effects.filter(e=>ranks.indexOf(String(e.layer))>ranks.indexOf('4'));
if(early.some(e=>e.targetId==='all'))return {supported:false,reason:'Effetti globali nei layer precedenti al 4 non ancora integrati'};
if(effects.some(e=>e.dependency?.length&&e.layer!=='4'&&(e.dependency||[]).some(id=>!effects.some(x=>x.id===id&&x.layer===e.layer))))return {supported:false,reason:'Dipendenza extra layer mancante o in layer diverso'};
const copies=early.filter(e=>e.kind==='copyCharacteristics');
if(!root.JudgeCopyLayer)return {supported:false,reason:'Motore copie mancante'};
const copiedResult=root.JudgeCopyLayer.evaluate(objects,copies);
if(!copiedResult.supported)return copiedResult;
let before=[];
for(const copied of copiedResult.objects){
 const r=root.JudgeLayers.evaluate({types:copied.types,controller:copied.controller,abilities:copied.abilities||[],colors:copied.colors||[],text:copied.oracle_text||copied.text||'',power:copied.power,toughness:copied.toughness},root.JudgeEffectModel.subset(activeModel,early.filter(e=>e.targetId===copied.id&&e.kind!=='copyCharacteristics').map(e=>e.id)));
 if(!r.supported)return r;
 before.push({...copied,...r.state,subtypes:copied.subtypes||[],supertypes:copied.supertypes||[]});
}
const middle=layer4.length?root.JudgeUnifiedLayer4.evaluate(before,root.JudgeEffectModel.subset(activeModel,layer4.map(e=>e.id)),{preGenerated:true}):{supported:true,objects:before,order:[]};if(!middle.supported)return middle;
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
 const plan=root.JudgeDependencies.order(root.JudgeEffectModel.subset(activeModel,group.map(e=>e.id)),planning,{
  exists:()=>true, // source checked at generation; CR 613.6 retains generated effects
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
return {supported:true,objects:result,order:[...copiedResult.order,...middle.order],coverage:'restricted-shared-state',warnings:['Calcolo parziale: dipendenze generali e durata degli effetti non ancora verificate']}}
root.JudgeUnifiedContinuous={evaluate};
})(typeof window!=='undefined'?window:globalThis);