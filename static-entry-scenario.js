/* ETB into a stable, closed battlefield of fully recognized static effects.
   Stabilize before and after entry; unsupported ETB/replacement/death text stops
   the entire computation. No card names, no phase guesses, no partial ruling. */
(function(root){'use strict';
const permutations=ids=>ids.length<2?[ids]:ids.flatMap((id,i)=>permutations(ids.filter((_,j)=>i!==j)).map(t=>[id,...t]));
function evaluate(cards,entering,controllers,priorOrder){
 const fail=reason=>({supported:false,status:'unsupported',reason});
 const objects=cards.map(root.JudgeGuidedBridge.cardObject),effects=[];
 for(let i=0;i<cards.length;i++){objects[i].controller=objects[i].owner=controllers[i];const r=root.JudgeOracleRecognition.recognize(cards[i],objects[i]);objects[i].oracleUnknown=r.unknown;if(r.unknown.length)return fail('Testo Oracle non riconosciuto completamente.');for(const e of r.effects)effects.push({...e,id:'entry-effect-'+i+'-'+effects.length,oracleGenerated:true,timestamp:[...priorOrder,entering].indexOf(i)+1});}
 const entrant=objects[entering],prior=objects.filter((_,i)=>i!==entering);
 const run=(board,fx)=>root.JudgeCoordinator.evaluateScenario({scope:'clean-static-snapshot',objects:board,effects:fx,players:[{id:'A',life:20},{id:'B',life:20}]});
 const before=run(prior,effects.filter(e=>e.sourceId!==entrant.id));
 if(!before?.supported||before.status!=='verified'||before.events.length)return fail('Il campo prima dell’ingresso non è verificato o richiede già azioni basate sullo stato.');
 const after=run(objects,effects);if(!after?.supported||after.status!=='verified'||after.warnings?.length)return fail(after.reason||'L’ingresso non è completamente valutabile.');
 return {supported:true,status:'verified',outcome:{scope:'clean-static-entry',calculationBoundary:'first-sba-check-after-entry',enteringId:entrant.id,results:after.results,events:[{type:'entersBattlefield',id:entrant.id,name:entrant.name,description:entrant.name+' entra sul campo di battaglia.'},...after.events],rules:[...new Set([...after.rules,'603.6a','704.3'])]}};
}
async function guided(context,cards){
 const stop=reason=>({status:'unsupported',reason,diagnostic:{reasonCodes:['STATIC_ENTRY_UNSUPPORTED']}});
 const k=context.enteringIndex;if(!Number.isInteger(k)||!cards[k]||cards.length>4)return stop('Carta in ingresso o numero di carte non valido.');
 const prior=cards.map((_,i)=>i).filter(i=>i!==k),facts=cards.map((c,i)=>({key:'entryController'+i,question:'Chi controlla '+c.name+'?',options:[{id:'A',label:'Giocatore A'},{id:'B',label:'Giocatore B'}]})),orders=permutations(prior);
 facts.push({key:'entryPriorOrder',question:'In quale ordine sono entrate le carte già sul campo?',options:orders.map(order=>({id:order.join(','),label:order.map(i=>cards[i].name).join(' → ')}))});
 const answers={...(context.answers||{})};for(let i=0;i<cards.length;i++)if(context.controllers?.[i])answers['entryController'+i]=context.controllers[i];
 let problem='';const plan=root.JudgeQuestionPlanner.plan({facts,answers},s=>{const r=evaluate(cards,k,cards.map((_,i)=>s.answers['entryController'+i]),s.answers.entryPriorOrder.split(',').map(Number));if(!r.supported)problem=r.reason;return r;});
 if(plan.status==='unsupported')return stop(problem||'Un’alternativa dell’ingresso non è verificabile.');
 if(!context.board)return {status:'question',key:'board',question:'Considero una sola carta che entra e le altre già sul campo, senza segnalini, danni, pedine, comandanti, risposte o altri effetti. Confermi?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return stop('Gli altri elementi dell’ingresso devono essere specificati.');
 if(plan.status==='question')return {...plan,key:'answers.'+plan.key};
 return {status:'partial',title:'Ingresso calcolato',outcome:plan.outcome,diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:plan.outcome,questionPlanning:plan,reasonCodes:[]}};
}
root.JudgeStaticEntry={evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
