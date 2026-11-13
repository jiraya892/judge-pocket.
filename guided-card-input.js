/* Local-first card search, including optional cards. Photo stays reference-only. */
(function(){'use strict';
function bind(field,list){let timer,seq=0;
 const clear=()=>{list.replaceChildren();list.hidden=true};
 function show(names,q,run){
  if(run!==seq||field.value.trim()!==q||field.closest('[hidden]'))return;
  clear();for(const name of names.slice(0,10)){const button=document.createElement('button');button.type='button';button.textContent=name;button.setAttribute('role','option');button.onclick=()=>{field.value=name;seq++;clear()};list.append(button)}list.hidden=!list.children.length;
 }
 field.addEventListener('input',()=>{clearTimeout(timer);const q=field.value.trim(),run=++seq;clear();if(q.length<2)return;
  timer=setTimeout(async()=>{
   let local=[];try{local=await window.JudgeCardData.suggest(q);}catch(e){}
   show(local,q,run);
   const fresh=await window.JudgeCardRefresh?.suggest(q)||[];
   // Reserve half the visible suggestions for newly available online matches.
   const merged=[...new Set(fresh.length?[...local.slice(0,5),...fresh,...local.slice(5)]:local)];show(merged,q,run);
  },250);
 });
 field.addEventListener('keydown',e=>{if(e.key==='Escape'){seq++;clear()}});field.addEventListener('blur',()=>setTimeout(()=>{seq++;clear()},180));
}
for(const [fieldId,listId] of [['card1','suggest1'],['card2','suggest2'],['contextCard','suggestContext'],['extraName','suggestExtra']])bind(document.getElementById(fieldId),document.getElementById(listId));
const add=document.getElementById('addCard');
function refreshExtraCards(){
 const extras=Array.from(document.querySelectorAll('[data-extra-card]'));
 extras.forEach((box,index)=>{const position=index+3,word=position===3?'terza':'quarta';box.querySelector('label').firstChild.textContent=(position===3?'Terza':'Quarta')+' carta';box.querySelector('input').id='card'+position;box.querySelector('.suggestions').id='suggest'+position;box.querySelector('[data-remove-card]').textContent='Rimuovi la '+word+' carta'});
 if(add){add.hidden=extras.length>=2;add.textContent=extras.length?'Aggiungi una quarta carta':'Aggiungi una terza carta';}
}
if(add)add.onclick=()=>{
 const position=document.querySelectorAll('[data-card-input]').length+1;if(position>4)return;
 const box=document.createElement('div'),label=document.createElement('label'),field=document.createElement('input'),list=document.createElement('div'),remove=document.createElement('button');
 box.setAttribute('data-extra-card','');label.textContent=position===3?'Terza carta':'Quarta carta';field.autocomplete='off';field.placeholder='Nome della carta';field.setAttribute('data-card-input','');label.append(field);list.className='suggestions';list.hidden=true;list.setAttribute('role','listbox');remove.type='button';remove.setAttribute('data-remove-card','');remove.className='option';remove.onclick=()=>{box.remove();refreshExtraCards()};box.append(label,list,remove);document.getElementById('cardFields').append(box);bind(field,list);refreshExtraCards();field.focus();
};
})();
