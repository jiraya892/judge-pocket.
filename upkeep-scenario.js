/* CR 503/603: beginning-of-upkeep, unconditional fixed life-gain triggers.
   Closed Oracle grammar; no responses, other upkeep effects or trigger chains. */
(function(root){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
const fail=reason=>({supported:false,status:'unsupported',reason});
function prepare(cards){const objects=[],amounts={};
 for(let i=0;i<cards.length;i++){
  const card=cards[i],m=/^At the beginning of (your|each) upkeep, you (may )?gain (\d+) life\.$/.exec(String(card.oracle_text||'').trim());
  if(m){const o=root.JudgeGuidedBridge.cardObject(card,i),amount=Number(m[3]);if(card.card_faces?.length||!o.types.some(t=>['creature','artifact','enchantment'].includes(t))||o.types.includes('creature')&&(!Number.isSafeInteger(o.power)||!Number.isSafeInteger(o.toughness)||o.toughness<=0)||!Number.isSafeInteger(amount)||amount<1)return fail('Caratteristiche dell’innesco non riconosciute.');
   const id='upkeep-gain-'+i;o.oracle_text='';o.objectIdentity=o.id+'-upkeep';o.abilities=[{id,kind:'triggered',event:{type:'beginUpkeep'},ownStep:m[1]==='your',text:card.oracle_text}];objects.push(o);amounts[id]={amount,optional:!!m[2],index:i};
  }else{const p=root.JudgeCreatureTraits.prepare(card,i);if(!p.supported)return fail(p.reason);objects.push(p.object);}
 }return {supported:true,objects,amounts};
}
function evaluate(prepared,answers){
 if(!prepared.supported||!['A','B'].includes(answers.upkeepActive))return fail('Giocatore di turno non determinato.');
 const objects=clone(prepared.objects),active=answers.upkeepActive;
 for(let i=0;i<objects.length;i++){const o=objects[i];o.owner=o.controller=answers['upkeepController'+i]||'A';for(const a of o.abilities||[])if(a.kind==='triggered'&&a.ownStep)a.event.player=o.controller;}
 let state=root.JudgeTurnPipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects,effects:[],pendingTriggers:[],delayedTriggers:[],stack:[],turn:{activePlayer:active,phase:'beginning',step:'upkeep'},activePlayer:active});
 const check=root.JudgeLocalSBA.stabilizeBatch(state);if(!check.supported||check.changes.length)return fail('Il campo iniziale richiede altre azioni basate sullo stato.');
 const observed=root.JudgeTriggerFlow.transition(state,clone(state),{type:'beginUpkeep',player:active});if(!observed.supported)return fail(observed.reason);state=observed.state;
 for(const trigger of state.pendingTriggers){const detail=prepared.amounts[trigger.abilityId],choice=answers['upkeepGain'+detail?.index];if(detail?.optional&&!['yes','no'].includes(choice))return fail('Scelta facoltativa non determinata.');const amount=detail?.optional&&choice==='no'?0:detail?.amount;if(!Number.isSafeInteger(amount))return fail('Risoluzione dell’innesco sconosciuta.');Object.assign(trigger,{kind:'triggeredAbility',resolution:'structured',instruction:{type:'gainLife',player:trigger.controller,amount}});}
 const triggerCount=state.pendingTriggers.length,declined=state.pendingTriggers.filter(t=>{const d=prepared.amounts[t.abilityId];return d.optional&&answers['upkeepGain'+d.index]==='no'}).map(t=>objects.find(o=>o.id===t.source)?.name||'questa carta');
 if(triggerCount){const orders=Object.fromEntries(['A','B'].map(player=>[player,state.pendingTriggers.filter(t=>t.controller===player).map(t=>t.id)]));const placed=root.JudgeTurnPipeline.apply(state,{type:'putTriggersOnStack',orders});if(!placed.supported)return fail(placed.reason);state=placed.state;}
 for(let i=0;i<triggerCount;i++)for(const player of [active,active==='A'?'B':'A']){const r=root.JudgeTurnPipeline.apply(state,{type:'passPriority',player});if(!r.supported)return fail(r.reason);state=r.state;}
 if(state.stack.length||state.pendingTriggers.length)return fail('La pila del mantenimento non è completamente risolta.');
 const lifeChanges=Object.fromEntries(state.players.map(p=>[p.id,p.life-20]));
 const events=[{type:'upkeep',description:triggerCount?'All’inizio del mantenimento '+(triggerCount===1?'si innesca 1 abilità':'si innescano '+triggerCount+' abilità')+' di guadagno vita.':'All’inizio di questo mantenimento non si innescano abilità di guadagno vita di queste carte.'},...declined.map(name=>({type:'optionalDeclined',description:'Il controllore di '+name+' sceglie di non guadagnare vita.'})),...Object.entries(lifeChanges).filter(([,n])=>n).map(([player,n])=>({type:'gainLife',description:'Il giocatore '+player+' guadagna '+n+' '+(n===1?'punto vita':'punti vita')+' alla risoluzione.'}))];
 return {supported:true,status:'verified',outcome:{scope:'upkeep-life-gain',triggerCount,lifeChanges,events,results:state.objects.map(o=>({id:o.id,name:o.name,zone:o.zone,power:o.power,toughness:o.toughness,status:'verified'})),rules:['503.1','603.2','603.3','608.2c']}};
}
async function guided(context){
 const stop=reason=>({status:'unsupported',reason,diagnostic:{reasonCodes:['UPKEEP_UNSUPPORTED']}});
 if(context.cards.length>4)return stop('Il percorso considera fino a quattro carte.');
 let cards;try{cards=await Promise.all(context.cards.map(n=>root.JudgeOracleRecognition.fetchCard(n)))}catch(e){return stop(e.message)}
 const prepared=prepare(cards);if(!prepared.supported)return stop('Questo mantenimento contiene un effetto non ancora tradotto completamente: '+prepared.reason);
 const facts=[{key:'upkeepActive',question:'Di chi sta iniziando il mantenimento?',options:[{id:'A',label:'Giocatore A (tu)'},{id:'B',label:'Giocatore B (avversario)'}]},...prepared.objects.flatMap((o,i)=>o.abilities?.some(a=>a.kind==='triggered')?[{key:'upkeepController'+i,question:'Chi controlla '+o.name+'?',options:[{id:'A',label:'Giocatore A (tu)'},{id:'B',label:'Giocatore B (avversario)'}]}]:[])];
 for(const [id,detail]of Object.entries(prepared.amounts))if(detail.optional)facts.push({key:'upkeepGain'+detail.index,question:'Il controllore di '+cards[detail.index].name+' sceglie di guadagnare vita con l’abilità facoltativa?',options:[{id:'yes',label:'Sì, guadagna vita'},{id:'no',label:'No, rinuncia'}]});
 const answers={...(context.answers||{})};if(context.activePlayer)answers.upkeepActive=context.activePlayer;for(let i=0;i<cards.length;i++)if(context.controllers?.[i])answers['upkeepController'+i]=context.controllers[i];
 const plan=root.JudgeQuestionPlanner.plan({facts,answers},scenario=>evaluate(prepared,scenario.answers));if(plan.status==='unsupported')return stop('Un’alternativa necessaria del mantenimento non è verificabile.');
 if(!context.board)return {status:'question',key:'board',question:'Considero l’inizio del mantenimento con queste carte, nessun altro effetto o innesco, nessuna risposta, segnalino, danno precedente, pedina o comandante. Tutti lasciano risolvere le abilità. Confermi?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return stop('Gli altri elementi del mantenimento devono essere specificati.');
 if(plan.status==='question')return {...plan,key:'answers.'+plan.key};
 return {status:'partial',title:'Mantenimento calcolato',outcome:plan.outcome,diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:plan.outcome,reasonCodes:[],questionPlanning:plan}};
}
root.JudgeUpkeepScenario={prepare,evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
