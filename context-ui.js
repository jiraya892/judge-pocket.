/* Guided flow with a single explanation and reversible context refinement. */
(function(){'use strict';
const $=id=>document.getElementById(id);
let state={cards:[]},request=0;
const events={block:'Verifico se il blocco è legale',gainLife:'Un giocatore guadagna punti vita',putCounters:'Una carta riceve segnalini +1/+1',beginEndStep:'Inizia la sottofase finale',combat:'Una creatura attaccante viene bloccata',drawCards:'Un effetto fa pescare carte'};
function error(id,message){$(id).textContent=message;$(id).hidden=!message;}
function revise(key){
 const revised=window.JudgeConditionalFacts.clear(state.answers||{},key);
 if(!revised.supported)return;
 state.answers=Object.fromEntries(Object.entries(revised.answers).filter(([k])=>{
  if(key==='combatDamage:first')return k!=='combatDamage:normal';
  return !key.startsWith('combat')||key.startsWith('combatDamage:')||!k.startsWith('combatDamage:');
 }));
 $('contextEditor').hidden=true;
 show();
}
function review(holder){
 holder.replaceChildren();
 for(const [key,value]of Object.entries(state.answers||{})){
  const label=state.answerLabels?.[key];
  const button=document.createElement('button');button.type='button';button.className='option';
  button.textContent=(label?label.question+' '+label.answer:'Risposta: '+String(value))+' — modifica';
  button.onclick=()=>revise(key);holder.append(button);
 }
 if(!holder.children.length)holder.textContent='Nessuna risposta aggiuntiva da correggere.';
}
function remember(question,option){
 const key=question.key.slice(8),saved=window.JudgeRequiredFacts.preserve(state.answers||{},key,option.id);
 if(saved.supported){state.answers=saved.answers;state.answerLabels={...(state.answerLabels||{}),[key]:{question:question.question,answer:option.label}};}
}
function appendCard(name){
 if(state.cards.length>=4)return false;
 state.cards=[...state.cards,name];state.orderChoices=null;
 // A range such as "less than five" cannot answer a new one-life threshold.
 state.answers=Object.fromEntries(Object.entries(state.answers||{}).filter(([key])=>!['entryOrder','lifeGainedA','lifeGainedB'].includes(key)&&!key.startsWith('combatDamage:')));
 return true;
}
function choose(question,option){
 if(question.key==='board'){
  state.board=option.id;state.requireBoard=option.id==='additional';state.extraComplete=false;
 }else if(question.key==='orderChoices')state.orderChoices=[...(state.orderChoices||[]),Number(option.id)];
 else if(question.key==='controllers')state.controllers=[...(state.controllers||[]),option.id];
 else if(question.key==='extraCards'){
  state.extraComplete=true;state.board=null;state.requireBoard=false;
 }else if(question.key.startsWith('answers.'))remember(question,option);
 else state[question.key]=option.id;
 show();
}
function questionView(question){
 $('result').hidden=true;$('step').hidden=false;$('question').textContent=question.question;
 $('choices').replaceChildren();error('stepError','');
 const description=question.key==='description',extra=question.key==='extraCards';
 $('description').hidden=!description;$('sendDescription').hidden=!description;
 $('extraName').hidden=!extra;$('addExtra').hidden=!extra;$('suggestExtra').hidden=true;
 for(const option of question.options||[]){
  const button=document.createElement('button');button.type='button';button.className='option';button.textContent=option.label;
  button.onclick=()=>choose(question,option);$('choices').append(button);
 }
}
function contextSummary(context){
 const action=context.event==='enter'?context.entering+' sta entrando nel campo di battaglia':context.event==='present'?'Le carte sono sul campo di battaglia':context.event==='cast'?context.casting+' viene lanciata':events[context.event]||context.description;
 return context.cards.join(' + ')+' · '+action;
}
function outputView(output,context,current){
 const guarded=window.JudgeGuidedTrustGate?.guard(output)||{status:'unsupported',reason:'Verifica del motore non disponibile',diagnostic:{reasonCodes:['TRUST_GATE_MISSING']}};
 const model=window.JudgeInteractionStory.build(guarded,context);
 $('result').dataset.status=model.status;
 $('analysisBadge').textContent=model.status==='partial'?'Analisi del motore':'Calcolo non disponibile';
 $('status').textContent=model.lead;
 window.JudgeInteractionStory.render($('resultDetails'),model);
 window.JudgeResultView.cards($('cardSources'),context.cards,()=>current===request);
 const technical=window.JudgeExplanationView?.present(guarded);
 $('sourceDiagnostic').textContent=(technical?.ruleSource||'')+' · Stato del motore: '+guarded.status+'. Le verifiche di provenienza restano attive; questa analisi non è un verdetto certificato.';
 $('moreContext').hidden=false;$('copyDiagnostic').hidden=false;
 $('copyDiagnostic').textContent='Copia rapporto tecnico';$('diagnosticMessage').textContent='';
 const report=JSON.stringify({context,diagnostic:guarded.diagnostic},null,2);
 $('copyDiagnostic').onclick=async()=>{try{await navigator.clipboard.writeText(report);$('diagnosticMessage').textContent='Rapporto copiato.';}catch(e){$('diagnosticMessage').textContent='Copia non disponibile: '+e.message;}};
}
function show(){
 const current=++request,result=window.JudgeContextInterview.next(state);
 $('answerReview').hidden=true;$('contextEditor').hidden=true;
 $('step').hidden=result.status!=='question';$('result').hidden=!['ready','unsupported'].includes(result.status);
 $('start').hidden=result.status!=='needCards';$('copyDiagnostic').hidden=true;$('moreContext').hidden=true;
 $('resultDetails').replaceChildren();$('cardSources').replaceChildren();$('analysisBadge').textContent='';
 if(result.status==='question'){questionView(result);return;}
 if(result.status==='unsupported'){
  $('summary').textContent=state.cards.join(' + ');
  outputView(result,{cards:state.cards},current);return;
 }
 if(result.status!=='ready')return;
 $('result').dataset.status='loading';$('summary').textContent=contextSummary(result.context);
 $('status').textContent='Analizzo le carte e la situazione…';
 window.JudgeGuidedBridge.evaluate(result.context).then(output=>{
  if(current!==request)return;
  if(output?.status==='question'){questionView(output);return;}
  outputView(output,result.context,current);
 }).catch(e=>{if(current===request)outputView({status:'unsupported',reason:'Non riesco a completare il calcolo: '+e.message},result.context,current);});
}
$('reviewAnswers').onclick=()=>{const holder=$('answerReview');holder.hidden=!holder.hidden;if(!holder.hidden)review(holder);};
$('addExtra').onclick=()=>{
 const name=$('extraName').value.trim();if(!name)return;
 if(!appendCard(name)){error('stepError','Puoi confrontare al massimo quattro carte.');return;}
 $('extraName').value='';show();
};
$('sendDescription').onclick=()=>{state.description=$('description').value.trim();show();};
$('moreContext').onclick=()=>{
 $('contextEditor').hidden=false;$('contextCard').value='';$('contextNote').value=state.additionalDescription||'';
 $('contextCard').disabled=state.cards.length>=4;
 $('contextCard').placeholder=state.cards.length>=4?'Hai già selezionato quattro carte':'Cerca il nome della carta';
 error('contextError','');review($('contextAnswerReview'));
 (state.cards.length<4?$('contextCard'):$('contextNote')).focus();
};
$('cancelContext').onclick=()=>{$('contextEditor').hidden=true;};
$('applyContext').onclick=()=>{
 const name=$('contextCard').value.trim(),note=$('contextNote').value.trim();
 if(name&&!appendCard(name)){error('contextError','Puoi confrontare al massimo quattro carte.');return;}
 state.additionalDescription=note;state.board=null;state.requireBoard=false;state.extraComplete=false;
 $('contextCard').value='';$('contextEditor').hidden=true;show();
};
$('begin').onclick=()=>{
 const cards=Array.from(document.querySelectorAll('[data-card-input]'),field=>field.value.trim());
 if(cards.length<2||cards.some(name=>!name)){error('inputError','Inserisci il nome di tutte le carte selezionate.');return;}
 error('inputError','');state={cards};show();
};
$('restart').onclick=()=>{request++;state={cards:[]};show();};
function connection(){
 $('connectionStatus').textContent=(!window.DecompressionStream||!window.crypto?.subtle)?(navigator.onLine?'Questo browser richiede una connessione per recuperare le carte.':'Sei offline: riconnettiti per recuperare le carte con questo browser.'):navigator.onLine?'Le carte consultate restano disponibili dopo il primo caricamento.':'Sei offline: puoi usare le carte già caricate su questo dispositivo.';
}
window.addEventListener('online',connection);window.addEventListener('offline',connection);
connection();$('begin').disabled=false;$('begin').textContent='Continua';show();
})();
