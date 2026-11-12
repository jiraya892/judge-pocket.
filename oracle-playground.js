(function(){
'use strict';
const $=id=>document.getElementById(id);
const state=window.JudgeRulesCore.createGame(['A','B'],20);
function render(message){
 $('oracleLife').textContent=state.players.map(p=>p.id+': '+p.life+' punti vita').join(' · ');
 $('oracleResult').textContent=message||'Scrivi una singola istruzione Oracle supportata e scegli il controllore.';
}
function selected(){
 const cards=window.getJudgeSelectedCards?.()||[];
 const menu=$('oracleCard'),previous=menu.value;menu.replaceChildren();
 const empty=document.createElement('option');empty.value='';empty.textContent='Scegli una carta selezionata';menu.append(empty);
 for(const card of cards){
  const option=document.createElement('option');option.value=card._instanceId;option.textContent=card.name;menu.append(option);
 }
 if(cards.some(c=>String(c._instanceId)===String(previous)))menu.value=previous;
 $('oracleCardStatus').textContent=cards.length?cards.length+' carte disponibili.':'Aggiungi prima una carta nella sezione 2.';
}
function cardText(card){return card.oracle_text||card.card_faces?.map(f=>f.oracle_text).filter(Boolean).join('\n')||''}
$('oracleFromCard').onclick=()=>{
 selected();
 // Selection is intentionally not reset: refresh only the current available card set.
 const cards=window.getJudgeSelectedCards?.()||[];
 const card=cards.find(c=>String(c._instanceId)===String($('oracleCard').value));
 if(!card){render('Scegli una carta dal menu e riprova.');return}
 const lines=cardText(card).split(/\n/).map(s=>s.trim()).filter(Boolean);
 const controller=$('oracleController').value;
 const supported=lines.filter(line=>window.JudgeOracleCompiler.compile(line,{controller}).supported);
 if(!supported.length){render('Nessuna istruzione autonoma supportata nel testo Oracle di '+card.name+'. Non è una valutazione dell’interazione.');return}
 $('oracleInput').value=supported[0];
 render('Istruzione riconosciuta da '+card.name+': '+supported[0]+'. Controlla e premi Esegui istruzione; nessun effetto è stato applicato.');
};
$('oracleCard').addEventListener('focus',selected);
$('oracleRun').onclick=()=>{
 const text=$('oracleInput').value.trim(),controller=$('oracleController').value;
 const result=window.JudgeOracleRuntime.run(window.JudgeRulesCore,window.JudgeEffectExecutor,window.JudgeOracleCompiler,state,text,{controller});
 render(result.applied?'Effetto applicato: '+text:'Non eseguito: '+result.reason);
};
$('oracleReset').onclick=()=>{for(const p of state.players)p.life=20;render('Punti vita riportati a 20.')};
selected();render();
})();
