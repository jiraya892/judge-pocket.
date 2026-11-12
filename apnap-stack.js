/* Group 4E: APNAP ordering and atomic stack placement. Stack bottom-to-top. */
(function(root){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
function place(state,orders={}){
 if(!state||!Array.isArray(state.players)||!Array.isArray(state.pendingTriggers)||!Array.isArray(state.stack)||!orders||typeof orders!=='object'||Array.isArray(orders))return {supported:false,reason:'Stato o ordini non validi'};
 const players=state.players.map(p=>p.id),active=players.indexOf(state.activePlayer);
 if(active<0||new Set(players).size!==players.length||players.some(x=>typeof x!=='string'||!x))return {supported:false,reason:'Ordine turni non valido'};
 const pending=state.pendingTriggers,ids=new Set();
 for(const t of pending){if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||!players.includes(t.controller))return {supported:false,reason:'Innesco non valido o duplicato'};ids.add(t.id);}
 if(Object.keys(orders).some(k=>!players.includes(k)))return {supported:false,reason:'Ordine per giocatore inesistente'};
 const sequence=players.slice(active).concat(players.slice(0,active)),placements=[];
 for(const player of sequence){
  const theirs=pending.filter(t=>t.controller===player),choice=orders[player];
  if(choice!==undefined&&(!Array.isArray(choice)||choice.length!==theirs.length||new Set(choice).size!==choice.length||choice.some(id=>!theirs.some(t=>t.id===id))))return {supported:false,reason:'Ordine non valido',player};
  if(theirs.length>1&&choice===undefined)return {supported:false,reason:'Scelta ordine richiesta',player,options:theirs.map(t=>({id:t.id,description:t.description||''}))};
  for(const id of choice??theirs.map(t=>t.id))placements.push(theirs.find(t=>t.id===id));
 }
 const stack=[...clone(state.stack),...clone(placements)];
 return {supported:true,state:{...clone(state),stack,pendingTriggers:[]},placements:placements.map(t=>t.id),top:stack.length?clone(stack[stack.length-1]):null};
}
root.JudgeAPNAP={place};})(typeof window!=='undefined'?window:globalThis);