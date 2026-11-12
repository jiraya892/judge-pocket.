/* Single ordered pipeline for supported continuous effects, layers 2-7d.
   No automatic general dependency inference: unsupported cases remain partial. */
(function(root){'use strict';
const ranks=['1a','1b','2','3','4','5','6','7a','7b','7c','7d'];
const supported=new Set(['addType','removeType','addLandSubtype','setNonbasicLandSubtype','setColor','addColor','removeColor','addAbility','removeAbility','removeAllAbilities','setPT','definePT','modifyPT','switchPT','setController','replaceText','copyCharacteristics']);
function evaluate(objects,effects){if(!root.JudgeUnifiedLayer4||!root.JudgeLayers)return {supported:false,reason:'Motori dei layer mancanti'};
if(!Array.isArray(objects)||!Array.isArray(effects))return {supported:false,reason:'Stato non valido'};
if(effects.some(e=>!supported.has(e.kind)||!ranks.includes(String(e.layer))))return {supported:false,reason:'Effetto continuo non supportato'};
const layer4=effects.filter(e=>String(e.layer)==='4');
const early=effects.filter(e=>ranks.indexOf(String(e.layer))<ranks.indexOf('4'));
const late=effects.filter(e=>ranks.indexOf(String(e.layer))>ranks.indexOf('4'));
if(early.some(e=>e.targetId==='all'))return {supported:false,reason:'Effetti globali nei layer precedenti al 4 non ancora integrati'};
if(effects.some(e=>e.dependency?.length&&e.layer!=='4'))return {supported:false,reason:'Dipendenze esplicite extra layer 4 non ancora integrate'};
if(effects.some(e=>e.kind==='copyCharacteristics'))return {supported:false,reason:'Effetti di copia tra oggetti non ancora integrati'};
let before=[];
for(const o of objects){const r=root.JudgeLayers.evaluate({types:o.types,controller:o.controller,abilities:o.abilities||[],colors:o.colors||[],text:o.oracle_text||'',power:o.power,toughness:o.toughness},early.filter(e=>e.targetId===o.id));if(!r.supported)return r;before.push({...o,...r.state,subtypes:o.subtypes||[],supertypes:o.supertypes||[]})}
const middle=layer4.length?root.JudgeUnifiedLayer4.evaluate(before,layer4):{supported:true,objects:before,order:[]};if(!middle.supported)return middle;
const result=[];
for(const o of middle.objects){const relevant=late.filter(e=>e.targetId===o.id||e.targetId==='all');const hasCounters=!!((o.counters?.['+1/+1']||0)||(o.counters?.['-1/-1']||0));

if(o.ptDefinition&& !o.abilities.some(a=>a.id===o.ptDefinition.abilityId))return {supported:false,reason:'Abilità definitoria rimossa: valutazione completa non disponibile'};
if(o.ptDefinition&&relevant.some(e=>['7a','7b','7c','7d'].includes(e.layer)))return {supported:false,reason:'Definizione dinamica P/T e modifiche successive non ancora integrate'};
const prior=relevant.filter(e=>e.layer!=='7d');const switches=relevant.filter(e=>e.layer==='7d');
const r=root.JudgeLayers.evaluate({types:o.types,controller:o.controller,abilities:o.abilities,colors:o.colors||[],text:o.text||'',power:o.power,toughness:o.toughness},prior);if(!r.supported)return r;
const state={...o,...r.state,subtypes:o.subtypes};
const delta=(o.counters?.['+1/+1']||0)-(o.counters?.['-1/-1']||0);
if(state.power!=null)state.power+=delta;if(state.toughness!=null)state.toughness+=delta;
if(switches.length){const swapped=root.JudgeLayers.evaluate(state,switches);if(!swapped.supported)return swapped;state.power=swapped.state.power;state.toughness=swapped.state.toughness;}
result.push(state)}
return {supported:true,objects:result,order:[...middle.order],coverage:'restricted-shared-state',warnings:['Calcolo parziale: dipendenze generali e durata degli effetti non ancora verificate']}}
root.JudgeUnifiedContinuous={evaluate};
})(typeof window!=='undefined'?window:globalThis);