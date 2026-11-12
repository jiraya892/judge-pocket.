/* Judge Pocket — demonstration of known event mechanics.
 * This is a conditional sandbox, not a full game-state reconstruction.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const results=$('simulation');
if(!results||!window.JudgeRulesCore)return;
const core=window.JudgeRulesCore;
function put(message,tag='p'){
 const el=document.createElement(tag);el.textContent=message;results.append(el);return el;
}
const hasType=(c,type)=>new RegExp('\\b'+type+'\\b','i').test(c.type_line||'');
const onBattlefield=c=>['Creature','Artifact','Enchantment','Planeswalker','Land','Battle'].some(t=>hasType(c,t));
function prepare(selected,leaveOut){
 const state=core.createGame(['Tu','Avversario']);
 const lookup=new Map();
 for(const c of selected){
  if(!onBattlefield(c))continue;
  const types=['Creature','Artifact','Enchantment','Planeswalker','Land','Battle'].filter(t=>hasType(c,t)).map(t=>t.toLowerCase());
  const pow=c.power!==undefined&&/^[-]?\d+$/.test(c.power)?Number(c.power):null;
  const tou=c.toughness!==undefined&&/^[-]?\d+$/.test(c.toughness)?Number(c.toughness):null;
  const obj=core.addObject(state,{name:c.name,owner:'Tu',controller:'Tu',
   types,power:pow,toughness:tou,legendary:hasType(c,'Legendary'),indestructible:(c.keywords||[]).includes('Indestructible'),
   oracle_text:c.oracle_text||'',card_faces:c.card_faces||[],
   zone:leaveOut===c._instanceId?'hand':'battlefield'});
  lookup.set(c._instanceId,obj);
 }
 return {state,lookup};
}
function refreshTargets(){
 const target=$('simTarget');
 if(!target)return;
 const old=target.value;
 target.replaceChildren();
 const selected=window.getJudgeSelectedCards();
 for(const c of selected.filter(onBattlefield)){
  const item=document.createElement('option');item.value=c._instanceId;item.textContent=c.name;
  target.append(item);
 }
 if([...target.options].some(x=>x.value===old))target.value=old;
}
$('simulationType').onchange=()=>{
 const type=$('simulationType').value;
 $('simQuantityRow').hidden=type==='enterBattlefield';
 $('simTargetRow').hidden=type==='createTokens';
};
$('simulate').onclick=()=>{
 results.replaceChildren();
 const cards=window.getJudgeSelectedCards();
 if(!cards.length){put('Aggiungi almeno una carta per simulare un evento.');return}
 refreshTargets();
 const type=$('simulationType').value;
 const count=Number($('simQuantity').value);
 if(type!=='enterBattlefield'&&(!Number.isInteger(count)||count<1||count>20)){
  put('Scegli una quantità intera tra 1 e 20.');return;
 }
 const choice=$('simTarget').value;
 const {state,lookup}=prepare(cards,type==='enterBattlefield'?choice:null);
 const target=lookup.get(choice);
 put('Scenario ipotetico: tutte le carte permanenti selezionate sono controllate da te, salvo quella che sta per entrare. Nessun altro effetto è considerato.');
 if(!state.objects.length){put('Non ci sono carte permanente selezionate da mettere sul campo.');return}
 if(type==='enterBattlefield'){
  if(!target){put('Seleziona una carta permanente che entra sul campo.');return}
  const res=core.applyEvent(state,{type:'enterBattlefield',target:target.id,controller:'Tu'});
  if(!res.applied){put(res.reason);return}
  // Narrow, explicitly recognized interaction. This is not a general layer solver.
  const battlefield=cards.filter(x=>x._instanceId!==choice);
  const textOf=x=>[x.oracle_text,...(x.card_faces||[]).map(f=>f.oracle_text)].filter(Boolean).join('\\n');
  const moon=battlefield.some(x=>/nonbasic lands are Mountains/i.test(textOf(x)));
  const ashaya=/nontoken creatures you control are Forest lands in addition to their other types/i.test(textOf(cards.find(x=>x._instanceId===choice)||{}));
  if(moon&&ashaya){
   put('Interazione continua riconosciuta: Blood Moon è già sul campo e Ashaya entra sotto il tuo controllo.','h3');
   put('Ashaya rende sé stessa una terra Foresta non base (layer 4). Blood Moon la rende Montagna non base; secondo la regola 305.7 perde le abilità stampate, inclusa quella che definisce forza e costituzione.');
   put('Ashaya diventa una creatura 0/0 e viene messa nel cimitero dalle azioni basate sullo stato. Dopo che Ashaya lascia il campo, il suo effetto continuo termina.');
   put('Questo verdetto vale per lo scenario indicato, senza altri effetti, segnalini o modifiche di forza/costituzione. Non è una simulazione generale delle dipendenze.');
   return;
  }
  const triggers=res.triggers||[];
  put('La carta entra sul campo: '+target.name+'. Possibili abilità innescate riconosciute: '+triggers.length+'.');
  if(triggers.length){
   put('Gli inneschi rimangono in attesa: non è stata simulata la loro risoluzione.');
   for(const t of triggers)put(t.description);
  }else put('Non sono stati riconosciuti inneschi dall’evento. Questo non esclude altre abilità.');
  return;
 }
 let event;
 if(type==='createTokens'){
  event={type:'createTokens',player:'Tu',amount:count,token:{name:'Pedina creatura 1/1',types:['creature'],power:1,toughness:1}};
 }else{
  if(!target){put('Seleziona un permanente che riceve i segnalini.');return}
  event={type:'putCounters',target:target.id,counterType:'+1/+1',fromEffect:true,amount:count};
  put('Permanente che riceve i segnalini: '+target.name+'.');
 }
 const preview=core.previewEvent(state,event);
 if(preview.truncated){put('Troppi ordini possibili per una conclusione affidabile.');return}
 if(!preview.variants.length){put('Non è stato possibile calcolare un risultato.');return}
 const amounts=preview.amounts;
 put('Quantità iniziale: '+count+'. Quantità possibile dopo gli effetti applicabili: '+amounts.join(' oppure ')+'.','h3');
 if(amounts.length>1)put('Esistono più risultati possibili: l’ordine di applicazione degli effetti di sostituzione è importante. Il motore non sceglie automaticamente l’ordine.');
 const seen=new Set();
 for(const variant of preview.variants){
  const signature=variant.event.amount+'|'+variant.order.join(',');
  if(seen.has(signature))continue;
  seen.add(signature);
  const explain=variant.order.map(id=>{
   const source=core.modifiers(state).find(m=>m.id===id);
   return source?source.name:'effetto sconosciuto';
  });
  put(variant.event.amount+': '+(explain.length?'applicazione '+explain.join(' → '):'nessuna sostituzione riconosciuta'));
  if(seen.size>=10){put('Sono mostrate al massimo dieci sequenze di applicazione.');break}
 }
 put('La simulazione non considera effetti di altre carte, costi, priorità, effetti continui non supportati e condizioni non ricostruibili dalle carte selezionate.');
};
window.refreshJudgeTargets=refreshTargets;
})();
