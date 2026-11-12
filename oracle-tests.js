(function(){
const p=window.JudgeOracleCompiler,x=window.JudgeEffectExecutor,c=window.JudgeRulesCore,out=document.getElementById('oracleTestResults');let passed=0,failed=0;
function test(n,f){const e=document.createElement('p');try{f();passed++;e.className='ok';e.textContent='✓ '+n}catch(err){failed++;e.className='fail';e.textContent='✕ '+n+' — '+err.message}out.append(e)}
function ok(v){if(!v)throw Error('Asserzione fallita')}
test('Compila e applica guadagno vita',()=>{const s=c.createGame(),r=p.compile('You gain 3 life.',{controller:'A'});ok(r.supported&&x.execute(c,s,r.effects[0]).applied&&s.players[0].life===23)});
test('Compila e applica perdita vita',()=>{const s=c.createGame(),r=p.compile('You lose 2 life.',{controller:'B'});ok(r.supported&&x.execute(c,s,r.effects[0]).applied&&s.players[1].life===18)});
test('Rifiuta bersagli',()=>{ok(!p.compile('Target player gains 3 life.',{controller:'A'}).supported)});
test('Rifiuta condizioni',()=>{ok(!p.compile('If you control a creature, you gain 3 life.',{controller:'A'}).supported)});
test('Rifiuta inneschi',()=>{ok(!p.compile('Whenever a creature enters, you gain 1 life.',{controller:'A'}).supported)});
test('Rifiuta effetti multipli',()=>{ok(!p.compile('You gain 3 life; draw a card.',{controller:'A'}).supported)});
test('Rifiuta testo sconosciuto',()=>{ok(!p.compile('Draw three cards.',{controller:'A'}).supported)});
test('Richiede controllore',()=>{ok(!p.compile('You gain 3 life.').supported)});
test('Compila TAP della sorgente esplicita',()=>{const s=c.createGame(),o=c.addObject(s,{name:'Stone',owner:'A'}),r=p.compile('Tap this artifact.',{source:o.id});ok(r.supported&&x.execute(c,s,r.effects[0]).applied&&o.tapped)});
document.getElementById('oracleTestSummary').textContent=passed+' test superati, '+failed+' falliti.';
})();