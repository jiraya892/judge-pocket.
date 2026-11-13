/* One blocked attacker, one blocker, fixed characteristics, no responses.
   Combat damage is simultaneous within each step; SBA happen between steps.
   Trample assignments and damage-triggered abilities remain unsupported. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=reason=>({supported:false,status:'unsupported',reason});
function evaluate(cards,attackerIndex,blockerIndex){
 if(!Number.isInteger(attackerIndex)||!Number.isInteger(blockerIndex)||attackerIndex===blockerIndex||!cards[attackerIndex]||!cards[blockerIndex])return fail('Attaccante e bloccante non validi.');
 const prepared=cards.map((c,i)=>root.JudgeCreatureTraits.prepare(c,i));
 if(prepared.some(p=>!p.supported))return fail('Una carta ha caratteristiche o abilità non completamente riconosciute per il combattimento.');
 const objects=prepared.map(p=>clone(p.object)),attacker=objects[attackerIndex],blocker=objects[blockerIndex];
 const traits=o=>o.recognizedCreatureTraits||[],has=(o,k)=>traits(o).includes(k);
 if(has(attacker,'trample'))return fail('Travolgere richiede una scelta di assegnazione dei danni non ancora implementata: non viene assunto che tutto il danno passi al giocatore.');
 if([attacker,blocker].some(o=>has(o,'lifelink')||has(o,'deathtouch')||o.protectionColors?.length))return fail('Legame vitale, tocco letale o protezione in combattimento non sono ancora supportati da questo percorso.');
 if(has(attacker,'defender')||has(attacker,'menace')||has(attacker,'flying')&&!has(blocker,'flying')&&!has(blocker,'reach'))return fail('L’attacco o il blocco dichiarato non è legale con le sole carte indicate.');
 for(const o of objects)o.owner=o.controller=o.id===blocker.id?'B':'A';
 const first=new Set([attacker,blocker].filter(o=>has(o,'first strike')||has(o,'double strike')).map(o=>o.id));
 let state=root.JudgeTurnPipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects,effects:[],replacements:objects.filter(o=>o.preventsDamage).map(o=>({id:'combat-prevent-'+o.id,operation:'prevent',match:{type:'dealDamage',target:o.id}})),stack:[],pendingTriggers:[],turn:{activePlayer:'A'}});
 const events=[],stages=first.size?['first','normal']:['normal'];
 for(const stage of stages){
  const a=state.objects.find(o=>o.id===attacker.id),b=state.objects.find(o=>o.id===blocker.id);
  if(a.zone!=='battlefield')break;
  const deals=o=>stage==='first'?first.has(o.id):!first.has(o.id)||has(o,'double strike');
  const assignments=[];
  if(b.zone==='battlefield'){
   if(deals(a)&&a.power>0)assignments.push({type:'dealDamage',source:a.id,target:b.id,amount:a.power});
   if(deals(b)&&b.power>0)assignments.push({type:'dealDamage',source:b.id,target:a.id,amount:b.power});
  }
  // A previously blocked attacker stays blocked. If the blocker has gone, a
  // nontrampling attacker assigns no damage, including its second damage step.
  events.push({type:'combatDamageStep',stage,description:(stage==='first'?'Prima sottofase di danno':'Sottofase di danno normale')+': '+(b.zone!=='battlefield'?a.name+' resta bloccata; non assegna danno al giocatore.':assignments.map(e=>state.objects.find(o=>o.id===e.source).name+' assegna '+e.amount+' danni a '+state.objects.find(o=>o.id===e.target).name).join('; ')||'nessuna creatura assegna danno.')});
  if(assignments.length){
   // The event pipeline applies both assignments before any local SBA.
   const applied=root.JudgeEventPipeline.run(state,assignments);if(!applied.supported)return fail(applied.reason);state=applied.state;
   const settled=root.JudgeLocalSBA.stabilizeBatch(state);if(!settled.supported)return fail(settled.reason);state=settled.state;
   for(const change of settled.changes){if(change.type!=='creatureLeaves')return fail('Azione basata sullo stato fuori dal perimetro.');const o=objects.find(o=>o.id===change.id);events.push({type:'creatureLeaves',id:o.id,name:o.name,reason:'lethalDamage',description:o.name+' viene distrutta per danno letale.'});}
  }
 }
 events.push({type:'playerCombatDamage',description:'Il giocatore in difesa subisce 0 danni: l’attaccante è bloccata e non ha travolgere.'});
 return {supported:true,status:'verified',outcome:{scope:'single-blocked-combat',playerDamage:0,events,results:state.objects.map(o=>({id:o.id,name:o.name,status:'verified',zone:o.zone,types:o.types,subtypes:o.subtypes,power:o.power,toughness:o.toughness,damage:o.damage||0})),rules:['510.1c','704.5g',...(first.size?['702.4b']:[]),...([attacker,blocker].some(o=>o.indestructible)?['702.12b']:[])]}};
}
async function guided(context){
 const unsupported=reason=>({status:'unsupported',title:'Combattimento non ancora supportato',reason,diagnostic:{reasonCodes:['COMBAT_SCENARIO_UNSUPPORTED']}});
 if(context.cards.length>4)return unsupported('Il percorso considera fino a quattro carte.');
 const parse=value=>typeof value==='string'&&/^\d+$/.test(value)?Number(value):null;
 const attacker=context.attackerIndex??parse(context.answers?.combatAttacker);
 if(attacker==null)return {status:'question',key:'answers.combatAttacker',question:'Quale creatura sta attaccando?',options:context.cards.map((name,i)=>({id:String(i),label:name}))};
 const blocker=context.blockerIndex??parse(context.answers?.combatBlocker)??(context.cards.length===2?1-attacker:null);
 if(blocker==null)return {status:'question',key:'answers.combatBlocker',question:'Quale creatura la blocca da sola?',options:context.cards.map((name,i)=>({id:String(i),label:name})).filter(o=>Number(o.id)!==attacker)};
 let cards;try{cards=await Promise.all(context.cards.map(name=>root.JudgeOracleRecognition.fetchCard(name)))}catch(e){return unsupported(e.message)}
 const r=evaluate(cards,attacker,blocker);if(!r.supported)return unsupported(r.reason);
 if(!context.board)return {status:'question',key:'board',question:'Considero una sola attaccante già bloccata da una sola creatura avversaria, nessun altro combattente, segnalino, danno precedente, pedina o comandante, nessuna azione tra le sottofasi e nessun altro effetto. Confermi?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return unsupported('Gli altri elementi devono essere specificati prima di risolvere il combattimento.');
 return {status:'partial',title:'Danni di un singolo combattimento',reason:r.outcome.events.map(e=>e.description).join(' ')+' La fonte delle regole non è autenticata: non è un verdetto definitivo.',outcome:r.outcome,diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:r.outcome,reasonCodes:[]}};
}
root.JudgeCombatScenario={evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
