const CACHE='judge-pocket-beta-v44';
const ASSETS=['./','./index.html','./app.js','./engine.js','./rules-core.js','./simulator-ui.js','./event-picker.js','./state-editor.html','./state-editor.js','./state-bridge.js','./oracle-recognition.js','./judge-coordinator.js','./event-pipeline.js','./turn-pipeline.js','./oracle-spell.js','./context.html','./context-interview.js','./context-ui.js','./guided-bridge.js','./sba-preview.js','./game-facts.js','./game-facts-tests.js','./autocomplete.js','./updater.js','./version.json','./manifest.webmanifest','./continuous-effects.js','./turn-kernel.js','./turn-ui.js','./turn-lab.html','./turn-tests.html','./turn-tests.js','./effect-executor.js','./effect-tests.js','./effect-tests.html','./layer-engine.js','./layer-group-tests.js','./unified-layer4.js','./unified-layer4-tests.js','./unified-continuous.js','./unified-continuous-tests.js','./layer-tests.js','./layer-tests.html','./oracle-compiler.js','./oracle-tests.js','./oracle-tests.html','./oracle-runtime.js','./runtime-tests.js','./runtime-tests.html','./oracle-playground.js','./land-layer-engine.js','./land-layer-tests.js','./continuous-state.js','./card-continuous-adapter.js'];
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
