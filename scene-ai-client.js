/* Optional general-model transport. Disabled until a project-owned endpoint is
   configured. No API keys, model downloads, or commercial inference services. */
(function(root){'use strict';
let settingsPromise;
async function settings(){
 if(!settingsPromise)settingsPromise=(async()=>{const configResponse=await fetch('./data/ai/config.json',{cache:'no-cache'});if(!configResponse.ok)throw Error('Configurazione IA assente');const config=await configResponse.json();if(config.version!==1||typeof config.enabled!=='boolean')throw Error('Configurazione IA non valida');if(!config.enabled)return {enabled:false};
  const url=new URL(config.endpoint,root.location.href);if(url.username||url.password||url.hash||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Endpoint IA non consentito');
  const response=await fetch('./data/ai/scene-schema.json');if(!response.ok)throw Error('Schema IA assente');return {...config,endpoint:url.href,schema:await response.json(),timeoutMs:Math.min(120000,Math.max(1000,config.timeoutMs||90000))};
 })().catch(e=>{settingsPromise=null;throw e});return settingsPromise;
}
async function interpret(text,{catalogue,signal,resolutions={}}={}){
 let timer,controller,unlink=()=>{};try{
  const config=await settings();if(!config.enabled)return {status:'unavailable',reason:'L’interprete IA generale non è attivo su questa versione.'};
  if(signal?.aborted)return {status:'cancelled'};
  const baseline=root.JudgeSceneIntake.parse(text,catalogue,resolutions),candidates=(baseline.mentions||[]).slice(0,12).map(m=>({mention:m.text,names:m.name?[m.name]:baseline.ambiguities.find(a=>a.key===m.key)?.candidates.slice(0,8)||[]}));
  controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});unlink=()=>signal?.removeEventListener('abort',abort);timer=setTimeout(abort,config.timeoutMs);
  const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal,body:JSON.stringify({version:1,text,candidates})});
  if(!response.ok)return {status:'unavailable',reason:response.status===429?'L’interprete è occupato. Puoi riprovare o usare la selezione delle carte.':'L’interprete IA non è disponibile. La selezione delle carte rimane utilizzabile.'};
  if(Number(response.headers.get('Content-Length'))>131072)return {status:'invalid',errors:['Risposta troppo grande.']};
  const raw=await response.text();if(raw.length>131072)return {status:'invalid',errors:['Risposta troppo grande.']};const body=JSON.parse(raw);if(body.version!==1||body.requiresConfirmation!==true||!body.proposal)return {status:'invalid',errors:['Risposta dell’interprete non valida.']};
  const checked=root.JudgeSceneAIProtocol.validate(body.proposal,text,config.schema);if(!checked.supported)return {status:'invalid',errors:checked.errors};
  if(signal?.aborted)return {status:'cancelled'};
  const grounded=await root.JudgeSceneAIProtocol.ground(checked.proposal,text,catalogue,name=>root.JudgeOracleRecognition.fetchCard(name),{resolutions});
  if(signal?.aborted)return {status:'cancelled'};
  if(!grounded.supported)return {status:'invalid',errors:grounded.errors};
  return {status:'proposal',grounded,model:body.model||null};
 }catch(error){if(signal?.aborted)return {status:'cancelled'};return {status:'unavailable',reason:error.name==='AbortError'?'L’interprete sta impiegando troppo tempo. Puoi riprovare o scegliere le carte.':'L’interprete IA non è raggiungibile. Puoi correggere il testo o scegliere le carte.'};}
 finally{clearTimeout(timer);unlink();}
}
root.JudgeSceneAI={interpret,availability:async()=>{try{return {enabled:(await settings()).enabled}}catch(e){return {enabled:false}}}};
})(typeof window!=='undefined'?window:globalThis);
