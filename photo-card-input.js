/* Local OCR proposes names; Begin still confirms the editable selection. */
(function(){'use strict';
const photo=document.getElementById('cardPhoto'),preview=document.getElementById('cardPhotoPreview'),info=document.getElementById('photoInfo');
const choices=document.createElement('div');choices.className='suggestions';info.after(choices);
let version=0,url=null,worker=null,lastField=null;
document.addEventListener('focusin',e=>{if(e.target.matches('[data-card-input]'))lastField=e.target;});
function target(){return Array.from(document.querySelectorAll('[data-card-input]')).find(f=>!f.value.trim())||lastField;}
function propose(name,current){if(current!==version)return;const field=target();if(!field||field.value.trim()){info.textContent='I campi sono già compilati. Svuota quello da sostituire e riprova.';return;}field.value=name;field.dataset.photoProposed='true';field.dispatchEvent(new Event('input',{bubbles:true}));choices.replaceChildren();info.textContent='Nome proposto: '+name+'. Controllalo prima di continuare.';}
async function read(current){
 let ownWorker=null;
 info.textContent='Leggo il nome dalla foto…';
 try{
  let text='';
  if(typeof window.TextDetector==='function'){const result=await window.JudgePhotoRecognition.recognize(preview,window);if(result.supported)text=result.text;}
  if(!text){
   ownWorker=await window.Tesseract.createWorker('eng',1,{workerPath:new URL('./vendor/ocr/worker.min.js',document.baseURI).href,corePath:new URL('./vendor/ocr/tesseract-core-lstm.wasm.js',document.baseURI).href,langPath:new URL('./vendor/ocr/',document.baseURI).href,workerBlobURL:false,gzip:true});
   if(current!==version){await ownWorker.terminate();return;}
   worker=ownWorker;
   await ownWorker.setParameters({tessedit_pageseg_mode:'6'});
   const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(preview.naturalWidth,preview.naturalHeight));canvas.width=Math.round(preview.naturalWidth*scale);canvas.height=Math.round(preview.naturalHeight*scale);canvas.getContext('2d').drawImage(preview,0,0,canvas.width,canvas.height);
   const result=await ownWorker.recognize(canvas);text=result.data.text;
  }
  if(current!==version)return;
  const names=new Set();
  // Search individual OCR lines rather than sending the first six body words.
  for(const line of text.split(/\n/).map(s=>s.trim()).filter(s=>s.length>=3).slice(0,16))for(const name of await window.JudgeCardData.suggest(line,5))names.add(name);
  const ranked=window.JudgePhotoRecognition.rank(text,[...names]);
  if(current!==version)return;
  const candidates=ranked.candidates.sort((a,b)=>b.score-a.score||b.name.length-a.name.length);
  if(candidates.length>1&&candidates.every(c=>window.JudgePhotoRecognition.normalize(candidates[0].name).includes(window.JudgePhotoRecognition.normalize(c.name)))){propose(candidates[0].name,current);return;}
  if(candidates.length===1||candidates.length>1&&candidates[0].score>candidates[1].score){propose(candidates[0].name,current);return;}
  info.textContent=candidates.length?'Ho trovato più nomi possibili. Scegli quello corretto.':'Non leggo un nome affidabile. Prova una foto più nitida o digita il nome.';
  for(const candidate of candidates){const b=document.createElement('button');b.type='button';b.textContent=candidate.name;b.onclick=()=>propose(candidate.name,current);choices.append(b);}
 }catch(e){if(current===version)info.textContent='Non riesco a leggere questa foto. Puoi cercare la carta scrivendo il nome.';}
 finally{if(ownWorker){await ownWorker.terminate();if(worker===ownWorker)worker=null;}}
}
photo.addEventListener('change',async()=>{
 const current=++version;choices.replaceChildren();if(worker){const previous=worker;worker=null;await previous.terminate();}
 if(current!==version)return;
 if(url)URL.revokeObjectURL(url);url=null;preview.hidden=true;
 const file=photo.files?.[0];if(!file)return;
 const check=window.JudgePhotoIntake.validate(file);if(!check.supported){info.textContent=check.reason;photo.value='';return;}
 url=URL.createObjectURL(file);preview.src=url;
 try{await preview.decode();if(current!==version)return;preview.hidden=false;await read(current);}catch(e){if(current===version)info.textContent='Il file non contiene una fotografia leggibile.';}
});
})();
