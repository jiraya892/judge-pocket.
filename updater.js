(function(){
'use strict';
const current=document.querySelector('meta[name="app-version"]')?.content||'0.8.1',box=document.getElementById('updateNotice'),label=document.getElementById('updateText');
const newer=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)>(y[i]||0)}return false;};
async function check(){
 if(!navigator.onLine)return;
 try{
  const r=await fetch('./version.json?t='+Date.now(),{cache:'no-store'});
  if(!r.ok)return;
  const data=await r.json();
  if(typeof data.version==='string'&&newer(data.version,current)){
   label.textContent='È disponibile Judge Pocket Beta '+data.version+'.';
   box.hidden=false;
  }else{box.hidden=true;}
 }catch(e){}
}
document.getElementById('updateNow').addEventListener('click',async()=>{
 const b=document.getElementById('updateNow');b.disabled=true;b.textContent='Aggiornamento…';
 try{
  if('serviceWorker'in navigator){
   const reg=await navigator.serviceWorker.getRegistration();
   if(reg)await reg.update();
  }
 }catch(e){}
 const u=new URL(location.href);u.searchParams.set('updated',Date.now().toString());location.replace(u.href);
});
document.getElementById('updateLater').addEventListener('click',()=>{box.hidden=true;});
window.addEventListener('focus',check);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
setInterval(check,120000);
check();
})();