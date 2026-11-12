const CACHE='judge-pocket-beta-v83';
const ASSETS=['./','./index.html','./app.js','./engine.js','./rules-core.js','./simulator-ui.js','./event-picker.js','./state-editor.html','./state-editor.js','./state-bridge.js','./oracle-recognition.js','./judge-coordinator.js','./replacement-engine.js','./group-3-tests.js','./event-detector.js','./group-4a-tests.js','./trigger-conditions.js','./group-4c-tests.js','./trigger-engine.js','./delayed-triggers.js','./group-4d-tests.js','./apnap-stack.js','./group-4e-tests.js','./trigger-recognition.js','./trigger-flow.js','./group-4f-tests.js','./group-4f1-tests.js','./group-4f2-tests.js','./group-4f3-tests.js','./group-4f4-tests.js','./group-4f5-tests.js','./group-4f6-tests.js','./group-4f7-tests.js','./group-5a-tests.js','./group-5b-tests.js','./group-5c-tests.js','./group-5d-tests.js','./group-5e-tests.js','./group-5f-tests.js','./group-4b-tests.js','./group-4-tests.js','./group-4-tests.html','./event-pipeline.js','./local-sba.js','./stack-engine.js','./priority-engine.js','./target-engine.js','./resolution-engine.js','./choices-costs.js','./stack-operations.js','./turn-pipeline.js','./oracle-spell.js','./context.html','./context-interview.js','./scenario-minimum-tests.js','./SCENARIO_MINIMO.md','./context-ui.js','./guided-card-input.js','./guided-bridge.js','./sba-preview.js','./game-facts.js','./game-facts-tests.js','./autocomplete.js','./updater.js','./version.json','./manifest.webmanifest','./continuous-effects.js','./turn-kernel.js','./turn-ui.js','./turn-lab.html','./turn-tests.html','./turn-tests.js','./effect-executor.js','./effect-tests.js','./effect-tests.html','./layer-engine.js','./layer-group-tests.js','./unified-layer4.js','./unified-layer4-tests.js','./pt-layers.js','./group-2e-tests.js','./copy-layer.js','./group-2c-tests.js','./unified-continuous.js','./unified-continuous-tests.js','./group-2a-tests.js','./effect-lifetime.js','./group-2d-tests.js','./effect-model.js','./dependency-engine.js','./group-2g-tests.js','./group-2f-tests.js','./group-2b-tests.js','./layer-tests.js','./layer-tests.html','./oracle-compiler.js','./oracle-tests.js','./oracle-tests.html','./oracle-runtime.js','./runtime-tests.js','./runtime-tests.html','./oracle-playground.js','./land-layer-engine.js','./land-layer-tests.js','./continuous-state.js','./card-continuous-adapter.js'];
self.addEventListener('install',event=>{
 self.skipWaiting();
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
  self.clients.claim()
 ]));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
   return response;
  }).catch(()=>caches.match(request).then(cached=>cached||caches.match('./index.html'))));
  return;
 }
 event.respondWith(fetch(request,{cache:'no-cache'}).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
  return response;
 }).catch(()=>caches.match(request)));
});
