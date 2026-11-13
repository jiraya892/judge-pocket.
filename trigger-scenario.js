/* Count triggers at a specified instant. Effects on the stack are NOT resolved.
   Full supported trigger clauses, static bonuses and history are required.
   Names identify source objects only; no card-pair rulings are encoded. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=reason=>({supported:false,status:'unsupported',reason});
const bonusText='If you gaining life causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time.';
function prepare(cards){
 const objects=[];
 for(let i=0;i<cards.length;i++){
  const card=cards[i],o=root.JudgeGuidedBridge.cardObject(card,i);
  if(card.card_faces?.length||!o.types.some(t=>['creature','enchantment','artifact'].includes(t))||o.types.includes('creature')&&(!Number.isSafeInteger(o.power)||!Number.isSafeInteger(o.toughness)||o.toughness<=0))return fail('Tipo di permanente o P/T non supportati per il conteggio degli inneschi.');
  o.objectIdentity=o.id+'-battlefield';o.abilities=[];
  const lines=String(card.oracle_text||'').replace(/\([^()]*\)/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
  for(const original of lines){
   const id='observed-'+i+'-'+o.abilities.length;
   if(original===bonusText){o.abilities.push({id,kind:'static',text:original,triggerBonus:{eventType:'gainLife',additional:1}});continue;}
   if(original.split(/,\s*/).every(k=>['flying','vigilance','lifelink','first strike','double strike','indestructible','trample','reach','haste','hexproof','shroud','deathtouch'].includes(k.toLowerCase())))continue;
   // Activated instructions do not happen spontaneously at this instant. They
   // are retained, never claimed to have been activated or resolved.
   if(/^\{[\dWUBRGX/]+\}(?:\{[\dWUBRGX/]+\})*: .+\.$/.test(original)){o.abilities.push({id,kind:'activated',text:original});continue;}
   const capped=original.endsWith(' This ability triggers only once each turn.');
   const line=capped?original.slice(0,-' This ability triggers only once each turn.'.length):original;
   if(/This ability|triggers (?:only|an additional)/.test(line))return fail('Restrizione di innesco non riconosciuta: '+original);
   let m,descriptor;
   if((m=/^Whenever you gain life, (?!if\b)(.+\.)$/.exec(line))){descriptor={eventKind:'gainLife'};}
   else if((m=/^Whenever you put one or more \+1\/\+1 counters on this creature, (?!if\b)(.+\.)$/.exec(line))){descriptor={eventKind:'putCounters'};}
   else if((m=/^At the beginning of (your|each) end step, if you gained (?:(\d+) or more )?life this turn, (.+\.)$/.exec(line))){descriptor={eventKind:'beginEndStep',ownStep:m[1]==='your',lifeThreshold:m[2]?Number(m[2]):1};if(!Number.isSafeInteger(descriptor.lifeThreshold)||descriptor.lifeThreshold<1)return fail('Soglia di guadagno vita non valida.');}
   else return fail('Clausola Oracle fuori dal perimetro del conteggio: '+original);
   o.abilities.push({id,kind:'triggered',text:original,...descriptor,...(capped?{maxPerTurn:1}:{})});
  }
  objects.push(o);
 }
 return {supported:true,objects};
}
function evaluate(prepared,event,answers,targetIndex){
 if(!prepared.supported||!['gainLife','putCounters','beginEndStep'].includes(event))return fail('Evento non supportato.');
 const objects=clone(prepared.objects),counts={};
 for(let i=0;i<objects.length;i++){
  const o=objects[i];if(!['A','B'].includes(answers['triggerController'+i]))return fail('Controllore non determinato.');o.controller=o.owner=answers['triggerController'+i];
  for(const a of o.abilities){
   if(a.kind!=='triggered')continue;
   a.event={type:a.eventKind};
   if(a.eventKind==='gainLife')a.event.player=o.controller;
   if(a.eventKind==='putCounters'){a.event.target=o.id;a.event.counterType='+1/+1';}
   if(a.eventKind==='beginEndStep'){
    if(a.ownStep)a.event.player=o.controller;
    a.interveningIf={path:'after.lifeGained.'+o.controller,op:'gte',value:a.lifeThreshold};
   }
   if(a.maxPerTurn!==undefined){if(!['yes','no'].includes(answers['triggerUsed:'+a.id]))return fail('Storico di innesco non determinato.');counts[JSON.stringify([a.id,o.objectIdentity])]=answers['triggerUsed:'+a.id]==='yes'?1:0;}
  }
 }
 if(objects.some((o,i)=>o.supertypes.includes('legendary')&&objects.some((other,j)=>j!==i&&other.name===o.name&&other.controller===o.controller)))return fail('La regola delle leggende deve essere verificata prima di questo evento.');
 if(event==='putCounters'&&(!Number.isInteger(targetIndex)||!objects[targetIndex]))return fail('La carta che riceve i segnalini non è indicata.');
 const state={players:[{id:'A',life:20},{id:'B',life:20}],objects,pendingTriggers:[],delayedTriggers:[],effects:[],turn:{activePlayer:'A',turnNumber:1},triggerUsage:{turnNumber:1,counts},lifeGained:{A:answers.lifeGainedA??0,B:answers.lifeGainedB??0}};
 // Positive amount is representative for this grammar: none of its supported
 // gain-life/counter triggers depends on the size of this single event.
 const ev=event==='gainLife'?{type:event,player:'A',amount:1}:event==='putCounters'?{type:event,target:objects[targetIndex].id,counterType:'+1/+1',amount:1}:{type:event,player:'A'};
 const transition=root.JudgeTriggerFlow.transition(state,clone(state),ev);
 if(!transition.supported)return fail(transition.reason);
 const pending=transition.state.pendingTriggers;
 const triggerSummary=objects.flatMap(o=>o.abilities.filter(a=>a.kind==='triggered').map(a=>({card:o.name,abilityId:a.id,eventKind:a.eventKind,text:a.text,count:pending.filter(t=>t.abilityId===a.id).length})));
 const labels={gainLife:'legata al guadagno di vite',putCounters:'legata ai segnalini +1/+1',beginEndStep:'di fine turno'};
 const events=triggerSummary.map(t=>({type:'triggerCount',description:t.card+': l’abilità '+labels[t.eventKind]+' si innesca '+t.count+' '+(t.count===1?'volta':'volte')+' all’evento indicato.'}));
 return {supported:true,status:'verified',outcome:{scope:'trigger-occurrence',results:[],triggerSummary,events,rules:['603.1','603.2','603.3',...(event==='beginEndStep'?['603.4']:[])]}};
}
async function guided(context){
 const unsupported=reason=>({status:'unsupported',title:'Conteggio degli inneschi non supportato',reason,diagnostic:{reasonCodes:['TRIGGER_SCENARIO_UNSUPPORTED']}});
 if(context.cards.length>4)return unsupported('Il percorso guidato considera fino a quattro carte.');
 let cards;try{cards=await Promise.all(context.cards.map(name=>root.JudgeOracleRecognition.fetchCard(name)))}catch(e){return unsupported(e.message)}
 const prepared=prepare(cards);if(!prepared.supported)return unsupported(prepared.reason);
 const targetIndex=context.counterTargetIndex??(/^\d+$/.test(context.answers?.counterTarget||'')?Number(context.answers.counterTarget):null);
 if(context.event==='putCounters'&&targetIndex==null)return {status:'question',key:'answers.counterTarget',question:'Quale carta riceve uno o più segnalini +1/+1?',options:cards.map((c,i)=>({id:String(i),label:c.name}))};
 const answers={...(context.answers||{})},facts=[];
 for(let i=0;i<prepared.objects.length;i++){
  const o=prepared.objects[i];
  facts.push({key:'triggerController'+i,question:'Chi controlla '+o.name+' rispetto al giocatore '+(context.event==='beginEndStep'?'di cui finisce il turno?':'che guadagna vite?'),options:[{id:'A',label:'Lo stesso giocatore'},{id:'B',label:'Un avversario'}]});
  if(context.controllers?.[i]!=null)answers['triggerController'+i]=context.controllers[i];
  for(const a of o.abilities.filter(a=>a.maxPerTurn!==undefined))facts.push({key:'triggerUsed:'+a.id,question:'L’abilità di '+o.name+' «'+a.text+'» si è già innescata in questo turno, da quando questa carta è sul campo?',options:[{id:'no',label:'No, non ancora'},{id:'yes',label:'Sì, si è già innescata'}]});
 }
 const thresholds=[...new Set(prepared.objects.flatMap(o=>o.abilities.map(a=>a.lifeThreshold).filter(Number.isSafeInteger)))].sort((a,b)=>a-b);
 if(context.event==='beginEndStep')for(const player of ['A','B']){const key='lifeGained'+player,n=answers[key];if(Number.isSafeInteger(n)&&n>=0)answers[key]=thresholds.filter(t=>t<=n).pop()??0;}
 if(context.event==='beginEndStep'&&thresholds.length)for(const player of ['A','B'])facts.push({key:'lifeGained'+player,question:'Quante vite ha guadagnato complessivamente in questo turno '+(player==='A'?'il giocatore di turno':'il suo avversario')+'?',options:[0,...thresholds].map((n,i,ns)=>({id:n,label:n===0?(ns[i+1]===1?'Nessuna':'Meno di '+ns[i+1]+' punti vita'):ns[i+1]?n+'–'+(ns[i+1]-1)+' punti vita':n+' o più punti vita'}))});
 const plan=root.JudgeQuestionPlanner.plan({facts,answers},s=>evaluate(prepared,context.event,s.answers,targetIndex));
 if(plan.status==='unsupported')return unsupported('Un’alternativa necessaria non è completamente verificabile nel perimetro degli inneschi.');
 if(!context.board)return {status:'question',key:'board',question:'Considero soltanto gli inneschi all’evento indicato, queste carte scoperte sul campo e nessun altro effetto. Le abilità in pila non vengono risolte. Confermi?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return unsupported('Gli altri effetti devono essere specificati prima del conteggio.');
 if(plan.status==='question')return {...plan,key:'answers.'+plan.key};
 return {status:'partial',title:'Inneschi all’evento indicato',reason:'All’evento indicato si innescano complessivamente '+plan.outcome.triggerSummary.reduce((n,t)=>n+t.count,0)+' abilità. Le abilità in pila e le conseguenze successive non sono risolte. La fonte delle regole non è autenticata.',outcome:plan.outcome,diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:plan.outcome,questionPlanning:plan,reasonCodes:[]}};
}
root.JudgeTriggerScenario={prepare,evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
