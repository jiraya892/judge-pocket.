/* Source-grounded scene intake. Bounded language grammar, not a language model.
   Every unparsed clause is retained; no guessed fact reaches the rule engine. */
(function(root){'use strict';
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>norm(s).split(/\s+/).filter(Boolean);
const timingClause=s=>/^(?:siamo |sono |sta iniziando |sta cominciando )?(?:nella |nello |nell |nel |in |il |la |all inizio della |all inizio del |all inizio di |inizia la |inizia il )(.+)$/.exec(s)||/^(?:(?:we are|i am|we re|i m) )?(?:in|at the beginning of) (?:my opponent s |opponent s |my |the )?(.+)$/.exec(s);
function catalogue(names){
 const first=new Map(),aliases=new Map();
 const nameSet=new Set(names);
 for(const name of names){const faces=name.split(' // ');if(faces.length>1&&faces.every(part=>part===faces[0])&&nameSet.has(faces[0]))continue;const tokens=words(name);if(!tokens.length)continue;const item={name,tokens,alias:false};if(!first.has(tokens[0]))first.set(tokens[0],[]);first.get(tokens[0]).push(item);
  if(name.includes(',')){const alias=norm(name.split(',')[0]);if(alias.length>=4){if(!aliases.has(alias))aliases.set(alias,[]);aliases.get(alias).push(name);}}
 }
 for(const [alias,candidates]of aliases){const tokens=words(alias);if(!first.has(tokens[0]))first.set(tokens[0],[]);first.get(tokens[0]).push({tokens,candidates,alias:true});}
 for(const entries of first.values())entries.sort((a,b)=>b.tokens.length-a.tokens.length||Number(a.alias)-Number(b.alias));
 return {first};
}
function parse(text,index,resolutions={}){
 const fail=reason=>({status:'blocked',source:text,reason,cards:[],unresolved:[reason],ambiguities:[]});
 if(typeof text!=='string'||!text.trim())return fail('Descrivi le carte e cosa sta succedendo.');
 if(text.length>4000)return fail('La descrizione è troppo lunga: considera una sola interazione.');
 const tokenMatches=[...text.matchAll(/[\p{L}\p{N}]+/gu)].map(m=>({word:norm(m[0]),start:m.index,end:m.index+m[0].length}));
 if(tokenMatches.length>350)return fail('Considera una sola interazione alla volta.');
 const protectedRanges=[];
 for(const piece of text.matchAll(/(?:^|[.!?;\n])([^.!?;\n]+)/g)){const phase=timingClause(norm(piece[1]));if(phase&&root.JudgeTurnStructure?.interpret(phase[1].replace(/^(?:mio|mia) /,'').replace(/ del mio avversario$| dell avversario$/,'')).supported)protectedRanges.push([piece.index,piece.index+piece[0].length]);}
 const mentions=[],ambiguities=[];let cursor=0;
 while(cursor<tokenMatches.length){if(protectedRanges.some(([start,end])=>tokenMatches[cursor].start>=start&&tokenMatches[cursor].start<end)){cursor++;continue;}let match=null;
  for(const candidate of index.first.get(tokenMatches[cursor].word)||[]){const prefix=tokenMatches.slice(Math.max(0,cursor-7),cursor).map(t=>t.word).join(' ');if(candidate.alias&&root.JudgeTurnStructure?.interpret(candidate.tokens.join(' ')).supported&&/(?:siamo|sono) (?:nel|nella|nello|in)(?: mio)?$|all inizio (?:del|della)(?: mio)?$/.test(prefix))continue;if(candidate.tokens.every((word,j)=>tokenMatches[cursor+j]?.word===word)){match=candidate;break;}}
  if(!match){cursor++;continue;}
  const first=tokenMatches[cursor],last=tokenMatches[cursor+match.tokens.length-1],key=String(first.start),candidates=match.alias?match.candidates:[match.name];
  let name=candidates.length===1?candidates[0]:resolutions[key];
  if(!candidates.includes(name)){ambiguities.push({key,text:text.slice(first.start,last.end),candidates});name=null;}
  mentions.push({name,start:first.start,end:last.end,text:text.slice(first.start,last.end),key});cursor+=match.tokens.length;
 }
 const cards=[...new Set(mentions.map(m=>m.name).filter(Boolean))];
 if(cards.length>4)return {...fail('Il percorso attuale considera fino a quattro carte.'),cards,mentions};
 let masked='',offset=0;for(let i=0;i<mentions.length;i++){const m=mentions[i];masked+=text.slice(offset,m.start)+' REF'+i+' ';offset=m.end;}masked+=text.slice(offset);
 const clauses=masked.split(/[.!?;\n]+|\s+mentre\s+|,\s*(?=(?:io|il mio avversario|l.avversario)\b)/i).map(clause=>norm(clause.replace(/[-−]\s*(?=\d)/g,' negative ').replace(/[<>≤≥=]/g,' comparison '))).flatMap(clause=>clause.split(/\s+e\s+(?=controllo\b)|\s+(?=(?:ho (?:castato|lanciato)|(?:cosa|che cosa) succede|(?:il mio avversario|l avversario) (?:controlla|ha)|(?:all inizio|inizia il|inizia la)|ora ref\d+ (?:entra|sta entrando))\b)/)).filter(Boolean);
 const draft={version:1,parser:'bounded-grammar-v1',status:'ready',source:text,cards,mentions,ambiguities,unresolved:[],controllers:cards.map(()=>null),answers:{},event:null,phase:null,step:null,activePlayer:null,evidence:[],question:null};
 const indices=clause=>[...clause.matchAll(/\bref(\d+)\b/g)].map(m=>cards.indexOf(mentions[Number(m[1])]?.name));
 const list=clause=>{const ids=indices(clause);return ids.length&&new Set(ids).size===ids.length&&ids.every(i=>i>=0)&&!clause.replace(/\bref\d+\b/g,'').replace(/\b(?:e|ed|un|una|il|la|lo|l|anche)\b/g,'').trim()?ids:null;};
 function set(key,value,clause){if(draft[key]!=null&&draft[key]!==value)draft.unresolved.push('Informazioni incompatibili: '+clause);else{draft[key]=value;draft.evidence.push({field:key,text:clause});}}
 function own(ids,player,clause){for(const i of ids){if(draft.controllers[i]!=null&&draft.controllers[i]!==player)draft.unresolved.push('La stessa carta compare sotto controllori diversi: specifica le copie.');else draft.controllers[i]=player;}draft.evidence.push({field:'controllers',text:clause});}
 function event(value,clause){set('event',value,clause);}
 for(const rawClause of clauses){const clause=rawClause.replace(/^(?:(?:allora|praticamente|cioe) )+/, '').replace(/^ora /,'');let m,done=false;
  if((m=/^(?:io )?(controllo|ho(?: in campo| sul campo di battaglia)?) (.+)$/.exec(clause))||(m=/^(il mio avversario|l avversario|il giocatore avversario) (?:controlla|ha(?: in campo| sul campo di battaglia)?) (.+)$/.exec(clause))){
   let body=m[2],field=/\b(?:in campo|sul campo di battaglia)\b/.test(clause);body=body.replace(/ (?:in campo|sul campo di battaglia)$/,'');const ids=list(body);
   if(ids){const player=/avversario/.test(m[1])?'B':'A';const control=/\bcontroll[oa]\b/.test(clause)||field;
    // Possession alone is not proof of zone/control; ask the engine for missing facts.
    if(control)own(ids,player,clause);if(field)draft.evidence.push({field:'battlefield',text:clause});done=true;}
  }
  if(done)continue;
  const phaseClause=timingClause(clause);
  if(phaseClause&&root.JudgeTurnStructure){let phrase=phaseClause[1].replace(/^(?:mio|mia) /,'').replace(/ del mio avversario$| dell avversario$/,'');const timing=root.JudgeTurnStructure.interpret(phrase);if(timing.supported){set('phase',timing.phase,clause);if(timing.step)set('step',timing.step,clause);if(/(?:mio|mia|my) /.test(clause)&&!/avversario|opponent/.test(clause))set('activePlayer','A',clause);if(/avversario|opponent/.test(clause))set('activePlayer','B',clause);if(/all inizio|inizia|sta cominciando|at the beginning/.test(clause)){if(timing.step==='upkeep')event('beginUpkeep',clause);if(timing.step==='endStep')event('beginEndStep',clause);}continue;}}
  if((m=/^(?:in campo|sul campo di battaglia) (?:ci sono|c e) (.+)$/.exec(clause))){if(list(m[1])){draft.evidence.push({field:'battlefield',text:clause});continue;}}
  if((m=/^(.+) (?:sono|e|si trovano) (?:in campo|sul campo|sul campo di battaglia|sul tavolo)$/.exec(clause))){if(list(m[1])){draft.evidence.push({field:'battlefield',text:clause});continue;}}
  if((m=/^(?:siamo |sono )?(?:all inizio del|inizia il|all inizio del mio|all inizio del mantenimento del mio avversario|all inizio del mantenimento dell avversario) ?(mantenimento|upkeep)?$/.exec(clause))&&/mantenimento|upkeep/.test(clause)){
   event('beginUpkeep',clause);set('phase','upkeep',clause);if(/(?:mio|mia|my) /.test(clause)&&!/avversario|opponent/.test(clause))set('activePlayer','A',clause);if(/avversario|opponent/.test(clause))set('activePlayer','B',clause);continue;
  }
  if(/^(?:siamo|sono) (?:nel|in|nella) (?:mio |suo |mantenimento del mio avversario|mantenimento dell avversario)?(?:mantenimento|upkeep)?$/.test(clause)&&/mantenimento|upkeep/.test(clause)){
   set('phase','upkeep',clause);if(/nel mio|in mio/.test(clause))set('activePlayer','A',clause);if(/avversario|opponent/.test(clause))set('activePlayer','B',clause);continue;
  }
  if((m=/^(?:io )?attacco con (ref\d+) e (?:il mio avversario|l avversario) blocca con (ref\d+)$/.exec(clause))||(m=/^(?:il mio avversario|l avversario) attacca con (ref\d+) e (?:io )?blocco con (ref\d+)$/.exec(clause))){
   const [a,b]=indices(m[1]+' '+m[2]);event('combat',clause);set('attackerIndex',a,clause);set('blockerIndex',b,clause);const mine=clause.startsWith('attacco')||clause.startsWith('io ');own([a],mine?'A':'B',clause);own([b],mine?'B':'A',clause);continue;
  }
  if((m=/^(ref\d+) (?:viene|e) bloccat[oa] da (ref\d+)$/.exec(clause))){const [a,b]=indices(clause);event('combat',clause);set('attackerIndex',a,clause);set('blockerIndex',b,clause);continue;}
  if((m=/^puo (ref\d+) bloccare (ref\d+)$/.exec(clause))){const [b,a]=indices(clause);event('block',clause);set('attackerIndex',a,clause);set('blockerIndex',b,clause);continue;}
  if((m=/^(?:io )?ho guadagnato (\d+) (?:punti vita|vite) questo turno$/.exec(clause))){const amount=Number(m[1]);if(Number.isSafeInteger(amount)){draft.answers.lifeGainedA=amount;draft.evidence.push({field:'lifeGainedA',value:amount,text:clause});continue;}}
  if((m=/^(?:io )?guadagno (\d+) (?:punti vita|vite)$/.exec(clause))||(m=/^(?:il mio avversario|l avversario) guadagna (\d+) (?:punti vita|vite)$/.exec(clause))){const amount=Number(m[1]);if(Number.isSafeInteger(amount)&&amount>0){event('gainLife',clause);set('eventPlayer',/avversario/.test(clause)?'B':'A',clause);draft.evidence.push({field:'eventAmount',value:amount,text:clause});continue;}}
  if((m=/^(?:io )?ho (?:lanciato|castato) (ref\d+)$/.exec(clause))){set('historicalCastIndex',indices(clause)[0],clause);continue;}
  if(/^(?:cosa|che cosa) succede quando entra (?:in campo|sul campo di battaglia)$/.test(clause)&&draft.historicalCastIndex!=null){event('enter',clause);set('enteringIndex',draft.historicalCastIndex,clause);draft.question=clause;continue;}
  if((m=/^(?:(io|il mio avversario|l avversario) )?(?:lancio|casto|sto lanciando|sto castando|lancia|sta lanciando) (ref\d+)(?: (?:su|bersagliando|contro) (ref\d+))?$/.exec(clause))){const ids=indices(clause);event('cast',clause);set('castingIndex',ids[0],clause);set('caster',m[1]?.includes('avversario')?'B':'A',clause);if(ids.length>1)draft.answers.spellTarget='guided-'+ids[1];continue;}
  if((m=/^(ref\d+) (?:entra|sta entrando) (?:in campo|sul campo di battaglia)$/.exec(clause))){event('enter',clause);set('enteringIndex',indices(clause)[0],clause);continue;}
  if(/^(?:che cosa|cosa) (?:succede|accade)$|^come funziona(?: l interazione)?$|^chi (?:muore|sopravvive)$/.test(clause)){draft.question=clause;continue;}
  draft.unresolved.push(clause);
 }
 if(!draft.event&&draft.historicalCastIndex==null&&draft.evidence.some(e=>e.field==='battlefield'))draft.event='present';
 if(['combat','block'].includes(draft.event)&&draft.phase&&draft.phase!=='combat')draft.unresolved.push('Un attacco o blocco non può essere dichiarato durante il mantenimento senza altri elementi da specificare.');
 if(cards.length<2)draft.unresolved.push('Non ho identificato almeno due carte. Scrivi i nomi completi se necessario.');
 if(ambiguities.length||draft.unresolved.length)draft.status='clarification';
 return draft;
}
function toContext(draft){
 if(!draft||draft.status!=='ready'||draft.unresolved?.length||draft.ambiguities?.length||draft.cards.length<2||draft.cards.length>4)return {supported:false,reason:'La descrizione richiede chiarimenti.'};
 const validIndex=i=>Number.isInteger(i)&&i>=0&&i<draft.cards.length;
 if(!Array.isArray(draft.controllers)||draft.controllers.length!==draft.cards.length||draft.controllers.some(p=>p!==null&&!['A','B'].includes(p))||draft.activePlayer!=null&&!['A','B'].includes(draft.activePlayer)||draft.event==='enter'&&!validIndex(draft.enteringIndex)||draft.event==='cast'&&!validIndex(draft.castingIndex)||['combat','block'].includes(draft.event)&&(!validIndex(draft.attackerIndex)||!validIndex(draft.blockerIndex)||draft.attackerIndex===draft.blockerIndex))return {supported:false,reason:'Fatti strutturati non validi.'};
 const controls=[...draft.controllers],answers={...draft.answers};let activePlayer=draft.activePlayer;
 const base=['combat','block'].includes(draft.event)?controls[draft.attackerIndex]:draft.event==='cast'?draft.caster:null;
 if(['combat','block'].includes(draft.event)&&base==null&&controls.some(c=>c!=null))return {supported:false,reason:'Per collegare i controllori al combattimento, specifica chi sta attaccando.'};
 if(base==='B'){for(let i=0;i<controls.length;i++)if(controls[i])controls[i]=controls[i]==='A'?'B':'A';if(activePlayer)activePlayer=activePlayer==='A'?'B':'A';}
 if(['combat','block'].includes(draft.event)){if(draft.attackerIndex!=null)answers.combatAttacker=String(draft.attackerIndex);if(draft.blockerIndex!=null)answers.combatBlocker=String(draft.blockerIndex);}
 if(draft.event==='cast')for(let i=0;i<controls.length;i++)if(controls[i])answers['spellController:guided-'+i]=controls[i]==='A'?'own':'opponent';
 if(draft.event==='enter')for(let i=0;i<controls.length;i++)if(controls[i])answers['entryController'+i]=controls[i];
 return {supported:true,context:{cards:[...draft.cards],controllers:controls,answers,event:draft.event,phase:draft.phase,step:draft.step||null,activePlayer,casting:draft.castingIndex==null?null:String(draft.castingIndex),entering:draft.enteringIndex==null?null:String(draft.enteringIndex),playerFrame:['cast','combat','block'].includes(draft.event)?'actor':'speaker',eventPlayer:draft.eventPlayer||null,sourceDescription:draft.source,intakeEvidence:draft.evidence}};
}
root.JudgeSceneIntake={catalogue,parse,toContext};
})(typeof window!=='undefined'?window:globalThis);
