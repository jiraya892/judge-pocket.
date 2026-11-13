/* Bounded cast -> priority -> resolution -> SBA scenario.
   Only a complete, fixed-damage Oracle sentence and otherwise ability-free
   creatures are accepted. Mana/casting legality and responses are explicit
   boundaries confirmed by the user, not rules inferred from card selection. */
(function(root){'use strict';
function evaluate(spell,permanents,targetId){
 const fail=reason=>({supported:false,status:'unsupported',reason});
 if(!Array.isArray(permanents)||!permanents.length||permanents.some(o=>o.zone!=='battlefield'||!o.types?.includes('creature')||!Number.isSafeInteger(o.power)||!Number.isSafeInteger(o.toughness)||o.toughness<=0||String(o.oracle_text||'').trim()||o.abilities?.length||o.damage!==0||Object.values(o.counters||{}).some(v=>v!==0)||o.token||o.isCommander))return fail('Creature o proprietà fuori dal perimetro della risoluzione.');
 if(!root.JudgeOracleSpell||!root.JudgeTurnPipeline)return fail('Motore di risoluzione mancante.');
 const compiled=root.JudgeOracleSpell.compile(spell,{controller:'A',target:targetId,objects:permanents});
 if(!compiled.supported||compiled.instruction?.type!=='dealDamage')return fail(compiled.reason||'Magia fuori dal perimetro dei danni a una creatura.');
 const source=root.JudgeGuidedBridge.cardObject(spell,permanents.length);source.id='cast-source';source.zone='stack';source.objectIdentity=source.id+'-cast';source.oracle_text='';
 let state=root.JudgeTurnPipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects:[...permanents,source],effects:[],replacements:permanents.filter(o=>o.preventsDamage).map(o=>({id:'prevent-'+o.id,operation:'prevent',match:{type:'dealDamage',target:o.id}})),stack:[],pendingTriggers:[],activePlayer:'A',turn:{activePlayer:'A',priorityPlayer:'A'}});
 const binding={id:targetId,kind:'object',zone:'battlefield',sourceController:'A',sourceColors:spell.colors,require:{types:['creature']}};
 const legality=root.JudgeTargets.check(state,binding);
 if(!legality.supported)return fail(legality.reason);
 if(!legality.legal){
  const target=permanents.find(o=>o.id===targetId);
  const rules=legality.code==='SHROUD'?['702.18a']:legality.code==='HEXPROOF'?['702.11b']:['702.16b'];
  return {supported:true,status:'verified',results:permanents.map(o=>({id:o.id,name:o.name,status:'verified',zone:o.zone,types:o.types,subtypes:o.subtypes,power:o.power,toughness:o.toughness,damage:o.damage||0})),events:[{type:'castingBlocked',description:spell.name+' non può bersagliare '+target.name+': '+legality.reason+'. Nessun danno viene inflitto.'}],rules,warnings:[],castLegal:false};
 }
 const instruction={...compiled.instruction,targetId};
 const push=root.JudgeTurnPipeline.apply(state,{type:'pushStack',kind:'spell',controller:'A',card:spell.name,cardObjectId:source.id,resolvesTo:'graveyard',description:spell.oracle_text,instruction,targets:[binding]});
 if(!push.supported)return fail(push.reason);state=push.state;
 for(const player of ['A','B']){const next=root.JudgeTurnPipeline.apply(state,{type:'passPriority',player});if(!next.supported)return fail(next.reason);state=next.state;}
 if(state.stack.length||state.pendingTriggers?.length||state.objects.find(o=>o.id===source.id)?.zone!=='graveyard')return fail('Risoluzione non completamente stabilizzata.');
 const target=permanents.find(o=>o.id===targetId),after=state.objects.find(o=>o.id===targetId);
 const events=target.preventsDamage?[{type:'damagePrevented',description:'I '+compiled.instruction.amount+' danni che '+spell.name+' infliggerebbe a '+target.name+' vengono prevenuti.'}]:[{type:'dealDamage',description:spell.name+' infligge '+compiled.instruction.amount+' danni a '+target.name+'.'}];
 if(after.zone==='graveyard')events.push({type:'creatureLeaves',id:after.id,name:after.name,reason:'lethalDamage',power:after.power,toughness:after.toughness});
 const results=state.objects.map(o=>({id:o.id,name:o.name,status:'verified',zone:o.zone,types:o.types,subtypes:o.subtypes,power:o.power,toughness:o.toughness,damage:o.damage||0}));
 const rules=['608.2b','608.2c'];if(after.zone==='graveyard')rules.push('704.5g');if(target.preventsDamage)rules.push('615.1');if(target.indestructible&&after.damage>=after.toughness)rules.push('702.12b');
 return {supported:true,status:'verified',results,events,rules,warnings:[]};
}
async function guided(context){
 const fail=(code,reason)=>({status:'unsupported',title:'Interazione non ancora supportata',reason,diagnostic:{reasonCodes:[code]}});
 if(!Number.isInteger(context.castingIndex)||context.castingIndex<0||context.castingIndex>=context.cards.length||context.cards[context.castingIndex]!==context.casting)return fail('CASTING_UNKNOWN','La magia da risolvere non è stata identificata.');
 if(context.cards.length>4)return fail('SCENARIO_DOMAIN_LIMIT','La beta guidata considera fino a quattro carte.');
 let cards;try{cards=await Promise.all(context.cards.map(n=>root.JudgeOracleRecognition.fetchCard(n)))}catch(error){return fail('ORACLE_LOOKUP_FAILED',error.message)}
 if(context.phase&&!['precombatMain','postcombatMain','main','main1','main2'].includes(context.phase)&&/\bSorcery\b/.test(cards[context.castingIndex].type_line||''))return fail('SORCERY_TIMING_REVIEW','Hai indicato una stregoneria fuori dalla fase principale: occorre verificare una specifica autorizzazione al lancio, che questo percorso non applica automaticamente.');
 if(root.JudgeSweeperScenario?.recognize(cards[context.castingIndex]))return root.JudgeSweeperScenario.guided(context,cards);
 const spell=cards[context.castingIndex],permanents=[];
 for(let i=0;i<cards.length;i++){
  if(i===context.castingIndex)continue;
  const prepared=root.JudgeCreatureTraits?.prepare(cards[i],i);
  if(!prepared?.supported)return fail('SPELL_CONTEXT_UNSUPPORTED',prepared?.reason||'Abilità della creatura fuori dal perimetro della beta.');
  const o=prepared.object;o.controller='B';o.owner='B';permanents.push(o);
 }
 const facts=[{key:'spellTarget',question:'Quale creatura vuoi bersagliare con la magia?',options:permanents.map(o=>({id:o.id,label:o.name}))}];
 for(const o of permanents)if(o.hexproof)facts.push({key:'spellController:'+o.id,question:'Chi controlla '+o.name+' rispetto al giocatore che lancia la magia?',options:[{id:'own',label:'Lo stesso giocatore'},{id:'opponent',label:'Un avversario'}]});
 let scenarioFailure;
 const plan=root.JudgeQuestionPlanner.plan({facts,answers:context.answers||{}},scenario=>{const candidate=permanents.map(o=>({...o,controller:o.hexproof&&scenario.answers['spellController:'+o.id]==='own'?'A':'B'}));const out=evaluate(spell,candidate,scenario.answers.spellTarget);if(!out.supported){scenarioFailure=out.reason;return out}return {supported:true,status:out.status,outcome:{results:out.results,events:out.events,rules:out.rules}}});
 if(plan.status==='unsupported')return fail('SPELL_SCENARIO_UNSUPPORTED','Il testo della magia o un esito necessario non è ancora completamente supportato. '+(scenarioFailure||''));
 if(!context.board)return {status:'question',key:'board',question:'Considero pagabili i costi e soddisfatte le altre condizioni di lancio; verifico se la magia può bersagliare una delle creature indicate. Non ci sono risposte, segnalini, pedine, comandanti, danni già segnati o altri effetti. È la situazione che vuoi verificare?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return fail('OPEN_SPELL_SCENARIO','Le risposte, i costi e gli effetti aggiuntivi devono essere specificati: non vengono ignorati.');
 if(plan.status==='question')return {...plan,key:'answers.'+plan.key};
 const outcome=plan.outcome;
 return {status:'partial',title:'Risoluzione calcolata nel contesto dichiarato',reason:outcome.events.map(e=>e.description||(e.name+' viene distrutta per danno letale.')).join(' ')+' La fonte delle regole non è ancora autenticata; non è un verdetto definitivo.',outcome,diagnostic:{reasonCodes:[],calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:outcome,questionPlanning:plan}};
}
root.JudgeSpellScenario={evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
