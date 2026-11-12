/* Deterministic execution of explicitly compiled Oracle effects. No guessed targets. */
(function(root){
'use strict';
function run(core,executor,compiler,state,text,context){
 const compiled=compiler.compile(text,context);
 if(!compiled.supported)return {applied:false,stage:'compile',reason:compiled.reason};
 if(!Array.isArray(compiled.effects)||compiled.effects.length!==1)
  return {applied:false,stage:'compile',reason:'Solo un effetto per istruzione'};
 const result=executor.execute(core,state,compiled.effects[0]);
 return {...result,stage:result.applied?'execute':'validation',compiled:compiled.effects};
}
root.JudgeOracleRuntime={run};
})(typeof window!=='undefined'?window:globalThis);
