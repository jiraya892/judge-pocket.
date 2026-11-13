const CACHE='judge-pocket-beta-shell-v85';
const ASSETS=["./","./index.html","./context.html","./manifest.webmanifest","./version.json","./icons/icon-192.png","./icons/icon-512.png","./data/oracle/index.json","./pwa.js","./updater.js","./fact-clarifier.js","./required-facts.js","./conditional-facts.js","./interview-flow.js","./context-interview.js","./scenario-minimum-tests.js","./rules-core.js","./layer-engine.js","./land-layer-engine.js","./continuous-state.js","./effect-lifetime.js","./effect-model.js","./dependency-engine.js","./unified-layer4.js","./pt-layers.js","./copy-layer.js","./unified-continuous.js","./local-sba.js","./scenario-stabilizer.js","./judge-coordinator.js","./outcome-trust.js","./local-rules-source.js","./corpus-integrity.js","./corpus-importer.js","./rules-text-parser.js","./official-txt-acquisition.js","./official-txt-validation.js","./official-acquisition-pipeline.js","./acquisition-handoff.js","./acquisition-report-seal.js","./rules-acquisition.js","./corpus-coverage.js","./corpus-version-review.js","./rules-import-flow.js","./pin-authority.js","./secure-rules-import.js","./built-in-trust.js","./official-import-boundary.js","./guided-trust-gate.js","./evidence-ledger.js","./card-data.js","./oracle-recognition.js","./sba-preview.js","./game-facts.js","./question-planner.js","./replacement-engine.js","./event-pipeline.js","./event-detector.js","./trigger-conditions.js","./trigger-engine.js","./delayed-triggers.js","./apnap-stack.js","./trigger-recognition.js","./trigger-flow.js","./stack-engine.js","./priority-engine.js","./target-engine.js","./resolution-engine.js","./choices-costs.js","./stack-zone.js","./stack-operations.js","./atomic-resolution.js","./turn-pipeline.js","./oracle-spell.js","./creature-traits.js","./spell-scenario.js","./entry-scenario.js","./guided-bridge.js","./explanation-view.js","./result-view.js","./context-ui.js","./photo-intake.js","./photo-recognition.js","./photo-session.js","./photo-workflow.js","./guided-card-input.js"];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('judge-pocket-beta-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // Oracle shards are immutable within this cache version. Cache only successful
 // responses; integrity is checked by the data provider before using the bytes.
 if(url.pathname.includes('/data/oracle/')&&url.pathname.endsWith('.json.gz')){
  event.respondWith(caches.open(CACHE).then(async cache=>{
   const cached=await cache.match(request);if(cached)return cached;
   const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;
  }));return;
 }
 event.respondWith((async()=>{
  try{const response=await fetch(request,{cache:'no-cache'});if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}return response;}
  catch(error){const cached=await caches.match(request);if(cached)return cached;
   if(request.mode==='navigate')return caches.match('./index.html');
   return new Response('Risorsa non disponibile offline',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
 })());
});
