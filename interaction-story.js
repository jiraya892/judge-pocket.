/* Plain explanations from structured, computed facts. No free-text ruling AI.
   Presentation never changes engine status, evidence or source trust. */
(function(root){'use strict';
const join=xs=>xs.length<2?xs.join(''):xs.slice(0,-1).join(', ')+' e '+xs[xs.length-1];
function build(output,context={}){
 const outcome=output?.diagnostic?.computedOutcome||output?.outcome;
 const calculated=output?.status==='partial'&&output?.diagnostic?.calculationVerified===true&&!!outcome;
 if(!calculated)return {status:'unsupported',lead:'Questa interazione non è ancora calcolabile.',paragraphs:[output?.reason||'Mancano informazioni o un effetto non è ancora supportato.'],note:'Puoi aggiungere altre carte o dettagli della situazione qui sotto.',rules:[],results:[]};
 const model={status:'partial',lead:'',paragraphs:[],note:'Il risultato considera le carte e le condizioni indicate. Altri effetti possono cambiarlo.',rules:[...new Set(outcome.rules||[])],results:outcome.results||[]};
 if(outcome.scope==='trigger-occurrence'){
  const active=outcome.triggerSummary.filter(t=>t.count>0),event=context.event;
  model.lead=active.length?join(active.map((t,i)=>(i?'l’abilità':'L’abilità')+' di '+t.card+' si innesca '+t.count+' '+(t.count===1?'volta':'volte')))+'.':'All’evento indicato non si innesca nessuna di queste abilità.';
  if(event==='gainLife'&&outcome.gainLifeModifiers?.length)model.paragraphs.push(join(outcome.gainLifeModifiers)+' aggiunge un innesco alle abilità causate direttamente dal guadagno di vite, quando il testo e i controllori lo consentono.');
  const counters=outcome.triggerSummary.filter(t=>t.eventKind==='putCounters');
  if(event==='gainLife'&&counters.length)model.paragraphs.push('L’abilità di '+join([...new Set(counters.map(t=>t.card))])+' legata ai segnalini è separata: si innesca quando vengono messi i segnalini, quindi non è ancora partita in questo momento.');
  if(event==='beginEndStep'&&outcome.gainLifeModifiers?.length)model.paragraphs.push('Qui l’evento che fa partire l’abilità è l’inizio della sottofase finale. Avere guadagnato vite è una condizione da controllare; gli effetti che aggiungono inneschi di guadagno vita non la duplicano.');
  const limited=outcome.triggerSummary.filter(t=>t.maxPerTurn!=null&&t.eventKind===event);
  if(limited.length)model.paragraphs.push('Il limite «una volta per turno» di '+join([...new Set(limited.map(t=>t.card))])+' resta valido anche con effetti che aggiungono inneschi. Se l’abilità si è già innescata, non parte di nuovo.');
  model.note='Qui conto gli inneschi di questo evento; la loro intera catena di risoluzione non è stata simulata.';
 }else if(outcome.scope==='draw-instructions'){
  const n=outcome.requestedDraws,base=outcome.originalDraws,factor=n/base;
  model.lead=(outcome.sourceName||'L’effetto')+' richiede '+n+' '+(n===1?'pescata':'pescate')+(outcome.putBackInstructions?', poi di rimettere '+outcome.putBackInstructions+' carte in cima al grimorio.':'.');
  model.paragraphs.push(factor>1?'Ogni pescata iniziale viene portata a '+factor+' carte. Le '+base+' pescate del testo diventano quindi '+n+'.':'I permanenti indicati non aumentano le pescate di questo giocatore.');
  if(factor>2)model.paragraphs.push('I moltiplicatori si applicano uno dopo l’altro. Per questi effetti l’ordine non cambia il numero finale.');
  if(outcome.putBackInstructions)model.paragraphs.push('L’istruzione di rimettere '+outcome.putBackInstructions+' carte non viene moltiplicata: è un passaggio separato dalla pescata.');
  model.note='Questo è il numero di pescate richieste; il contenuto del grimorio e gli inneschi successivi non sono stati simulati.';
 }else if(outcome.scope==='single-blocked-combat'){
  const a=model.results.find(r=>r.id===outcome.attackerId),b=model.results.find(r=>r.id===outcome.blockerId);
  model.lead='Il giocatore in difesa non subisce danni.';
  if(a?.zone==='graveyard'&&b?.zone==='graveyard')model.paragraphs.push('Entrambe le creature vengono distrutte dal danno.');
  else if(a?.zone==='graveyard')model.paragraphs.push(a.name+' viene distrutta dal danno, mentre '+b.name+' resta sul campo.');
  else if(b?.zone==='graveyard')model.paragraphs.push(b.name+' muore per il danno, ma '+a.name+' rimane una creatura bloccata fino alla fine del combattimento. Aver eliminato il bloccante non fa arrivare danni al giocatore senza travolgere.');
  else if(b?.indestructible&&b.damage>0)model.paragraphs.push(b.name+' resta sul campo con '+b.damage+' danni segnati. Indistruttibile impedisce che il danno la distrugga, perciò continua a bloccare '+a.name+'.');
  else if(b)model.paragraphs.push(b.name+' rimane sul campo e continua a bloccare. Il danno viene assegnato alle creature coinvolte nel blocco.');
  if(outcome.rules.includes('702.4b'))model.paragraphs.push('Con attacco improvviso o doppio attacco c’è una prima sottofase di danno. Chi ha doppio attacco può infliggere danno anche nella sottofase normale, se è ancora in combattimento.');
 }else{
  const events=outcome.events||[],leaves=events.filter(e=>e.type==='creatureLeaves');
  if(leaves.length&&outcome.rules?.includes('208.5')){
   model.lead=join(leaves.map(e=>e.name+' va nel cimitero'))+'.';
   model.paragraphs.push('Gli effetti sui tipi di terra si applicano seguendo le dipendenze. Impostare un tipo di terra base fa perdere le abilità del testo: se viene persa la definizione di forza e costituzione, il valore * diventa 0.');
   model.paragraphs.push('Una creatura con costituzione 0 va nel cimitero. Dopo la sua uscita vengono ricalcolati gli effetti sulle carte rimaste.');
  }else{
   const descriptions=events.map(e=>e.description||(e.type==='creatureLeaves'?e.name+' viene distrutta per danno letale.':'')).filter(Boolean);
   model.lead=descriptions.shift()||'Le carte restano sul campo con le caratteristiche calcolate.';
   model.paragraphs.push(...descriptions);
   if(outcome.rules?.includes('702.12b'))model.paragraphs.push('Il danno viene segnato, ma indistruttibile impedisce la distruzione per danno letale.');
  }
 }
 return model;
}
function render(container,model){
 container.replaceChildren();
 const add=(tag,text,parent=container)=>{const e=document.createElement(tag);e.textContent=text;parent.append(e);return e};
 for(const paragraph of model.paragraphs)add('p',paragraph);
 if(model.results.length){
  const states=add('details','');add('summary','Stato delle carte dopo l’interazione',states);
  for(const r of model.results){const zone=r.zone==='graveyard'?'nel cimitero':r.zone==='battlefield'?'sul campo di battaglia':r.zone;add('p',r.name+': '+zone+(r.zone==='battlefield'&&Number.isFinite(r.power)&&Number.isFinite(r.toughness)?', '+r.power+'/'+r.toughness:'')+(r.damage>0?', '+r.damage+' danni segnati':'')+'.',states);}
 }
 if(model.rules.length){const details=add('details','');add('summary','Regole applicate · '+model.rules.map(id=>'CR '+id).join(' · '),details);for(const id of model.rules)add('p','CR '+id+' — '+(root.JudgeResultView?.describeRule(id)||'Riferimento usato dal motore.'),details);const link=add('a','Comprehensive Rules ufficiali',details);link.href='https://magic.wizards.com/en/rules';link.target='_blank';link.rel='noopener noreferrer';}
 add('p',model.note).className='note';
}
root.JudgeInteractionStory={build,render};
})(typeof window!=='undefined'?window:globalThis);
