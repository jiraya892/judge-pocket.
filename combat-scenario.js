/* One blocked attacker, one blocker, fixed characteristics, no responses.
   Combat damage is simultaneous within each step; SBA happen between steps.
   Legal trample assignments are enumerated; damage triggers remain unsupported. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=reason=>({supported:false,status:'unsupported',reason});
const lethalRule='Lethal damage dealt to creatures you control is determined by their power rather than their toughness.';
function prepare(cards){return cards.map((card,i)=>{
 const lines=String(card.oracle_text||'').split('\n'),usesPower=lines.includes(lethalRule);
 const grant=lines.map(line=>/^Creatures you control have (.+)\.$/.exec(line)).find(Boolean);
 const deny=grant&&'Creatures your opponents control lose '+grant[1]+" and can't have or gain "+grant[1]+'.';
 const keywordRule=grant&&lines.includes(deny)&&['flying','first strike','trample','deathtouch','hexproof'].includes(grant[1])?grant[1]:null;
 const p=root.JudgeCreatureTraits.prepare({...card,oracle_text:lines.filter(line=>line!==lethalRule&&(!keywordRule||line!==grant[0]&&line!==deny)).join('\n')},i);
 if(p.supported){if(usesPower)p.object.lethalRule='power';if(keywordRule)p.object.keywordRule=keywordRule;p.object.baseCombatTraits=[...p.object.recognizedCreatureTraits];p.object.colors=Array.isArray(card.colors)?[...card.colors]:null;}
 return p;
});}
function lethalRules(state){
 for(const o of state.objects){if(!o.baseCombatTraits)continue;const traits=new Set(o.baseCombatTraits);for(const source of state.objects.filter(s=>s.zone==='battlefield'&&s.keywordRule&&s.controller===o.controller))traits.add(source.keywordRule);for(const source of state.objects.filter(s=>s.zone==='battlefield'&&s.keywordRule&&s.controller!==o.controller))traits.delete(source.keywordRule);o.recognizedCreatureTraits=[...traits];o.indestructible=traits.has('indestructible');}

 const controllers=new Set(state.objects.filter(o=>o.zone==='battlefield'&&o.lethalRule==='power').map(o=>o.controller));
 for(const o of state.objects)o.lethalDamageUsesPower=o.zone==='battlefield'&&controllers.has(o.controller);
}
function settle(state){
 const changes=[];
 for(let i=0;i<=state.objects.length;i++){
  lethalRules(state);
  const r=root.JudgeLocalSBA.stabilizeBatch(state);if(!r.supported)return r;
  state=r.state;changes.push(...r.changes);
  if(!r.changes.length)return {supported:true,state,changes};
 }
 return fail('Limite di stabilizzazione delle regole del danno letale.');
}
function evaluate(cards,attackerIndex,blockerIndex,options={}){
 if(!Number.isInteger(attackerIndex)||!Number.isInteger(blockerIndex)||attackerIndex===blockerIndex||!cards[attackerIndex]||!cards[blockerIndex])return fail('Attaccante e bloccante non validi.');
 const prepared=prepare(cards);
 if(prepared.some(p=>!p.supported))return fail('Una carta ha caratteristiche o abilità non completamente riconosciute per il combattimento.');
 const objects=prepared.map(p=>clone(p.object)),attacker=objects[attackerIndex],blocker=objects[blockerIndex];
 const traits=o=>o.recognizedCreatureTraits||[],has=(o,k)=>traits(o).includes(k);
 for(let i=0;i<objects.length;i++){
  const o=objects[i],role=i===attackerIndex?'A':i===blockerIndex?'B':null;
  if(role&&options.controllers?.[i]!=null&&options.controllers[i]!==role)return fail('I controllori indicati non corrispondono ai ruoli dell’attacco e del blocco.');
  if((o.lethalRule||o.keywordRule)&&role===null&&!['A','B'].includes(options.controllers?.[i]))return fail('Il controllore di un effetto sul danno letale non è noto.');
  o.owner=o.controller=role||options.controllers?.[i]||'A';
 }
 lethalRules({objects});
 if([attacker,blocker].some(o=>!Array.isArray(o.colors)))return fail('Colori delle creature non determinati.');
 const illegal=has(attacker,'defender')?'Difensore impedisce questo attacco.':attacker.cantBeBlocked?'Questa creatura non può essere bloccata.':has(attacker,'menace')?'Minaccia richiede almeno due bloccanti.':has(attacker,'flying')&&!has(blocker,'flying')&&!has(blocker,'reach')?'Una creatura con volare richiede un bloccante con volare o raggiungere.':attacker.protectionColors?.some(c=>blocker.colors.includes(c))?'La protezione dell’attaccante impedisce a questo bloccante di bloccarla.':null;
 const blockOutcome=()=>({supported:true,status:'verified',outcome:{scope:'block-legality',canBlock:!illegal,results:[],events:[{type:'blockLegality',description:illegal||blocker.name+' può bloccare '+attacker.name+'.'}],rules:['509.1',...(has(attacker,'defender')?['702.3b']:[]),...(attacker.cantBeBlocked?['509.1b']:[]),...(has(attacker,'menace')?['702.111b']:[]),...(has(attacker,'flying')?['702.9']:[]),...(attacker.protectionColors?.length?['702.16f']:[]),...(objects.some(o=>o.keywordRule)?['101.2','613.1f']:[])]}});
 if(illegal&&!options.legalityOnly)return fail('L’attacco o il blocco dichiarato non è legale: '+illegal);
 const first=new Set([attacker,blocker].filter(o=>has(o,'first strike')||has(o,'double strike')).map(o=>o.id));
 let state=root.JudgeTurnPipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects,effects:[],replacements:[...objects.filter(o=>o.preventsDamage).map(o=>({id:'combat-prevent-'+o.id,operation:'prevent',match:{type:'dealDamage',target:o.id}})),...[attacker,blocker].flatMap(target=>[attacker,blocker].filter(source=>source.id!==target.id&&target.protectionColors?.some(c=>source.colors.includes(c))).map(source=>({id:'protection-'+target.id+'-'+source.id,operation:'prevent',match:{type:'dealDamage',source:source.id,target:target.id}})))],stack:[],pendingTriggers:[],turn:{activePlayer:'A'}});
 const initial=settle(state);if(!initial.supported||initial.changes.length)return fail('Il campo iniziale richiede altre azioni basate sullo stato prima del combattimento.');state=initial.state;
 if(options.legalityOnly)return blockOutcome();
 let playerDamage=0;const resolvedAssignments={},choiceDomains=[];
 const events=[],stages=first.size?['first','normal']:['normal'];
 for(const stage of stages){
  const a=state.objects.find(o=>o.id===attacker.id),b=state.objects.find(o=>o.id===blocker.id);
  if(a.zone!=='battlefield')break;
  const deals=o=>stage==='first'?first.has(o.id):!first.has(o.id)||has(o,'double strike');
  lethalRules(state);
  const assignments=[];let spill=0;
  if(b.zone==='battlefield'){
   if(deals(a)&&a.power>0){let amount=a.power;if(has(a,'trample')){const threshold=b.lethalDamageUsesPower?b.power:b.toughness;const need=b.damage>0&&b.damage>=threshold?0:has(a,'deathtouch')?1:Math.max(1,threshold-b.damage);const minimum=Math.min(a.power,need),key='combatDamage:'+stage;choiceDomains.push({key,minimum,maximum:a.power});if(options.enumerateChoices&&options.assignments?.[key]===undefined&&minimum<a.power)return {supported:false,status:'choice',choice:{key,minimum,maximum:a.power,target:b.name}};amount=options.assignments?.[key]??(minimum===a.power?minimum:options.allToBlocker?a.power:undefined);if(!Number.isSafeInteger(amount)||amount<minimum||amount>a.power)return fail('Assegnazione di travolgere mancante o non valida.');resolvedAssignments[key]=amount;spill=a.power-amount;}if(amount)assignments.push({type:'dealDamage',source:a.id,target:b.id,amount,...(has(a,'deathtouch')?{deathtouch:true}:{})});}
   if(deals(b)&&b.power>0)assignments.push({type:'dealDamage',source:b.id,target:a.id,amount:b.power,...(has(b,'deathtouch')?{deathtouch:true}:{})});
  }
  if(b.zone!=='battlefield'&&deals(a)&&has(a,'trample')){spill=Math.max(0,a.power);resolvedAssignments['combatDamage:'+stage]=0;}
  playerDamage+=spill;
  // A previously blocked attacker stays blocked. If the blocker has gone, a
  // nontrampling attacker assigns no damage, including its second damage step.
  events.push({type:'combatDamageStep',stage,description:(stage==='first'?'Prima sottofase di danno':'Sottofase di danno normale')+': '+(b.zone!=='battlefield'?(has(a,'trample')?a.name+' resta bloccata e assegna '+spill+' danni al giocatore grazie a travolgere.':a.name+' resta bloccata; non assegna danno al giocatore.'):assignments.map(e=>state.objects.find(o=>o.id===e.source).name+' assegna '+e.amount+' danni a '+state.objects.find(o=>o.id===e.target).name).join('; ')||'nessuna creatura assegna danno.')});
  if(spill)events.push({type:'playerDamage',description:a.name+' infligge '+spill+' danni al giocatore in difesa grazie a travolgere.'});
  if(assignments.length||spill){
   // The event pipeline applies both assignments before any local SBA.
   const applied=assignments.length?root.JudgeEventPipeline.run(state,assignments):{supported:true,state,appliedEvents:[]};if(!applied.supported)return fail(applied.reason);state=applied.state;
   // Lifelink is part of dealing damage, not a trigger waiting until after SBA.
   // This closed grammar has no gain-life triggers or additional replacements.
   const gains=applied.appliedEvents.filter(e=>e.type==='dealDamage'&&e.amount>0&&has(state.objects.find(o=>o.id===e.source),'lifelink')).map(e=>({type:'gainLife',player:state.objects.find(o=>o.id===e.source).controller,amount:e.amount}));
   if(spill&&has(a,'lifelink'))gains.push({type:'gainLife',player:a.controller,amount:spill});
   if(gains.length){const gained=root.JudgeEventPipeline.run(state,gains);if(!gained.supported)return fail(gained.reason);state=gained.state;}
   const settled=settle(state);if(!settled.supported)return fail(settled.reason);state=settled.state;
   for(const change of settled.changes){if(change.type!=='creatureLeaves')return fail('Azione basata sullo stato fuori dal perimetro.');const o=objects.find(o=>o.id===change.id);events.push({type:'creatureLeaves',id:o.id,name:o.name,reason:'lethalDamage',description:o.name+' viene distrutta per danno letale.'});}
  }
 }
 const lifeChanges=Object.fromEntries(state.players.map(p=>[p.id,p.life-20]));
 events.push({type:'playerCombatDamage',description:'Il giocatore in difesa subisce '+playerDamage+' danni.'});
 return {supported:true,status:'verified',outcome:{scope:'single-blocked-combat',attackerId:attacker.id,blockerId:blocker.id,powerThresholdSources:objects.filter(o=>o.lethalRule).map(o=>o.name),globalKeywordSources:objects.filter(o=>o.keywordRule).map(o=>o.name),resolvedAssignments,choiceDomains,playerDamage,lifeChanges,events,results:state.objects.map(o=>({id:o.id,name:o.name,status:'verified',zone:o.zone,types:o.types,subtypes:o.subtypes,power:o.power,toughness:o.toughness,indestructible:!!o.indestructible,damage:o.damage||0})),rules:['510.1c','704.5g',...(Object.keys(resolvedAssignments).length?['702.19']:[]),...(first.size?['702.4b']:[]),...([attacker,blocker].some(o=>o.indestructible)?['702.12b']:[]),...([attacker,blocker].some(o=>has(o,'deathtouch'))?['702.2b','704.5h']:[]),...([attacker,blocker].some(o=>has(o,'lifelink'))?['702.15b']:[]),...(objects.some(o=>o.lethalRule)?['101.1']:[]),...([attacker,blocker].some(o=>o.protectionColors?.length)?['702.16e']:[]),...(objects.some(o=>o.preventsDamage)?['615.1']:[]),...(objects.some(o=>o.keywordRule)?['101.2','613.1f']:[])]}};
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
 if(root.JudgeCombatChoices)return root.JudgeCombatChoices.guided(context,cards,attacker,blocker);
 return unsupported('Pianificatore delle assegnazioni non disponibile.');
}
root.JudgeCombatScenario={prepare,evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
