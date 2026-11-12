(function(){
'use strict';
const k=window.JudgeTurnKernel,out=document.getElementById('turnTestResults');let passed=0,failed=0;
function test(name,fn){const p=document.createElement('p');try{fn();passed++;p.className='ok';p.textContent='✓ '+name}catch(e){failed++;p.className='fail';p.textContent='✕ '+name+': '+e.message}out.append(p)}
function ok(v){if(!v)throw Error('Asserzione fallita')}
test('Untap non concede normalmente priorità',()=>{const s=k.makeTurn();ok(!k.grantPriority(s).granted)});
test('Upkeep concede priorità al giocatore attivo',()=>{const s=k.makeTurn();k.advanceStep(s);ok(k.grantPriority(s).player==='A')});
test('Non si può lanciare stregoneria durante upkeep',()=>{const s=k.makeTurn();k.advanceStep(s);k.grantPriority(s);ok(!k.canCastSorcery(s,'A'))});
test('Main con priorità e pila vuota consente stregoneria',()=>{const s=k.makeTurn();for(let i=0;i<3;i++)k.advanceStep(s);k.grantPriority(s);ok(k.canCastSorcery(s,'A')&&!k.canCastSorcery(s,'B'))});
test('Pila non vuota impedisce stregoneria',()=>{const s=k.makeTurn();for(let i=0;i<3;i++)k.advanceStep(s);k.grantPriority(s);s.stack.push({});ok(!k.canCastSorcery(s,'A'))});
test('Due passaggi di priorità completano il passo',()=>{const s=k.makeTurn();k.advanceStep(s);k.grantPriority(s);ok(k.passPriority(s,'A').type==='pass');ok(k.passPriority(s,'B').type==='stepReady')});
test('Con pila non vuota richiede risoluzione, non avanza',()=>{const s=k.makeTurn();k.advanceStep(s);k.grantPriority(s);s.stack.push({});k.passPriority(s,'A');ok(k.passPriority(s,'B').type==='stackResolutionRequired');let threw=false;try{k.advanceStep(s)}catch(e){threw=true}ok(threw)});
test('Fine turno passa al prossimo giocatore',()=>{const s=k.makeTurn();for(let i=0;i<12;i++)k.advanceStep(s);ok(s.activePlayer==='B'&&s.step==='untap'&&s.turnNumber===2)});
document.getElementById('turnTestSummary').textContent=passed+' test superati, '+failed+' falliti.';
})();
