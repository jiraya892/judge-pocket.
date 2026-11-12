(function(){
'use strict';
const $=id=>document.getElementById(id);
const state=window.JudgeRulesCore.createGame(['A','B'],20);
function render(message){
 $('oracleLife').textContent=state.players.map(p=>p.id+': '+p.life+' punti vita').join(' · ');
 $('oracleResult').textContent=message||'Scrivi una singola istruzione Oracle supportata e scegli il controllore.';
}
$('oracleRun').onclick=()=>{
 const text=$('oracleInput').value.trim(),controller=$('oracleController').value;
 const result=window.JudgeOracleRuntime.run(window.JudgeRulesCore,window.JudgeEffectExecutor,window.JudgeOracleCompiler,state,text,{controller});
 render(result.applied?'Effetto applicato: '+text:'Non eseguito: '+result.reason);
};
$('oracleReset').onclick=()=>{for(const p of state.players)p.life=20;render('Punti vita riportati a 20.')};
render();
})();
