/* Suggestions via Scryfall autocomplete; substring fallback via search API. */
(function(){
'use strict';
const field=document.getElementById('name'), list=document.getElementById('suggestions');
if(!field||!list)return;
let timer,controller,seq=0,selected='';
function clear(){list.replaceChildren();list.hidden=true;}
function display(names){
 clear();
 const unique=[...new Set(names)].slice(0,12);
 for(const name of unique){
  const b=document.createElement('button');
  b.type='button';b.className='suggestion';b.textContent=name;
  b.addEventListener('click',()=>{
   field.value=name;selected=name;clear();document.getElementById('add').click();
  });
  list.append(b);
 }
 list.hidden=!unique.length;
}
async function search(q){
 controller?.abort();controller=new AbortController();
 const signal=controller.signal,run=++seq;
 try{
  const a=await fetch('https://api.scryfall.com/cards/autocomplete?q='+encodeURIComponent(q),{signal});
  if(!a.ok)throw Error('Ricerca temporaneamente non disponibile');
  const j=await a.json();
  let names=Array.isArray(j.data)?j.data:[];
  // Autocomplete favors prefixes. Include names containing the query (e.g. Moon -> Blood Moon).
  if(q.length>=3){
   try{
    const r=await fetch('https://api.scryfall.com/cards/search?q='+encodeURIComponent('name:"'+q.replace(/"/g,'')+'"')+'&unique=cards&order=name',{signal});
    if(r.ok){
     const data=await r.json();
     const extra=(data.data||[]).map(c=>c.name).filter(n=>n.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
     names=[...names,...extra];
    }
   }catch(e){if(e.name==='AbortError')return;}
  }
  if(run!==seq||field.value.trim()!==q)return;
  display(names.filter(n=>n.toLocaleLowerCase().includes(q.toLocaleLowerCase())));
 }catch(e){
  if(e.name!=='AbortError'&&run===seq)clear();
 }
}
field.addEventListener('input',()=>{
 const q=field.value.trim();selected='';clear();clearTimeout(timer);controller?.abort();seq++;
 if(q.length<2)return;
 timer=setTimeout(()=>search(q),280);
});
field.addEventListener('keydown',e=>{if(e.key==='Escape')clear();});
document.getElementById('add').addEventListener('click',()=>{clear();controller?.abort();});
document.addEventListener('click',e=>{if(e.target!==field&&!list.contains(e.target))clear();});
})();