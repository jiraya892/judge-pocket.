(function(){
const core=window.JudgeRulesCore,ex=window.JudgeEffectExecutor,compiler=window.JudgeOracleCompiler,run=window.JudgeOracleRuntime.run,out=document.getElementById('runtimeTestResults');let passed=0,failed=0;
function test(name,fn){const p=document.createElement('p');try{fn();passed++;p.className='ok';p.textContent='✓ '+name}catch(e){failed++;p.className='fail';p.textContent='✕ '+name+' — '+e.message}out.append(p)}
function ok(x){if(!x)throw Error('Asserzione fallita')}
test('Oracle guadagna vita e aggiorna lo stato',()=>{const s=core.createGame();const r=run(core,ex,compiler,s,'You gain 3 life.',{controller:'A'});ok(r.applied&&s.players[0].life===23)});
test('Oracle perde vita e aggiorna lo stato',()=>{const s=core.createGame();const r=run(core,ex,compiler,s,'You lose 4 life.',{controller:'B'});ok(r.applied&&s.players[1].life===16)});
test('Oracle sconosciuto non cambia lo stato',()=>{const s=core.createGame();const r=run(core,ex,compiler,s,'Draw three cards.',{controller:'A'});ok(!r.applied&&r.stage==='compile'&&s.players[0].life===20)});
test('Controllore inesistente non cambia lo stato',()=>{const s=core.createGame();const r=run(core,ex,compiler,s,'You gain 3 life.',{controller:'Z'});ok(!r.applied&&r.stage==='validation'&&s.players[0].life===20)});
test('TAP da Oracle su sorgente esplicita',()=>{const s=core.createGame(),o=core.addObject(s,{name:'Artifact',owner:'A'});const r=run(core,ex,compiler,s,'Tap this artifact.',{source:o.id});ok(r.applied&&o.tapped)});
document.getElementById('runtimeTestSummary').textContent=passed+' test superati, '+failed+' falliti.';
})();