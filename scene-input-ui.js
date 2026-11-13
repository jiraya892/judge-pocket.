/* Natural-scene entry with an in-app, user-initiated browser dictation button.
   Text remains editable. Optional general-model proposals require explicit review. */
(function(root){'use strict';
const $=id=>document.getElementById(id),field=$('sceneText'),analyse=$('sceneAnalyse'),message=$('sceneMessage'),preview=$('scenePreview'),speech=$('sceneSpeech'),info=$('sceneSpeechInfo');
let cataloguePromise,sequence=0,resolutions={},recognition=null,speechRun=0,pendingAI=null;
async function catalogue(){if(!cataloguePromise)cataloguePromise=root.JudgeCardData.names().then(root.JudgeSceneIntake.catalogue).catch(e=>{cataloguePromise=null;throw e});return cataloguePromise;}
function invalidate(){pendingAI?.abort();sequence++;resolutions={};analyse.disabled=!!recognition;preview.replaceChildren();preview.hidden=true;message.textContent='';}
field.addEventListener('input',invalidate);
function render(draft){
 preview.replaceChildren();preview.hidden=false;
 const p=document.createElement('p');p.textContent=draft.cards.length?'Carte riconosciute: '+draft.cards.join(' · '):'Non ho ancora identificato due carte.';preview.append(p);
 for(const a of draft.ambiguities||[]){const label=document.createElement('label');label.textContent='Con «'+a.text+'» quale carta intendi?';const select=document.createElement('select');select.style.width='100%';select.style.padding='12px';const first=document.createElement('option');first.value='';first.textContent='Scegli la carta';select.append(first);for(const name of a.candidates){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option)}select.onchange=()=>{if(select.value){resolutions[a.key]=select.value;interpret()}};label.append(select);preview.append(label);}
 for(const unresolved of draft.unresolved||[]){const line=document.createElement('p');line.textContent='Da chiarire: '+unresolved.replace(/\bref(\d+)\b/g,(_,i)=>draft.mentions?.[Number(i)]?.text||'carta');preview.append(line);}
}
function renderAI(grounded,run){
 preview.replaceChildren();preview.hidden=false;
 const selections={},add=text=>{const p=document.createElement('p');p.textContent=text;preview.append(p)};
 add('Controlla la situazione ricostruita prima di inviarla al motore.');
 add('Descrizione: '+grounded.text);
 for(const card of grounded.cards){
  const label=document.createElement('label');label.textContent='«'+card.mention+'» → ';
  const select=document.createElement('select');select.style.width='100%';select.style.padding='12px';
  const empty=document.createElement('option');empty.value='';empty.textContent=card.choices.length?'Scegli la carta':'Carta non identificata: correggi il nome nella descrizione';select.append(empty);
  for(const choice of card.choices){const option=document.createElement('option');option.value=choice.name;option.textContent=choice.name;select.append(option)}
  select.value=card.selected||'';selections[card.id]=select.value;select.onchange=()=>{selections[card.id]=select.value;update()};label.append(select);preview.append(label);
 }
 const labels={controller:'Controllore',owner:'Proprietario',phase:'Fase',step:'Sottofase',active_player:'Giocatore di turno',event_player:'Giocatore coinvolto',damage:'Danni già segnati',counter_plus1:'Segnalini +1/+1',counter_minus1:'Segnalini −1/−1',life_gained_this_turn:'Vite guadagnate nel turno',tapped:'Tappata',zone:'Zona'};
 const values={self:'tu',opponent:'avversario',unknown:'da chiarire',battlefield:'campo di battaglia',hand:'mano',beginning:'iniziale',precombatMain:'principale prima del combattimento',postcombatMain:'principale dopo il combattimento',combat:'combattimento',ending:'finale',main:'principale',upkeep:'mantenimento',untap:'STAP',draw:'acquisizione',endStep:'finale',cleanup:'cancellazione'};
 const events={present:'situazione sul campo',enter:'ingresso sul campo',cast:'lancio di una magia',combat:'danno da combattimento',block:'possibilità di bloccare',beginUpkeep:'inizio del mantenimento',beginEndStep:'inizio della sottofase finale',gainLife:'guadagno di vite',putCounters:'aggiunta di segnalini',unknown:'da chiarire'};
 add('Evento: '+(events[grounded.proposal.event.type]||grounded.proposal.event.type)+(grounded.proposal.event.quote?' — «'+grounded.proposal.event.quote+'»':''));
 for(const fact of grounded.proposal.facts){const card=grounded.cards.find(c=>c.id===fact.card);const time={now:'ora',before:'prima dell’evento',after:'dopo l’evento',history:'già avvenuto',question:'nella domanda'}[fact.time];add((labels[fact.kind]||'Dettaglio')+(card?' ('+card.mention+')':'')+': '+(fact.negated?'NON ':'')+(values[fact.value]??String(fact.value))+' — '+time+' — «'+fact.quote+'»');}
 if(grounded.proposal.question)add('Domanda: '+grounded.proposal.question);
 const issues=document.createElement('p'),confirm=document.createElement('button');confirm.type='button';confirm.textContent='Conferma la situazione ricostruita';preview.append(issues,confirm);
 function update(){const result=root.JudgeSceneAIProtocol.draft(grounded,selections);confirm.disabled=!result.supported;issues.textContent=result.supported?(result.context.intakeLimitations||[]).join(' · '):(result.errors||[]).join(' · ');return result;}
 confirm.onclick=()=>{if(run!==sequence)return;const result=update();if(result.supported){confirm.disabled=true;root.JudgeContextSession.start(result.context)}};
 update();message.textContent='Se qualcosa non corrisponde, correggi la descrizione e analizzala di nuovo.';
}
async function interpret(){
 pendingAI?.abort();const request=new AbortController();pendingAI=request;
 const run=++sequence,text=field.value;analyse.disabled=true;message.textContent='Ricostruisco la situazione…';
 try{const index=await catalogue();if(run!==sequence)return;const draft=root.JudgeSceneIntake.parse(text,index,resolutions);render(draft);
  if(draft.status!=='ready'){
   if(!(draft.ambiguities||[]).length&&text.trim()&&root.JudgeSceneAI){
    message.textContent='Interpreto la descrizione…';const result=await root.JudgeSceneAI.interpret(text,{catalogue:index,signal:request.signal});if(run!==sequence)return;
    if(result.status==='proposal'){renderAI(result.grounded,run);return;}
    if(result.status==='cancelled')return;
    message.textContent=result.reason||(result.errors||[]).join(' · ')||'Correggi la descrizione o usa la selezione delle carte.';return;
   }
   message.textContent='Controlla i nomi e i passaggi indicati. Puoi correggere la descrizione qui sopra.';return;
  }
  const converted=root.JudgeSceneIntake.toContext(draft);if(!converted.supported){message.textContent=converted.reason;return;}
  message.textContent='';root.JudgeContextSession.start(converted.context);
 }catch(e){if(run===sequence)message.textContent='Non riesco a ricostruire la situazione: '+e.message+'. Puoi usare la selezione delle carte.';}
 finally{if(run===sequence){analyse.disabled=false;pendingAI=null;}}
}
analyse.onclick=interpret;
root.addEventListener('pagehide',stopCapture);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCapture()});document.addEventListener('click',event=>{if(['begin','restart','editScene'].includes(event.target.id))stopCapture()});
const Speech=root.SpeechRecognition||root.webkitSpeechRecognition;
if(!Speech){info.textContent='Puoi scrivere oppure usare il microfono della tastiera del telefono.';return;}
speech.hidden=false;info.textContent='La dettatura può usare il servizio vocale del browser. Il testo proposto resta modificabile.';
function finish(run){if(run!==speechRun)return;recognition=null;field.readOnly=false;analyse.disabled=false;speech.textContent='Detta la situazione';}
speech.onclick=()=>{
 if(recognition){try{recognition.stop()}catch(e){finish(speechRun)}return;}
 const run=++speechRun,prefix=field.value.trim();
 try{const instance=new Speech();recognition=instance;instance.lang='it-IT';instance.interimResults=true;instance.continuous=true;field.readOnly=true;analyse.disabled=true;speech.textContent='Termina dettatura';
  instance.onresult=event=>{if(run!==speechRun||recognition!==instance)return;const transcript=Array.from(event.results,r=>r[0].transcript).join(' ');field.value=(prefix?prefix+' ':'')+transcript;invalidate();};
  instance.onerror=event=>{if(run!==speechRun)return;info.textContent=event.error==='not-allowed'?'Accesso al microfono negato. Puoi continuare a scrivere.':'Dettatura interrotta. Il testo rimane modificabile.';finish(run);};
  instance.onend=()=>finish(run);instance.start();
 }catch(e){info.textContent='La dettatura non è disponibile in questo browser. Puoi scrivere o usare il microfono della tastiera.';finish(run);}
};
function stopCapture(){pendingAI?.abort();sequence++;speechRun++;if(recognition){try{recognition.abort()}catch(e){}recognition=null;}field.readOnly=false;analyse.disabled=false;speech.textContent='Detta la situazione';}

})(typeof window!=='undefined'?window:globalThis);
