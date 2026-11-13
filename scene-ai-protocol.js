/* Typed proposals from an untrusted language model. Structure and source coverage
   are checked; semantic correctness still requires user review, not an AI ruling. */
(function(root){'use strict';
const phases=new Set(['beginning','precombatMain','combat','postcombatMain','ending','main','unknown']);
const steps=new Set(['untap','upkeep','draw','beginCombat','declareAttackers','declareBlockers','firstStrikeDamage','combatDamage','endCombat','endStep','cleanup','unknown']);
const clone=x=>JSON.parse(JSON.stringify(x));
function schemaCheck(value,schema,path='$'){
 if(schema.anyOf){if(!schema.anyOf.some(s=>schemaCheck(value,s,path).length===0))return [path+': tipo non valido'];return [];}
 const type=value===null?'null':Array.isArray(value)?'array':Number.isInteger(value)?'integer':typeof value;
 if(schema.type!==type)return [path+': tipo non valido'];
 if(schema.enum&&!schema.enum.includes(value))return [path+': valore non previsto'];
 if(type==='string'&&(value.length<(schema.minLength||0)||value.length>(schema.maxLength??Infinity)||schema.pattern&&!new RegExp(schema.pattern).test(value)))return [path+': testo non valido'];
 if(type==='integer'&&(!Number.isSafeInteger(value)||value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity)))return [path+': numero non valido'];
 if(type==='array'){if(value.length<(schema.minItems||0)||value.length>(schema.maxItems??Infinity))return [path+': numero di elementi non valido'];return value.flatMap((v,i)=>schemaCheck(v,schema.items,path+'['+i+']'));}
 if(type==='object'){if(!value||Object.getPrototypeOf(value)!==Object.prototype)return [path+': oggetto non valido'];const keys=Object.keys(value),allowed=Object.keys(schema.properties||{});if((schema.required||[]).some(k=>!Object.prototype.hasOwnProperty.call(value,k))||schema.additionalProperties===false&&keys.some(k=>!allowed.includes(k)))return [path+': campi mancanti o non previsti'];return keys.flatMap(k=>schema.properties?.[k]?schemaCheck(value[k],schema.properties[k],path+'.'+k):[]);}
 return [];
}
function validate(proposal,text,schema){
 const errors=schemaCheck(proposal,schema);if(errors.length)return {supported:false,errors};
 const ids=new Set(proposal.cards.map(c=>c.id));if(ids.size!==proposal.cards.length)errors.push('Identificativi delle carte duplicati.');
 const quotes=[...proposal.cards.map(c=>c.quote),...proposal.facts.map(f=>f.quote),proposal.event.quote,proposal.question,...proposal.unresolved.map(u=>u.quote)].filter(Boolean);
 const covered=new Uint8Array(text.length);
 for(const quote of quotes){let at=text.indexOf(quote);if(at<0){errors.push('Citazione assente dalla descrizione: '+quote);continue;}while(at>=0){covered.fill(1,at,at+quote.length);at=text.indexOf(quote,at+quote.length);}}
 for(const card of proposal.cards)if(!card.quote.includes(card.mention)||!text.includes(card.mention))errors.push('Nome citato non riscontrato nel testo.');
 for(const fact of proposal.facts){
  if(fact.card!==null&&!ids.has(fact.card))errors.push('Fatto riferito a una carta inesistente.');
  if(['controller','owner','active_player','event_player'].includes(fact.kind)&&![null,'self','opponent','unknown'].includes(fact.value))errors.push('Giocatore non valido.');
  if(fact.kind==='zone'&&![null,'unknown','battlefield','stack','hand','graveyard','exile','library','command'].includes(fact.value))errors.push('Zona non valida.');
  if(fact.kind==='phase'&&!phases.has(fact.value))errors.push('Fase non valida.');
  if(fact.kind==='step'&&!steps.has(fact.value))errors.push('Sottofase non valida.');
  if(['damage','counter_plus1','counter_minus1','life_gained_this_turn','stack_position','copies'].includes(fact.kind)&&(!Number.isSafeInteger(fact.value)||fact.value<0))errors.push('Quantità di gioco non valida.');
  if(fact.kind==='tapped'&&typeof fact.value!=='boolean')errors.push('Stato tappato non valido.');
  if(['controller','owner','zone','damage','counter_plus1','counter_minus1','tapped','stack_position','copies','previous_cast'].includes(fact.kind)&&fact.card===null)errors.push('Carta mancante per il fatto.');
  if(fact.kind==='controller'&&fact.value!=='unknown'&&fact.value!==null&&!fact.negated&&/\b(?:non controllo|non controlla|do not control|don.t control|does not control)\b/i.test(fact.quote))errors.push('Una negazione è stata trasformata in un controllo positivo.');
 }
 for(const id of [proposal.event.actor,proposal.event.target])if(id!==null&&!ids.has(id))errors.push('Evento riferito a una carta inesistente.');
 if(['enter','cast','combat','block','attack','resolve'].includes(proposal.event.type)&&proposal.event.actor===null)errors.push('Carta protagonista dell’evento non identificata.');
 if(['combat','block'].includes(proposal.event.type)&&(proposal.event.target===null||proposal.event.target===proposal.event.actor))errors.push('Bloccante non distinto dall’attaccante.');
 if(proposal.event.type!=='unknown'&&!proposal.event.quote)errors.push('Evento privo di evidenza.');
 const missing=[];for(const match of text.matchAll(/[\p{L}\p{N}]+/gu))if(Array.from({length:match[0].length},(_,i)=>covered[match.index+i]).some(v=>!v))missing.push(match[0]);
 if(missing.length)errors.push('Parti della descrizione non rappresentate: '+missing.join(' ').slice(0,300));
 // Catch obvious quantity omissions even when another fact quotes a broad clause.
 for(const m of text.matchAll(/\b(\d+)\s*(danni|segnalini|punti vita|vite|damage|counters|life)\b/giu)){
  if(/[\/+−-]/.test(text[m.index-1]||''))continue;
  const inCard=proposal.cards.some(c=>c.mention.includes(m[0]));
  if(!inCard&&!proposal.facts.some(f=>f.value===Number(m[1])&&f.quote.includes(m[0]))&&!proposal.unresolved.some(u=>u.quote.includes(m[0])))errors.push('Quantità citata ma non rappresentata: '+m[0]);
 }
 return errors.length?{supported:false,errors}:{supported:true,proposal:clone(proposal),requiresConfirmation:true};
}
async function ground(proposal,text,catalogue,resolver){
 const baseline=root.JudgeSceneIntake.parse(text,catalogue),cards=[];
 for(const card of proposal.cards){
  const mention=root.JudgeSceneIntake.parse(card.mention,catalogue);if((mention.mentions||[]).length>1)return {supported:false,errors:['Un singolo nome contiene più carte: '+card.mention]};const ambiguity=mention.ambiguities?.find(a=>a.text===card.mention),exact=mention.mentions?.find(m=>m.text===card.mention&&m.name);
  let names=ambiguity?.candidates|| (exact?[exact.name]:card.name?[card.name]:[]);
  const choices=[];for(const name of [...new Set(names)].slice(0,8)){try{const data=await resolver(name);if(data&&data.name===name&&data.oracle_id)choices.push({name:data.name,oracleId:data.oracle_id,oracleText:data.oracle_text||'',typeLine:data.type_line||''})}catch(e){}}
  cards.push({...card,choices,selected:choices.length===1?choices[0].name:null,mappingProposed:!exact&&!ambiguity});
 }
 // A known card in the original may not vanish inside a model's broad quotation.
 for(const mention of baseline.mentions||[]){const represented=cards.some(c=>c.mention===mention.text||mention.name&&c.choices.some(choice=>choice.name===mention.name)&&(mention.text.includes(c.mention)||c.mention.includes(mention.text)));if(!represented)return {supported:false,errors:['La carta citata «'+mention.text+'» è stata omessa.']};}
 return {supported:true,proposal:clone(proposal),cards,text,requiresConfirmation:true};
}
function draft(grounded,selections={}){
 const p=grounded.proposal,errors=[],limitations=[],byId=new Map(),cards=[];
 for(const c of grounded.cards){const name=selections[c.id]||c.selected;if(!c.choices.some(choice=>choice.name===name)){errors.push('Scegli la carta per «'+c.mention+'».');continue;}byId.set(c.id,cards.length);cards.push(name);}
 if(cards.length<2||cards.length>4)errors.push('Il motore attuale richiede da due a quattro carte identificate.');
 if(new Set(cards).size!==cards.length)limitations.push('Più copie della stessa carta richiedono una rappresentazione esplicita degli oggetti.');
 if(errors.length)return {supported:false,errors};
 const d={version:1,parser:'general-model-reviewed',status:'ready',source:grounded.text,cards,controllers:cards.map(()=>null),answers:{},event:p.event.type==='unknown'?null:p.event.type,phase:null,step:null,activePlayer:null,eventPlayer:null,evidence:[],unresolved:[],ambiguities:[]};
 function set(key,value){if(d[key]!=null&&d[key]!==value)errors.push('Fatti incompatibili per '+key);else d[key]=value;}
 const player=v=>v==='self'?'A':v==='opponent'?'B':null;
 for(const f of p.facts){const i=f.card===null?null:byId.get(f.card);d.evidence.push({field:f.kind,text:f.quote,value:f.value});
  if(f.negated){limitations.push('Condizione negativa: '+f.quote);continue;}
  if(f.value===null||f.value==='unknown')continue;
  if(f.kind==='life_gained_this_turn'&&['now','before','history'].includes(f.time)){const owner=player(f.player);if(owner){const key='lifeGained'+owner;if(d.answers[key]!=null&&d.answers[key]!==f.value)errors.push('Totali di vite incompatibili.');else d.answers[key]=f.value;}else limitations.push('Totale di vite senza giocatore: '+f.quote);continue;}
  if(f.time==='question'&&f.kind==='question_amount')continue;
  if(f.kind==='background')continue;
  if(['no_other_effects','no_other_permanents'].includes(f.kind)&&f.value===true)continue;
  if(f.kind==='previous_cast'&&d.event==='enter'&&p.event.actor===f.card)continue;
  if(!['now','before'].includes(f.time)){limitations.push('Stato temporale da collegare: '+f.quote);continue;}
  if(f.kind==='controller'){const value=player(f.value);if(d.controllers[i]!=null&&d.controllers[i]!==value)errors.push('Controllori incompatibili.');else d.controllers[i]=value;}
  else if(f.kind==='phase')set('phase',f.value);
  else if(f.kind==='step')set('step',f.value);
  else if(f.kind==='active_player')set('activePlayer',player(f.value));
  else if(f.kind==='event_player')set('eventPlayer',player(f.value));
  else if(f.kind==='zone'&&(f.value==='battlefield'||d.event==='cast'&&f.card===p.event.actor&&f.value==='hand'))continue;
  else if(['damage','counter_plus1','counter_minus1'].includes(f.kind)&&f.value===0)continue;
  else if(f.kind==='tapped'&&f.value===false)continue;
  else limitations.push('Fatto riconosciuto ma non applicato dal motore: '+f.quote);
 }
 if(['enter','cast','combat','block'].includes(d.event)){const actor=byId.get(p.event.actor),target=byId.get(p.event.target);if(d.event==='enter')d.enteringIndex=actor;else if(d.event==='cast'){d.castingIndex=actor;d.caster=d.controllers[actor];if(target!=null)d.answers.spellTarget='guided-'+target;}else{d.attackerIndex=actor;d.blockerIndex=target;}}
 if(![null,'present','enter','cast','combat','block','gainLife','putCounters','beginUpkeep','beginEndStep','drawCards'].includes(d.event))limitations.push('Evento non ancora collegato al motore: '+d.event);
 if(d.step){const w=root.JudgeTurnStructure.windows.find(w=>w.step===d.step);if(w&&d.phase&&d.phase!==w.phase)errors.push('Fase e sottofase incompatibili.');else if(w)d.phase=w.phase;}
 if(['casting_legality','controller','life_total','other'].includes(p.questionIntent))limitations.push('Domanda riconosciuta ma non ancora risolta integralmente da questo percorso: '+p.questionIntent);
 if(p.questionIntent==='trigger_resolution'&&['gainLife','putCounters','beginEndStep'].includes(d.event))limitations.push('Questo percorso conta gli inneschi ma non ne risolve ancora tutta la catena.');
 if(p.unresolved.length)errors.push(...p.unresolved.map(u=>u.quote+': '+u.reason));
 if(errors.length)return {supported:false,errors};
 const converted=d.event==='cast'?{supported:true,context:{cards:d.cards,controllers:d.controllers,answers:d.answers,event:'cast',casting:String(d.castingIndex),casterPlayer:d.caster,playerFrame:'speaker',phase:d.phase,step:d.step,activePlayer:d.activePlayer,sourceDescription:d.source,intakeEvidence:d.evidence}}:root.JudgeSceneIntake.toContext(d);if(!converted.supported)return {supported:false,errors:[converted.reason]};
 converted.context.intakeLimitations=limitations;converted.context.intakeMethod='general-model-reviewed';
 return {...converted,requiresConfirmation:true};
}
root.JudgeSceneAIProtocol={schemaCheck,validate,ground,draft};
})(typeof window!=='undefined'?window:globalThis);
