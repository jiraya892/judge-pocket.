/* Natural-scene entry with an in-app, user-initiated browser dictation button.
   Text remains editable. No paid model or general-language AI is configured. */
(function(root){'use strict';
const $=id=>document.getElementById(id),field=$('sceneText'),analyse=$('sceneAnalyse'),message=$('sceneMessage'),preview=$('scenePreview'),speech=$('sceneSpeech'),info=$('sceneSpeechInfo');
let cataloguePromise,sequence=0,resolutions={},recognition=null,speechRun=0;
async function catalogue(){if(!cataloguePromise)cataloguePromise=root.JudgeCardData.names().then(root.JudgeSceneIntake.catalogue).catch(e=>{cataloguePromise=null;throw e});return cataloguePromise;}
function invalidate(){sequence++;resolutions={};analyse.disabled=!!recognition;preview.replaceChildren();preview.hidden=true;message.textContent='';}
field.addEventListener('input',invalidate);
function render(draft){
 preview.replaceChildren();preview.hidden=false;
 const p=document.createElement('p');p.textContent=draft.cards.length?'Carte riconosciute: '+draft.cards.join(' · '):'Non ho ancora identificato due carte.';preview.append(p);
 for(const a of draft.ambiguities||[]){const label=document.createElement('label');label.textContent='Con «'+a.text+'» quale carta intendi?';const select=document.createElement('select');select.style.width='100%';select.style.padding='12px';const first=document.createElement('option');first.value='';first.textContent='Scegli la carta';select.append(first);for(const name of a.candidates){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option)}select.onchange=()=>{if(select.value){resolutions[a.key]=select.value;interpret()}};label.append(select);preview.append(label);}
 for(const unresolved of draft.unresolved||[]){const line=document.createElement('p');line.textContent='Da chiarire: '+unresolved.replace(/\bref(\d+)\b/g,(_,i)=>draft.mentions?.[Number(i)]?.text||'carta');preview.append(line);}
}
async function interpret(){
 const run=++sequence,text=field.value;analyse.disabled=true;message.textContent='Ricostruisco la situazione…';
 try{const index=await catalogue();if(run!==sequence)return;const draft=root.JudgeSceneIntake.parse(text,index,resolutions);render(draft);
  if(draft.status!=='ready'){message.textContent='Controlla i nomi e i passaggi indicati. Puoi correggere la descrizione qui sopra.';return;}
  const converted=root.JudgeSceneIntake.toContext(draft);if(!converted.supported){message.textContent=converted.reason;return;}
  message.textContent='';root.JudgeContextSession.start(converted.context);
 }catch(e){if(run===sequence)message.textContent='Non riesco a leggere il catalogo: '+e.message+'. Puoi usare la selezione delle carte.';}
 finally{if(run===sequence)analyse.disabled=false;}
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
function stopCapture(){sequence++;speechRun++;if(recognition){try{recognition.abort()}catch(e){}recognition=null;}field.readOnly=false;analyse.disabled=false;speech.textContent='Detta la situazione';}

})(typeof window!=='undefined'?window:globalThis);
