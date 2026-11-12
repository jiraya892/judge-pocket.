/* Explicit, validated guided board facts. Unknown facts never become implicit game rules. */
(function(root){'use strict';
const zones=new Set(['battlefield','hand','library','graveyard','exile','stack','command']);
function validate(context){
 const cards=context?.cards;if(!Array.isArray(cards)||cards.length<2)return {supported:false,code:'CARDS_MISSING',reason:'Servono almeno due carte'};
 if(!Array.isArray(context.controllers)||context.controllers.length!==cards.length||context.controllers.some(x=>!['A','B'].includes(x)))return {supported:false,code:'CONTROLLERS_MISSING',reason:'Controllori non specificati'};
 if(!['complete','additional'].includes(context.board))return {supported:false,code:'BOARD_UNKNOWN',reason:'Non è noto se ci sono altri permanenti rilevanti'};
 if(context.board==='additional')return {supported:false,code:'ADDITIONAL_PERMANENTS',reason:'Ci sono altri permanenti: serve aggiungerli prima di calcolare un verdetto'};
 if(context.event==='present'&&(!Array.isArray(context.order)||context.order.length!==cards.length||new Set(context.order).size!==cards.length||context.order.some(i=>!Number.isInteger(i)||i<0||i>=cards.length)))return {supported:false,code:'ORDER_MISSING',reason:'Ordine di ingresso non specificato'};
 if(context.event==='enter'&&(!Number.isInteger(context.enteringIndex)||context.enteringIndex<0||context.enteringIndex>=cards.length))return {supported:false,code:'ENTERING_UNKNOWN',reason:'Carta in ingresso non valida'};
 return {supported:true};
}
function build(context,cardObjects){const check=validate(context);if(!check.supported)return check;
 const objects=cardObjects.map((o,i)=>({...o,owner:context.controllers[i],controller:context.controllers[i],zone:context.event==='cast'&&i===context.castingIndex?'stack':'battlefield'}));
 const order=context.event==='enter'?[...cardsIndices(objects).filter(i=>i!==context.enteringIndex),context.enteringIndex]:context.order||cardsIndices(objects);
 const timestamps=Object.fromEntries(order.map((i,j)=>[objects[i].id,j+1]));
 return {supported:true,objects,timestamps,players:[{id:'A',life:20},{id:'B',life:20}],turn:{activePlayer:'A',priorityPlayer:'A',phase:'main1'},effects:[],knownFacts:{boardComplete:true,controllersExplicit:true,orderExplicit:context.event==='present'}};
}
function cardsIndices(a){return a.map((_,i)=>i)}
root.JudgeGameFacts={validate,build,zones:[...zones]};
})(typeof window!=='undefined'?window:globalThis);
