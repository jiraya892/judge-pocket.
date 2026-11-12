(function(){
'use strict';
const core=window.JudgeRulesCore,x=window.JudgeEffectExecutor,out=document.getElementById('effectTestResults');let passed=0,failed=0;
function test(name,fn){const p=document.createElement('p');try{fn();passed++;p.className='ok';p.textContent='✓ '+name}catch(e){failed++;p.className='fail';p.textContent='✕ '+name+' — '+e.message}out.append(p)}
function ok(v){if(!v)throw Error('Asserzione fallita')}
test('Guadagno vita automatico',()=>{const s=core.createGame();ok(x.execute(core,s,{type:'gainLife',player:'A',amount:3}).applied&&s.players[0].life===23)});
test('Perdita vita distinta dal danno',()=>{const s=core.createGame();ok(x.execute(core,s,{type:'loseLife',player:'B',amount:2}).applied&&s.players[1].life===18)});
test('Danno al giocatore',()=>{const s=core.createGame();ok(x.execute(core,s,{type:'dealDamage',target:'B',amount:4}).applied&&s.players[1].life===16)});
test('Tappare e stappare permanente',()=>{const s=core.createGame(),o=core.addObject(s,{name:'Bear',owner:'A'});ok(x.execute(core,s,{type:'tap',target:o.id}).applied&&o.tapped);ok(x.execute(core,s,{type:'untap',target:o.id}).applied&&!o.tapped)});
test('Rifiuta quantità non valida senza modifiche',()=>{const s=core.createGame();ok(!x.execute(core,s,{type:'gainLife',player:'A',amount:-1}).applied&&s.players[0].life===20)});
test('Rifiuta giocatore sconosciuto senza modifiche',()=>{const s=core.createGame();ok(!x.execute(core,s,{type:'loseLife',player:'Z',amount:3}).applied&&s.players[0].life===20)});
test('Rifiuta Oracle non implementato',()=>{const s=core.createGame();ok(!x.resolveStackItem(core,s,{description:'Draw three cards'}).applied)});
test('Rifiuta risoluzione con bersagli non verificati',()=>{const s=core.createGame();ok(!x.resolveStackItem(core,s,{effects:[{type:'gainLife',player:'A',amount:1}],targets:[{id:'B'}]}).applied&&s.players[0].life===20)});
document.getElementById('effectTestSummary').textContent=passed+' test superati, '+failed+' falliti.';
})();
