/* Oracle-pattern adapter to the narrow continuous-state engine. No card-name rules. */
(function(root){
'use strict';
function textOf(c){return [c.oracle_text,...(c.card_faces||[]).map(f=>f.oracle_text)].filter(Boolean).join('\n')}
function run(cards,enterId){
 if(!Array.isArray(cards)||!cards.length)return {supported:false,reason:'Nessuna carta'};
 const selected=cards.filter(c=>c._instanceId===enterId);
 if(selected.length!==1)return {supported:false,reason:'Permanente entrante non identificato'};
 const relevant=cards.filter(c=>c._instanceId===enterId||c._instanceId!==enterId);
 const objects=[],effects=[];
 for(let i=0;i<relevant.length;i++){
  const c=relevant[i],t=textOf(c),type=c.type_line||'';
  const types=['creature','land','enchantment','artifact','planeswalker','battle'].filter(x=>new RegExp('\\b'+x+'\\b','i').test(type));
  const supertypes=/\\bBasic\\b/i.test(type)?['basic']:[];
  const isForest=/nontoken creatures you control are Forest lands in addition to their other types/i.test(t);
  const isMoon=/nonbasic lands are Mountains/i.test(t);
  if(!types.length)return {supported:false,reason:'Tipo di permanente non supportato'};
  if(t.includes('get +')||t.includes('gets +')||t.includes('get -')||t.includes('gets -')||t.includes('lose all abilities'))return {supported:false,reason:'Modifiche P/T continue non supportate'};
  if(!isForest&&!isMoon&&/\\b(are|become|gets? \\+|loses? all abilities)\\b/i.test(t))return {supported:false,reason:'Altri effetti continui presenti: calcolo non affidabile'};
  const abilities=[];
  if(isForest)abilities.push({id:'forest-'+i,origin:'rulesText'});
  if(isMoon)abilities.push({id:'moon-'+i,origin:'rulesText'});
  const dynamic=/power and toughness are each equal to the number of lands you control/i.test(t);
  const ptDefinition=dynamic?{kind:'landCount',abilityId:'forest-'+i}:undefined;
  if(dynamic&&!isForest)return {supported:false,reason:'Definizione dinamica P/T non collegata'};
  objects.push({types,subtypes:[],supertypes,abilities,controller:'A',token:false,power:/^\\d+$/.test(c.power)?Number(c.power):null,toughness:/^\\d+$/.test(c.toughness)?Number(c.toughness):null,ptDefinition});
  if(isForest)effects.push({kind:'addLandSubtype',scope:'nontokenCreaturesYouControl',controller:'A',subtype:'Forest',timestamp:i+1});
  if(isMoon)effects.push({kind:'setNonbasicLandSubtype',subtype:'Mountain',timestamp:i+1});
 }
 if(!effects.length)return {supported:false,reason:'Nessun effetto continuo supportato'};
 const outcome=root.JudgeContinuousState.evaluate(objects,effects);
 if(!outcome.supported)return outcome;
 const index=relevant.findIndex(c=>c._instanceId===enterId);
 return {...outcome,entering:outcome.objects[index],effects};
}
root.JudgeCardContinuous={run};
})(typeof window!=='undefined'?window:globalThis);
