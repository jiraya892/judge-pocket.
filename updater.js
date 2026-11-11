(function(){
'use strict';
const current='0.7',box=document.getElementById('updateNotice'),label=document.getElementById('updateText');
const newer=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return x.some((v,i)=>v>(y[i]||0)&&x.slice(0,i).every((n,j)=>n===(y[j]||0)));};
async function check(){
 if(!navigator.onLine)return;
 try{
  const r=await fetch('./version.json?t='+Date.now(),{cache:'no-store'});
  if(!r.ok)return;
  const data=await r.json();
  if(typeof data.version==='string'&&newer(data.version,current)){
   label.textContent='È disponibile Judge Pocket Beta '+data.version+'.';
   box.hidden=false;
  }
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