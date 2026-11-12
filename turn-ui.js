(function(){
'use strict';
const k=window.JudgeTurnKernel,s=k.makeTurn(),$=id=>document.getElementById(id);
function render(message){
 $('turnState').textContent='Turno '+s.turnNumber+' · '+s.activePlayer+' · '+s.phase+' / '+s.step+' · priorità: '+(s.priorityPlayer||'nessuna')+' · pila: '+s.stack.length;
 $('turnMessage').textContent=message||'Simulazione temporale, non esegue automaticamente azioni di turno o Oracle.';
 $('sorcery').textContent=k.canCastSorcery(s,s.activePlayer)?'Stregoneria: permessa per il giocatore attivo':'Stregoneria: non permessa ora';
 $('turnLog').textContent=s.stack.map((x,i)=>(i+1)+': '+x.description).join(' | ')||'Pila vuota';
}
function action(fn){try{render(fn())}catch(e){render('Operazione rifiutata: '+e.message)}}
$('grant').onclick=()=>action(()=>{const r=k.grantPriority(s);return r.granted?'Priorità a '+r.player:r.reason});
$('pass').onclick=()=>action(()=>{const r=k.passPriority(s,s.priorityPlayer);return r.type==='pass'?'Priorità a '+r.next:r.type==='stackResolutionRequired'?'Tutti hanno passato: risolvere la cima della pila':'Tutti hanno passato: si può avanzare'});
$('advance').onclick=()=>action(()=>{const r=k.advanceStep(s);return 'Passo successivo: '+r.step});
$('push').onclick=()=>action(()=>{if(!s.priorityPlayer)throw Error('Serve la priorità');const description=$('stackDescription').value.trim();if(!description)throw Error('Inserire descrizione');s.stack.push({description,controller:s.priorityPlayer});s.passes=0;return 'Elemento inserito in pila (effetto non eseguito)'});
$('resolve').onclick=()=>action(()=>{const r=k.resolveTopManually(s);return 'Risoluzione MANUALE: '+r.item.description+'. Applicare effetti, azioni basate sullo stato e inneschi prima di proseguire.'});
$('resume').onclick=()=>action(()=>{const r=k.resumeAfterResolution(s);return 'Priorità ripristinata a '+r.player});
render();
})();