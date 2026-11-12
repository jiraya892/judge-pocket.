/* Group 3: structured replacement/prevention before event execution.
   No implicit player choices: ambiguous orders fail closed. */
(function(root){'use strict';
const eventTypes=new Set(['gainLife','loseLife','dealDamage','putCounters','tap','untap']);
const operations=new Set(['prevent','multiply','add','set','redirect','changeType']);
function matches(effect,event){
 const m=effect.match||{};
 return (!m.type||m.type===event.type)&&(!m.target||m.target===event.target)&&(!m.player||m.player===event.player)&&(!m.source||m.source===event.source)&&(!m.counterType||m.counterType===event.counterType);
}
function process(event,effects=[],choices=[]){
 if(!event||!eventTypes.has(event.type)||!Array.isArray(effects)||!Array.isArray(choices))return {supported:false,reason:'Evento o sostituzioni non validi'};
 if(!Number.isSafeInteger(event.amount??0)||(event.amount??0)<0)return {supported:false,reason:'Quantità evento non valida'};
 if(effects.some(e=>!e||typeof e.id!=='string'||!e.id||!operations.has(e.operation)||!e.match||typeof e.match!=='object'))return {supported:false,reason:'Sostituzione non riconosciuta'};
 if(new Set(effects.map(e=>e.id)).size!==effects.length)return {supported:false,reason:'ID sostituzione duplicato'};
 if(effects.some(e=>e.operation==='prevent'&&e.match.type&&e.match.type!=='dealDamage'))return {supported:false,reason:'Prevenzione su evento non danno non supportata'};
 const used=new Set(),trace=[];let current={...event};
 while(true){
  // An event entirely prevented or reduced to zero does not occur; no later effect can revive it.
  if(current.type==='dealDamage'&&current.amount===0)break;
  const eligible=effects.filter(e=>!used.has(e.id)&&matches(e,current)&&(e.operation!=='prevent'||current.type==='dealDamage'&&!current.unpreventable));
  if(!eligible.length)break;
  let chosen;
  if(eligible.length===1)chosen=eligible[0];
  else{
   const choice=choices[trace.length];
   if(!choice||!eligible.some(e=>e.id===choice))return {supported:false,reason:'Scelta ordine effetti necessaria',choices:eligible.map(e=>e.id),event:current,trace};
   chosen=eligible.find(e=>e.id===choice);
  }
  used.add(chosen.id);
  const value=chosen.value;
  if(chosen.operation==='prevent'){
   if(value!==undefined&&(!Number.isSafeInteger(value)||value<0))return {supported:false,reason:'Quantità prevenzione invalida'};
   current={...current,amount:Math.max(0,current.amount-(value??current.amount))};
  }else if(['multiply','add','set'].includes(chosen.operation)){
   if(!Number.isSafeInteger(value)||(chosen.operation!=='add'&&value<0))return {supported:false,reason:'Quantità sostituzione invalida'};
   const amount=chosen.operation==='multiply'?current.amount*value:chosen.operation==='add'?current.amount+value:value;
   if(!Number.isSafeInteger(amount)||amount<0)return {supported:false,reason:'Quantità sostituita fuori intervallo'};
   current={...current,amount};
  }else if(chosen.operation==='redirect'){
   if(current.type!=='dealDamage'||typeof chosen.target!=='string'||!chosen.target)return {supported:false,reason:'Reindirizzamento non valido'};
   current={...current,target:chosen.target};
  }else if(chosen.operation==='changeType'){
   if(!eventTypes.has(chosen.type))return {supported:false,reason:'Tipo evento sostitutivo sconosciuto'};
   current={...current,type:chosen.type};
  }
  trace.push({effectId:chosen.id,event:{...current}});
 }
 return {supported:true,event:current.type==='dealDamage'&&current.amount===0?null:current,trace,applied:trace.map(t=>t.effectId)};
}
root.JudgeReplacements={process,matches};
})(typeof window!=='undefined'?window:globalThis);