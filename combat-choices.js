/* Exhaustive legal assignment trees, including continuous keyword restrictions.
   Complete bounded outcomes only; no representative assignment is a ruling. */
(function(root){'use strict';
function variants(cards,a,b,controllers,legalityOnly,budget={remaining:512}){
 const leaves=[];let visited=0,error=null;
 function walk(assignments){
  if(error)return;
  if(++visited>512||--budget.remaining<0){error='Limite delle assegnazioni raggiunto.';return;}
  const r=root.JudgeCombatScenario.evaluate(cards,a,b,{controllers,assignments,enumerateChoices:true,legalityOnly});
  if(r.status==='choice'){
   const c=r.choice;if(c.maximum-c.minimum+1>32){error='Troppe assegnazioni possibili.';return;}
   for(let value=c.minimum;value<=c.maximum;value++)walk({...assignments,[c.key]:value});return;
  }
  if(!r.supported||r.status!=='verified'){error=r.reason||'Esito non verificato.';return;}
  leaves.push({assignments:r.outcome.resolvedAssignments||{},outcome:r.outcome});
 }
 walk({});return error?{supported:false,status:'unsupported',reason:error}:{supported:true,status:'verified',outcome:{variants:leaves}};
}
async function guided(context,cards,a,b){
 const fail=reason=>({status:'unsupported',reason,title:'Situazione non ancora supportata',diagnostic:{reasonCodes:['COMBAT_DOMAIN_UNSUPPORTED']}});
 const parsed=root.JudgeCombatScenario.prepare(cards);
 if(parsed.some(p=>!p.supported))return fail('Una delle abilità non è ancora riconosciuta completamente.');
 if(context.step==='endCombat')return fail('Hai indicato la fine del combattimento: i danni sono già avvenuti. Questo percorso ricostruisce il combattimento a partire dal blocco.');
 if(context.step==='combatDamage'&&parsed.some((p,i)=>(i===a||i===b)&&p.object.baseCombatTraits.some(k=>['first strike','double strike'].includes(k))||p.object.keywordRule==='first strike'))return fail('Per iniziare dalla sottofase di danno normale con attacco improvviso o doppio attacco occorre collegare lo stato dopo la prima sottofase. Non rieseguo il primo danno per ipotesi.');
 const facts=parsed.flatMap((p,i)=>(p.object.lethalRule||p.object.keywordRule)&&i!==a&&i!==b?[{key:'combatController'+i,question:'Chi controlla '+cards[i].name+'?',options:[{id:'A',label:'Il giocatore che attacca'},{id:'B',label:'Il giocatore che blocca'}]}]:[]);
 const answers={...(context.answers||{})};
 for(const f of facts){const index=Number(f.key.slice('combatController'.length));if(context.controllers?.[index]!=null)answers[f.key]=context.controllers[index];}
 let reason='';const budget={remaining:512};
 const plan=root.JudgeQuestionPlanner.plan({facts,answers},s=>{const controls=cards.map((_,i)=>i===a?'A':i===b?'B':s.answers['combatController'+i]??context.controllers?.[i]);const r=variants(cards,a,b,controls,context.event==='block',budget);if(!r.supported)reason=r.reason;return r;});
 if(plan.status==='unsupported')return fail(reason||'Un’alternativa necessaria non è verificabile.');
 if(!context.board)return {status:'question',key:'board',question:'Considero un’attaccante e un solo bloccante avversario stappato, senza danni precedenti, segnalini, pedine, comandanti, altre azioni o effetti. L’attaccante attacca un giocatore e nessuno lascia la partita durante la sequenza. Confermi?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return fail('Occorre specificare gli altri elementi del combattimento.');
 if(plan.status==='question')return {...plan,key:'answers.'+plan.key};
 let possibilities=plan.outcome.variants;
 for(const [key,value]of Object.entries(answers).filter(([key])=>key.startsWith('combatDamage:')))possibilities=possibilities.filter(v=>v.assignments[key]===value);
 if(!possibilities.length)return fail('Un’assegnazione indicata non è legale nel contesto aggiornato.');
 const signatures=new Set(possibilities.map(v=>JSON.stringify(v.outcome)));
 if(signatures.size>1){
  const key=['combatDamage:first','combatDamage:normal'].find(k=>new Set(possibilities.map(v=>v.assignments[k])).size>1);
  if(!key)return fail('Gli esiti differiscono per una scelta non identificata.');
  const amounts=[...new Set(possibilities.map(v=>v.assignments[key]))].sort((x,y)=>x-y);
  return {status:'question',key:'answers.'+key,question:'Nella '+(key.endsWith('first')?'prima sottofase':'sottofase normale')+', quanti danni di '+cards[a].name+' assegni a '+cards[b].name+'? Il resto va al giocatore.',options:amounts.map(n=>({id:n,label:n+' '+(n===1?'danno':'danni')+' al bloccante'}))};
 }
 const outcome=possibilities[0].outcome;
 return {status:'partial',title:'Analisi del combattimento',reason:outcome.events.map(e=>e.description).join(' '),outcome,diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:outcome,questionPlanning:plan,reasonCodes:[]}};
}
root.JudgeCombatChoices={guided,variants};
})(typeof window!=='undefined'?window:globalThis);
