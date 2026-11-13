/* Guided interview -> Oracle -> coordinator, with conservative diagnostic output. */
(function(root){'use strict';
const normalizeName=name=>String(name||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const TYPES=['creature','land','artifact','enchantment','planeswalker','instant','sorcery','battle'];
function cardObject(card,index){
 const line=card.type_line||'';const parts=line.split(/\s+[—-]\s+/);const before=parts[0]||'';
 return {id:'guided-'+index,name:card.name,owner:'A',controller:'A',zone:'battlefield',abilities:[],types:TYPES.filter(t=>new RegExp('\\b'+t+'\\b','i').test(before)),supertypes:['basic','legendary','snow','world'].filter(t=>new RegExp('\\b'+t+'\\b','i').test(before)),subtypes:parts[1]?parts[1].split(/\s+/):[],power:/^-?\d+$/.test(card.power||'')?Number(card.power):null,toughness:/^-?\d+$/.test(card.toughness||'')?Number(card.toughness):null,printedPower:card.power??null,printedToughness:card.toughness??null,counters:{'+1/+1':0},damage:0,tapped:false,token:false,oracle_text:card.oracle_text||''};
}
// This adapter compares complete scenario results. It never upgrades the legacy
// coordinator's partial calculations, even if their numeric values happen to agree.
function permutations(values){if(values.length<2)return [values];return values.flatMap((v,i)=>permutations(values.filter((_,j)=>j!==i)).map(rest=>[v,...rest]));}
async function evaluate(context){
 const details={version:2,cards:context?.cards||[],event:context?.event||null,reasonCodes:[],unsupportedLines:[],warnings:[]};
 const fail=(code,reason,extra={})=>({status:'unsupported',title:'Interazione non ancora supportata',reason,diagnostic:{...details,reasonCodes:[code],...extra}});
 if(!Array.isArray(context?.cards)||context.cards.length<2||context.cards.some(n=>typeof n!=='string'||!n.trim()))return fail('CARDS_MISSING','Servono almeno due nomi di carte.');
 if(typeof context.additionalDescription==='string'&&context.additionalDescription.trim())return fail('ADDITIONAL_CONTEXT_UNPARSED','Ho conservato il dettaglio aggiunto, ma non riesco ancora a tradurlo in uno scenario calcolabile. Non lo considero assente: serve specificarlo con informazioni supportate dal motore.');
 if(['gainLife','putCounters','beginEndStep'].includes(context.event)&&root.JudgeTriggerScenario)return root.JudgeTriggerScenario.guided(context);
 if(context.event==='combat'&&root.JudgeCombatScenario)return root.JudgeCombatScenario.guided(context);
 if(context.event==='drawCards'&&root.JudgeDrawScenario)return root.JudgeDrawScenario.guided(context);
 if(context.event==='cast'&&root.JudgeSpellScenario)return root.JudgeSpellScenario.guided(context);
 if(context.event==='cast')return fail('CAST_STACK_NOT_CONNECTED','Il lancio e la risoluzione non sono ancora collegati alla modalità guidata.');
 if(context.event==='other')return fail('CUSTOM_EVENT_NOT_PARSED','La descrizione libera non è ancora traducibile in eventi verificabili.');
 if(!['present','enter'].includes(context.event))return fail('EVENT_UNKNOWN','Situazione non riconosciuta.');
 if(context.event==='enter'&&(!Number.isInteger(context.enteringIndex)||normalizeName(context.cards[context.enteringIndex])!==normalizeName(context.entering)))return fail('ENTERING_CARD_UNKNOWN','La carta che entra non corrisponde a quelle selezionate.');
 // The existing continuous evaluator models a snapshot, not the entry event.
 if(context.event==='enter'&&root.JudgeEntryScenario)return root.JudgeEntryScenario.guided(context);
 if(context.event==='enter')return fail('ENTRY_NOT_CONNECTED','Il motore guidato non verifica ancora la sequenza di ingresso sul campo. Non servono altre risposte finché questo limite non è risolto.');
 if(context.board&&context.board!=='complete')return fail('OPEN_SCENARIO','Gli effetti aggiuntivi devono essere descritti prima di verificare questa situazione. Non vengono considerati assenti.');
 if(!root.JudgeOracleRecognition||!root.JudgeCoordinator||!root.JudgeGameFacts||!root.JudgeQuestionPlanner)return fail('ENGINE_MISSING','Moduli del motore o pianificatore mancanti.');
 // A controller and a permutation of entry order form the current finite domain.
 // Additional effects/objects have an open domain: never enumerate them as absent.
 if(context.cards.length>4)return fail('SCENARIO_DOMAIN_LIMIT','La modalità guidata non può ancora verificare tutte le alternative con più di quattro carte.');
 let cards;try{cards=await Promise.all(context.cards.map(n=>root.JudgeOracleRecognition.fetchCard(n)))}catch(e){return fail('ORACLE_LOOKUP_FAILED','Impossibile recuperare una carta: '+e.message)}
 const ids=cards.map((_,i)=>i),facts=cards.map((card,i)=>({key:'controller'+i,question:'Chi controlla '+card.name+'?',options:[{id:'A',label:'Giocatore A'},{id:'B',label:'Giocatore B'}]}));
 const answers={...(context.answers||{})};
 if(context.controllers!=null&&(!Array.isArray(context.controllers)||context.controllers.length>cards.length))return fail('INVALID_CONTROLLERS','Controllori non validi.');
 for(let i=0;i<(context.controllers||[]).length;i++)if(context.controllers[i]!=null)answers['controller'+i]=context.controllers[i];
 const prefix=context.orderPrefix||[];
 if(!Array.isArray(prefix)||prefix.some(i=>!ids.includes(i))||new Set(prefix).size!==prefix.length)return fail('INVALID_ORDER','Ordine parziale non valido.');
 const orders=permutations(ids).filter(order=>prefix.every((id,i)=>order[i]===id));
 facts.push({key:'entryOrder',question:'In quale ordine sono entrate queste carte?',options:orders.map(order=>({id:order.join(','),label:order.map(i=>cards[i].name).join(' → ')}))});
 if(context.order!=null){if(!Array.isArray(context.order))return fail('INVALID_ORDER','Ordine non valido.');answers.entryOrder=context.order.join(',');}
 let preview=null;
 const planning=root.JudgeQuestionPlanner.plan({facts,answers},scenario=>{
  const candidate={...context,controllers:cards.map((_,i)=>scenario.answers['controller'+i]),order:scenario.answers.entryOrder.split(',').map(Number),board:context.board||'complete'};
  const built=root.JudgeGameFacts.build(candidate,cards.map(cardObject));if(!built.supported)return {supported:false};
  const objects=built.objects,effects=[],unsupportedLines=[];
  for(let i=0;i<cards.length;i++){
   const recognized=root.JudgeOracleRecognition.recognize(cards[i],objects[i]);objects[i].oracleUnknown=recognized.unknown;
   unsupportedLines.push(...recognized.unknown.map(text=>({card:cards[i].name,text})));
   for(const effect of recognized.effects)effects.push({...effect,id:'guided-effect-'+i+'-'+effects.length,sourceId:objects[i].id,oracleGenerated:true,timestamp:built.timestamps[objects[i].id],duration:'ongoing'});
  }
  if(unsupportedLines.length){details.unsupportedLines=unsupportedLines;return {supported:false};}
  const evaluateScenario=root.JudgeCoordinator.evaluateScenario||root.JudgeCoordinator.evaluate;
  const out=evaluateScenario({schemaVersion:1,scope:'clean-static-snapshot',players:built.players,turn:built.turn,objects,effects});
  // Preserve the reason for an unsupported diagnostic, not a hypothetical result
  // based on an unprovided controller or timestamp.
  preview=out;
  if(!out?.supported||out.status!=='verified'||['warnings','missingFacts','unsupportedLines','reasonCodes'].some(k=>out[k]!=null&&(!Array.isArray(out[k])||out[k].length))||!Array.isArray(out.results)||out.results.length!==cards.length||out.results.some(r=>r.status!=='verified')||(out.warnings||[]).length)return {supported:false,status:out?.status||'partial'};
  // Include every rule-significant result field. Internal timestamp/order traces
  // are explanations, not outcomes; controller is retained (control can matter).
  return {supported:true,status:'verified',outcome:{results:out.results.map(({order,coverage,...result})=>result),events:out.events||[],rules:out.rules||[]}};
 });
 details.questionPlanning=planning;
 if(planning.status==='unsupported')return fail(details.unsupportedLines.length?'ORACLE_TEXT_UNSUPPORTED':'SCENARIO_NOT_VERIFIED',details.unsupportedLines.length?'Parte del testo Oracle non è ancora riconosciuta. Non posso scegliere domande affidabili per questa interazione.':'Il motore non verifica ancora completamente questa interazione. Fare altre domande non renderebbe affidabile un calcolo parziale.',{engineWarnings:preview?.warnings||[],engineReasons:(preview?.results||[]).filter(r=>r.reason).map(r=>r.reason)});
 // Board completeness is a declared scenario boundary, never an assumed fact.
 if(!context.board)return {status:'question',key:'board',question:'Considero soltanto queste carte, con al massimo due controllori distinti, scoperte e non pedina, senza segnalini, danni o altri effetti. Confermi anche che nessuna è il comandante?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}],diagnostic:details};
 if(planning.status==='question')return {...planning,key:'answers.'+planning.key,diagnostic:details};
 // Computational readiness is still subject to the source/evidence presentation
 // boundary. A planner cannot supply a signed source or invent a ruling string.
 return {status:'partial',title:'Calcolo dello scenario — fonte non autenticata',reason:'Nel contesto dichiarato: '+(planning.outcome.events.length?planning.outcome.events.map(e=>e.name+' va nel cimitero perché la sua costituzione è '+e.toughness+'. Dopo la sua uscita gli effetti vengono ricalcolati.').join(' '):'i permanenti restano sul campo con le caratteristiche calcolate.')+' La fonte delle regole non è ancora autenticata: questo calcolo non viene presentato come verdetto definitivo.',outcome:planning.outcome,diagnostic:{...details,calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:planning.outcome}};
}
root.JudgeGuidedBridge={evaluate,cardObject};
})(typeof window!=='undefined'?window:globalThis);
