/* Explicit, validated guided board facts. Unknown facts never become implicit game rules. */
(function(root){'use strict';
const zones=new Set(['battlefield','hand','library','graveyard','exile','stack','command']);
function validate(context){
 const cards=context?.cards;if(!Array.isArray(cards)||cards.length<2)return {supported:false,code:'CARDS_MISSING',reason:'Servono almeno due carte'};
 if(!Array.isArray(context.controllers)||context.controllers.length!==cards.length||context.controllers.some(x=>!['A','B'].includes(x)))return {supported:false,code:'CONTROLLERS_MISSING',reason:'Controllori non specificati'};
 if(!['complete','additional'].includes(context.board))return {supported:false,code:'BOARD_UNKNOWN',reason:'Non è noto se ci sono altri permanenti rilevanti'};
 if(context.board==='additional'&&(!context.extraComplete||cards.length<3))return {supported:false,code:'ADDITIONAL_PERMANENTS',reason:'Completa l’elenco degli altri permanenti prima dell’analisi'};
 if(context.event==='present'&&(!Array.isArray(context.order)||context.order.length!==cards.length||new Set(context.order).size!==cards.length||context.order.some(i=>!Number.isInteger(i)||i<0||i>=cards.length)))return {supported:false,code:'ORDER_MISSING',reason:'Ordine di ingresso non specificato'};
 if(context.event==='enter'&&(!Number.isInteger(context.enteringIndex)||context.enteringIndex<0||context.enteringIndex>=cards.length))return {supported:false,code:'ENTERING_UNKNOWN',reason:'Carta in ingresso non valida'};
 return {supported:true};
}
function build(context,cardObjects){const check=validate(context);if(!check.supported)return check;
 const objects=cardObjects.map((o,i)=>({...o,owner:context.controllers[i],controller:context.controllers[i],zone:context.event==='cast'&&i===context.castingIndex?'stack':'battlefield'}));
 const order=context.event==='enter'?[...cardsIndices(objects).filter(i=>i!==context.enteringIndex),context.enteringIndex]:context.order||cardsIndices(objects);
 const timestamps=Object.fromEntries(order.map((i,j)=>[objects[i].id,j+1]));
 return {supported:true,objects,timestamps,players:[{id:'A',life:20},{id:'B',life:20}],turn:{activePlayer:'A',priorityPlayer:'A',phase:'main1'},effects:[],knownFacts:{boardComplete:true,controllersExplicit:true,orderExplicit:context.event==='present'||context.event==='enter',additionalPermanents:Math.max(0,objects.length-2)}};
}
function cardsIndices(a){return a.map((_,i)=>i)}
function move(state,id,to){
 if(!zones.has(to))return {supported:false,code:'INVALID_ZONE',reason:'Zona sconosciuta'};
 const original=state?.objects?.find(o=>o.id===id);if(!original)return {supported:false,code:'OBJECT_MISSING',reason:'Oggetto non trovato'};
 if(original.zone===to)return {supported:false,code:'SAME_ZONE',reason:'L’oggetto è già nella zona indicata'};
 const next=JSON.parse(JSON.stringify(state));const idx=next.objects.findIndex(o=>o.id===id);
 const old=next.objects[idx];if(old.token&&to!=='battlefield'){next.objects.splice(idx,1);return {supported:true,state:next,ceasedToken:true,previous:old}}
 const used=new Set(next.objects.map(o=>o.id));let n=1;let newId=id+'-zone-'+n;while(used.has(newId)){n++;newId=id+'-zone-'+n}
 next.objects[idx]={...old,id:newId,zone:to,controller:to==='battlefield'?old.controller:old.owner,counters:{},damage:0,tapped:false,deathtouchMarked:false};
 return {supported:true,state:next,previous:old,object:next.objects[idx]};
}
root.JudgeGameFacts={validate,build,move,zones:[...zones]};
})(typeof window!=='undefined'?window:globalThis);
