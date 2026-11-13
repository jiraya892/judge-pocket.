/* Installation and service-worker registration from either entry page. */
(function(){'use strict';
let installPrompt;const button=document.getElementById('installApp'),status=document.getElementById('installStatus');
if('serviceWorker'in navigator)window.addEventListener('load',()=>{
 navigator.serviceWorker.register('./sw.js').catch(()=>{if(status)status.textContent='Modalità offline non disponibile. Puoi continuare a usare l’app online.'});
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(button)button.hidden=false});
if(button)button.onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();const result=await installPrompt.userChoice;if(result.outcome==='accepted')button.hidden=true;installPrompt=null};
window.addEventListener('appinstalled',()=>{if(button)button.hidden=true;if(status)status.textContent='Judge Pocket è stata aggiunta al dispositivo.'});
if(status&&/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.matchMedia('(display-mode: standalone)').matches)status.textContent='Su iPhone o iPad: apri in Safari, tocca Condividi e poi Aggiungi alla schermata Home.';
})();
