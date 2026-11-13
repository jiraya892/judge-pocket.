/* Count requested single-card draws, not actual draws or a resolved hand/library.
   Only unconditional, complete draw multipliers and one fixed draw instruction.
   Replacement orders are all evaluated; no choice is inferred from card names. */
(function(root){'use strict';
const fail=reason=>({supported:false,status:'unsupported',reason});
const amounts={a:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7};
const number=text=>amounts[text]??(/^\d+$/.test(text)?Number(text):NaN);
const permutations=xs=>xs.length<2?[xs]:xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(rest=>[x,...rest]));
function prepare(cards){
 const modifiers=[],sources=[];
 for(let i=0;i<cards.length;i++){
  const c=cards[i],text=String(c.oracle_text||'').replace(/\([^()]*\)/g,'').trim();let m;
  if(c.card_faces?.length)return fail('Le carte a più facce non sono supportate in questo conteggio.');
  if((m=/^If you would draw a card, draw (\w+|\d+) cards instead\.$/.exec(text))){
   if(!/\b(?:Creature|Enchantment|Artifact)\b/.test(c.type_line||''))return fail('Fonte di sostituzione non riconosciuta come permanente.');
   if(/\bCreature\b/.test(c.type_line)&&(!/^-?\d+$/.test(c.power||'')||!/^\d+$/.test(c.toughness||'')||Number(c.toughness)<1))return fail('Caratteristiche della creatura non determinate.');
   const value=number(m[1]);if(!Number.isSafeInteger(value)||value<1)return fail('Moltiplicatore di pescata non valido.');
   modifiers.push({index:i,name:c.name,value,legendary:/\bLegendary\b/.test(c.type_line)});
  }else if((m=/^Draw (\w+|\d+) cards?(?:, then put (\w+|\d+) cards? from your hand on top of your library in any order)?\.$/.exec(text))&&/\b(?:Instant|Sorcery)\b/.test(c.type_line||'')){
   const amount=number(m[1]),putBack=m[2]?number(m[2]):0;
   if(!Number.isSafeInteger(amount)||amount<1||amount>1000||!Number.isSafeInteger(putBack)||putBack<0)return fail('Istruzione di pescata fuori dal limite sicuro.');
   sources.push({index:i,name:c.name,amount,putBack});
  }else return fail('Il testo Oracle contiene una condizione o un effetto non supportato dal conteggio delle pescate.');
 }
 if(sources.length!==1||!modifiers.length)return fail('Seleziona una sola magia di pescata supportata e i permanenti che modificano le sue pescate.');
 return {supported:true,source:sources[0],modifiers};
}
function evaluate(prepared,answers){
 if(!prepared.supported)return prepared;
 if(prepared.modifiers.some(m=>!['A','B'].includes(answers['drawController'+m.index])))return fail('Controllore della sostituzione non determinato.');
 const active=prepared.modifiers.filter(m=>answers['drawController'+m.index]==='A');
 if(active.some((m,i)=>m.legendary&&active.some((n,j)=>j!==i&&n.name===m.name)))return fail('Più permanenti leggendari con lo stesso nome richiedono la verifica della regola delle leggende.');
 const effects=active.map(m=>({id:'draw-replacement-'+m.index,operation:'multiply',match:{type:'drawCard',player:'A'},value:m.value}));
 const totals=[];
 for(const order of permutations(effects.map(e=>e.id))){
  const r=root.JudgeReplacements.process({type:'drawCard',player:'A',amount:1},effects,order);
  if(!r.supported||!r.event||r.event.type!=='drawCard')return fail(r.reason||'Pescata sostituita non determinabile.');
  totals.push(r.event.amount);
 }
 if(new Set(totals).size!==1)return fail('L’ordine delle sostituzioni cambia il risultato e deve essere specificato.');
 const requestedDraws=prepared.source.amount*totals[0];
 if(!Number.isSafeInteger(requestedDraws))return fail('Numero di pescate fuori intervallo.');
 const events=[{type:'drawInstructions',description:prepared.source.name+' richiede '+requestedDraws+' pescate singole al posto delle '+prepared.source.amount+' iniziali. Ogni sostituzione si applica una sola volta a ciascuna pescata originaria e alle pescate che ne derivano.'}];
 if(prepared.source.putBack)events.push({type:'putBackInstructions',description:'L’istruzione successiva richiede di mettere '+prepared.source.putBack+' carte dalla mano in cima al grimorio. Le sostituzioni delle pescate non modificano questo numero.'});
 return {supported:true,status:'verified',outcome:{scope:'draw-instructions',results:[],originalDraws:prepared.source.amount,requestedDraws,putBackInstructions:prepared.source.putBack,events,rules:['121.2','614.1a','614.5','616.1']}};
}
async function guided(context){
 const unsupported=reason=>({status:'unsupported',title:'Pescate non ancora supportate',reason,diagnostic:{reasonCodes:['DRAW_SCENARIO_UNSUPPORTED']}});
 if(context.cards.length>4)return unsupported('Il percorso considera fino a quattro carte.');
 let cards;try{cards=await Promise.all(context.cards.map(name=>root.JudgeOracleRecognition.fetchCard(name)))}catch(e){return unsupported(e.message)}
 const prepared=prepare(cards);if(!prepared.supported)return unsupported(prepared.reason);
 const answers={...(context.answers||{})},facts=prepared.modifiers.map(m=>({key:'drawController'+m.index,question:'Chi controlla '+m.name+' rispetto al giocatore che deve pescare?',options:[{id:'A',label:'Lo stesso giocatore'},{id:'B',label:'Un avversario'}]}));
 for(const m of prepared.modifiers)if(context.controllers?.[m.index]!=null)answers['drawController'+m.index]=context.controllers[m.index];
 const plan=root.JudgeQuestionPlanner.plan({facts,answers},s=>evaluate(prepared,s.answers));
 if(plan.status==='unsupported')return unsupported('Un’alternativa necessaria non è completamente verificabile.');
 if(!context.board)return {status:'question',key:'board',question:'Conteggio soltanto le pescate richieste dalla magia e dalle sostituzioni indicate. Non simulo il contenuto di mano e grimorio, una pescata da grimorio vuoto o gli inneschi successivi. Confermi che non ci sono altri effetti?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return unsupported('Gli altri effetti devono essere specificati.');
 if(plan.status==='question')return {...plan,key:'answers.'+plan.key};
 return {status:'partial',title:'Conteggio delle pescate richieste',reason:plan.outcome.events.map(e=>e.description).join(' ')+' È un conteggio delle istruzioni, non una simulazione completa della risoluzione: non verifica quante carte siano effettivamente disponibili. La fonte delle regole non è autenticata.',outcome:plan.outcome,diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:plan.outcome,questionPlanning:plan,reasonCodes:[]}};
}
root.JudgeDrawScenario={prepare,evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
