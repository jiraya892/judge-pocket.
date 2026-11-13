/* Narrow real ETB path: ability-free entrants and fully parsed mandatory
   'another creature enters -> you gain N life' triggers. Gain-only triggers
   commute, so APNAP/within-player orders cannot change the final life deltas. */
(function(root){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
function prepare(cards,enteringIndex){
 const objects=[],amounts=new Map();
 for(let i=0;i<cards.length;i++){
  const c=cards[i],text=String(c.oracle_text||'').replace(/\([^()]*\)/g,'').trim();
  const m=/^Whenever another creature enters(?: the battlefield)?, you gain (\d+) life\.$/.exec(text);
  if(m){const o=root.JudgeGuidedBridge.cardObject(c,i);if(c.card_faces?.length||!o.types.includes('creature')||!Number.isSafeInteger(o.power)||!Number.isSafeInteger(o.toughness)||o.toughness<=0||!Number.isSafeInteger(Number(m[1])))return {supported:false};
   o.oracle_text='';o.objectIdentity=o.id+'-original';
   // 'Another' excludes its own entrance; no source-name exception is used.
   if(i!==enteringIndex){const ability={id:'entry-life-'+i,kind:'triggered',origin:'rulesText',event:{type:'enterBattlefield',target:'guided-'+enteringIndex},text};o.abilities=[ability];amounts.set(ability.id,Number(m[1]));}
   objects.push(o);
  }else{const p=root.JudgeCreatureTraits.prepare(c,i);if(!p.supported)return {supported:false};objects.push(p.object);}
 }
 return {supported:true,objects,amounts};
}
function evaluate(prepared,enteringIndex,answers){
 const fail=reason=>({supported:false,status:'unsupported',reason});
 const objects=clone(prepared.objects),entering=objects[enteringIndex];
 for(let i=0;i<objects.length;i++)objects[i].owner=objects[i].controller=answers['entryController'+i]||'A';
 const before=root.JudgeTurnPipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects:objects.filter((_,i)=>i!==enteringIndex),effects:[],replacements:[],stack:[],pendingTriggers:[],turn:{activePlayer:'A',priorityPlayer:'A'},activePlayer:'A'});
 const after=clone(before);after.objects=objects;entering.objectIdentity=entering.id+'-entered';
 const transition=root.JudgeTriggerFlow.transition(before,after);if(!transition.supported)return fail(transition.reason);
 let state=transition.state;
 const sba=root.JudgeLocalSBA.stabilizeBatch(state);if(!sba.supported||sba.changes.length)return fail('Ingresso con SBA non comprese nel perimetro.');
 state=sba.state;
 for(const trigger of state.pendingTriggers){const amount=prepared.amounts.get(trigger.abilityId);if(!Number.isSafeInteger(amount))return fail('Innesco non tradotto completamente.');trigger.kind='triggeredAbility';trigger.resolution='structured';trigger.instruction={type:'gainLife',player:trigger.controller,amount};}
 const count=state.pendingTriggers.length;
 if(count){const orders={};for(const player of ['A','B'])orders[player]=state.pendingTriggers.filter(t=>t.controller===player).map(t=>t.id).sort();
  const placed=root.JudgeTurnPipeline.apply(state,{type:'putTriggersOnStack',orders});if(!placed.supported)return fail(placed.reason);state=placed.state;
 }
 for(let i=0;i<count;i++)for(const player of ['A','B']){const step=root.JudgeTurnPipeline.apply(state,{type:'passPriority',player});if(!step.supported)return fail(step.reason);state=step.state;}
 if(state.stack.length||state.pendingTriggers.length)return fail('Inneschi non completamente risolti.');
 const lifeChanges=Object.fromEntries(state.players.map(p=>[p.id,p.life-20]));
 const events=[{type:'entersBattlefield',description:entering.name+' entra sul campo di battaglia.'},...Object.entries(lifeChanges).filter(([,n])=>n!==0).map(([player,amount])=>({type:'gainLife',description:'Il giocatore '+player+' guadagna '+amount+' '+(amount===1?'punto vita':'punti vita')+' grazie agli inneschi.'}))];
 return {supported:true,status:'verified',outcome:{results:state.objects.map(o=>({id:o.id,name:o.name,status:'verified',zone:o.zone,types:o.types,subtypes:o.subtypes,power:o.power,toughness:o.toughness})),events,lifeChanges,triggerCount:count,rules:count?['603.1','603.2','603.3','608.2c']:[]}};
}
async function guided(context){
 const fail=reason=>({status:'unsupported',title:'Ingresso non ancora supportato',reason,diagnostic:{reasonCodes:['ENTRY_SCENARIO_UNSUPPORTED']}});
 if(context.cards.length>3)return fail('La beta guidata considera fino a tre carte.');
 let cards;try{cards=await Promise.all(context.cards.map(name=>root.JudgeOracleRecognition.fetchCard(name)))}catch(e){return fail(e.message)}
 const p=prepare(cards,context.enteringIndex);if(!p.supported)return fail('L’ingresso guidato riconosce soltanto creature con le abilità esplicitamente implementate e inneschi obbligatori di guadagno vita.');
 const facts=[];for(let i=0;i<p.objects.length;i++)if(p.objects[i].abilities.some(a=>a.kind==='triggered'))facts.push({key:'entryController'+i,question:'Chi controlla '+p.objects[i].name+'?',options:[{id:'A',label:'Giocatore A'},{id:'B',label:'Giocatore B'}]});
 const plan=root.JudgeQuestionPlanner.plan({facts,answers:context.answers||{}},scenario=>evaluate(p,context.enteringIndex,scenario.answers));
 if(plan.status==='unsupported')return fail('Una delle alternative di ingresso non è completamente verificabile.');
 if(!context.board)return {status:'question',key:'board',question:'Considero una sola creatura che entra, le altre carte già sul campo, nessuna risposta, pedina, comandante, segnalino, danno o altro effetto. Confermi?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return fail('L’ingresso con altri effetti o risposte deve essere specificato e non viene simulato per ipotesi.');
 if(plan.status==='question')return {...plan,key:'answers.'+plan.key};
 const outcome=plan.outcome;
 return {status:'partial',title:'Ingresso e inneschi calcolati',reason:outcome.events.map(e=>e.description).join(' ')+' La fonte delle regole non è ancora autenticata: non è un verdetto definitivo.',outcome,diagnostic:{reasonCodes:[],calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:outcome,questionPlanning:plan}};
}
root.JudgeEntryScenario={prepare,evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
