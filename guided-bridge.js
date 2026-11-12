/* Guided interview -> Oracle -> coordinator, with conservative diagnostic output. */
(function(root){'use strict';
const normalizeName=name=>String(name||'').normalize('NFKD').toLowerCase().replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const TYPES=['creature','land','artifact','enchantment','planeswalker','instant','sorcery','battle'];
function cardObject(card,index){
 const line=card.type_line||'';const parts=line.split(/\\s+[—-]\\s+/);const before=parts[0]||'';
 return {id:'guided-'+index,name:card.name,owner:'A',controller:'A',zone:'battlefield',types:TYPES.filter(t=>new RegExp('\\b'+t+'\\b','i').test(before)),supertypes:['basic','legendary','snow','world'].filter(t=>new RegExp('\\b'+t+'\\b','i').test(before)),subtypes:parts[1]?parts[1].split(/\\s+/):[],power:/^-?\\d+$/.test(card.power||'')?Number(card.power):null,toughness:/^-?\\d+$/.test(card.toughness||'')?Number(card.toughness):null,counters:{'+1/+1':0},damage:0,tapped:false,token:false,oracle_text:card.oracle_text||''};
}
async function evaluate(context){
 const details={version:1,cards:context?.cards||[],event:context?.event||null,entering:context?.entering||null,casting:context?.casting||null,reasonCodes:[],unsupportedLines:[],warnings:[]};
 const fail=(code,reason,extra={})=>({status:'unsupported',title:'Interazione non ancora supportata',reason,diagnostic:{...details,reasonCodes:[...details.reasonCodes,code],...extra}});
 if(!root.JudgeOracleRecognition||!root.JudgeCoordinator)return fail('ENGINE_MISSING','Moduli Oracle o coordinatore mancanti.');
 if(!Array.isArray(context?.cards)||context.cards.length<2)return fail('CARDS_MISSING','Servono almeno due carte.');
 let cards;try{cards=await Promise.all(context.cards.map(n=>root.JudgeOracleRecognition.fetchCard(n)))}catch(e){return fail('ORACLE_LOOKUP_FAILED','Impossibile recuperare una carta: '+e.message)}

 // Chapter 16A/B: evaluate controller alternatives only as a conservative
 // diagnostic preview. Partial coordinator results are not rulings.
 if(!context.controllers&&context.board&&root.JudgeQuestionPlanner&&root.JudgeGameFacts){
  const options=[{id:'A',label:'Giocatore A'},{id:'B',label:'Giocatore B'}];
  const planned=root.JudgeQuestionPlanner.plan({
   facts:cards.map((_,i)=>({key:'controller'+i,question:'Chi controlla '+cards[i].name+'?',options})),
   answers:{}
  },scenario=>{
   const controllers=cards.map((_,i)=>scenario.answers['controller'+i]);
   const candidate={...context,controllers,board:context.board,order:context.order};
   const built=root.JudgeGameFacts.build(candidate,cards.map(cardObject));
   if(!built.supported)return {supported:false};
   const objects=built.objects,effects=[];
   for(let i=0;i<cards.length;i++){
    const recognized=root.JudgeOracleRecognition.recognize(cards[i],objects[i]);
    if(recognized.unknown.length)return {supported:false};
    for(const e of recognized.effects)effects.push({...e,id:'scenario-'+i+'-'+effects.length,sourceId:objects[i].id,source:objects[i].name,oracleGenerated:true,timestamp:built.timestamps[objects[i].id],duration:'ongoing'});
   }
   const out=root.JudgeCoordinator.evaluate({schemaVersion:1,players:built.players,turn:built.turn,objects,effects});
   if(!out.supported||out.results.some(r=>r.status!=='partial'))return {supported:false};
   return {supported:true,outcome:out.results.map(r=>({types:r.types,subtypes:r.subtypes,power:r.power,toughness:r.toughness}))};
  });
  details.questionPlanning={status:planned.status,reason:planned.reason||null,relevantKeys:planned.relevantKeys||[],scenarios:planned.scenarios||0,previewOnly:true};
 }
 if(!context.board)return {status:'question',key:'board',question:'Ci sono altri permanenti che possono influire su questa interazione?',options:[{id:'complete',label:'No, soltanto queste carte'},{id:'additional',label:'Sì, ci sono altri permanenti'}],diagnostic:details};
 if(!context.controllers&&details.questionPlanning?.status==='question'){
  const first=details.questionPlanning.relevantKeys[0];
  const index=Number(first?.replace(/^controller/,''));
  if(Number.isInteger(index)&&index>=0&&index<cards.length)return {status:'question',key:'controllers',question:'Chi controlla '+cards[index].name+'?',options:[{id:'A',label:'Giocatore A'},{id:'B',label:'Giocatore B'}],diagnostic:details};
 }
 const facts=root.JudgeGameFacts?.build(context,cards.map(cardObject));if(!facts?.supported)return fail(facts?.code||'FACTS_ENGINE_MISSING',facts?.reason||'Modulo stato mancante');const objects=facts.objects,effects=[];
 for(let i=0;i<cards.length;i++){
  const recognition=root.JudgeOracleRecognition.recognize(cards[i],objects[i]);objects[i].oracleUnknown=recognition.unknown;
  details.unsupportedLines.push(...recognition.unknown.map(line=>({card:cards[i].name,text:line})));
  for(const e of recognition.effects)effects.push({...e,id:'guided-effect-'+i+'-'+effects.length,sourceId:objects[i].id,source:objects[i].name,oracleGenerated:true,timestamp:facts.timestamps[objects[i].id],duration:'ongoing'});
 }
 const state={schemaVersion:1,players:facts.players,turn:facts.turn,objects,effects};
 details.cards=cards.map(c=>c.name);details.effectKinds=effects.map(e=>e.kind);details.knownFacts=facts.knownFacts;details.controllers=context.controllers;details.timestamps=facts.timestamps;details.zones=objects.map(o=>({name:o.name,zone:o.zone,controller:o.controller}));
 // Context enters the engine as an explicit zone/state. Entry timing is not implemented.
 if(context.event==='cast')return fail('CAST_STACK_NOT_CONNECTED','Il lancio e la risoluzione della magia non sono ancora collegati a questa modalità.');
 if(context.event==='other')return fail('CUSTOM_EVENT_NOT_PARSED','La descrizione libera non è ancora traducibile in eventi verificabili.');
 if(context.event==='enter'&&!cards.some(c=>normalizeName(c.name)===normalizeName(context.entering)))return fail('ENTERING_CARD_UNKNOWN','La carta che entra non corrisponde a quelle selezionate.');
 if(!['enter','present'].includes(context.event))return fail('EVENT_UNKNOWN','Situazione non riconosciuta.');
 if(context.event==='enter')details.warnings.push('La carta in ingresso è rappresentata sul campo; il motore non modella ancora gli effetti di sostituzione applicati durante l’ingresso.');
 let outcome;try{outcome=root.JudgeCoordinator.evaluate(state)}catch(e){return fail('COORDINATOR_ERROR','Errore nel coordinatore: '+e.message)}
 if(!outcome.supported)return fail('COORDINATOR_REJECTED',outcome.reason||'Il coordinatore non ha accettato lo stato.');
 details.warnings.push(...(outcome.warnings||[]));
 const sba=root.JudgeSBAPreview?.preview(outcome.results,objects)||{supported:false,reason:'Modulo SBA mancante'};details.sbaPreview=sba;
 const trust=root.JudgeOutcomeTrust?.fromCoordinator(outcome);details.outcomeTrust=trust?{status:trust.status,reason:trust.reason,reasonCodes:trust.reasonCodes}:null;details.evidenceAudit=root.JudgeEvidenceLedger?.audit({status:trust?.status,supported:outcome.supported,preview:outcome.results,warnings:outcome.warnings},[])||null;
 const incomplete=outcome.results.filter(r=>r.status==='unsupported'||r.status==='not-evaluated');
 if(incomplete.length)return fail('UNSUPPORTED_EFFECTS','Il coordinatore non riesce ancora a calcolare tutti gli effetti delle carte.',{results:outcome.results,unsupportedObjects:incomplete});
 if(details.unsupportedLines.length)return fail('ORACLE_TEXT_UNSUPPORTED','Alcune righe Oracle non sono state interpretate.',{results:outcome.results});
 // A partial layer computation is NOT a reliable interaction ruling.
 return fail('PARTIAL_RULES_COVERAGE','Le caratteristiche calcolate sono una simulazione parziale, non un verdetto. Restano da verificare controllori, effetti di ingresso, altre carte presenti e azioni basate sullo stato.',{results:outcome.results,preview:outcome.results.map(r=>({card:r.name,types:r.types,subtypes:r.subtypes,power:r.power,toughness:r.toughness,possibleZeroToughness:r.possibleZeroToughness})),missingSupport:['ENTRY_REPLACEMENT_EFFECTS','TRIGGERED_ABILITIES','STACK_AND_PRIORITY','SBA_EXECUTION','FULL_CONTINUOUS_EFFECT_VALIDATION']});
}
root.JudgeGuidedBridge={evaluate,cardObject};
})(typeof window!=='undefined'?window:globalThis);
