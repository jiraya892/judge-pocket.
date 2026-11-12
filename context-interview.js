/* Minimal context interview: questions only when state is missing. No card-specific rulings. */
(function(root){'use strict';
function next(input){const names=(input?.cards||[]).map(x=>String(x||'').trim()).filter(Boolean);if(names.length<2)return {status:'needCards',question:'Quali carte vuoi confrontare?',options:[]};
 const event=input.event;if(!event)return {status:'question',key:'event',question:'Che cosa sta succedendo?',options:[{id:'enter',label:'Una carta sta entrando nel campo di battaglia'},{id:'present',label:'Le carte sono già sul campo di battaglia'},{id:'cast',label:'Sto lanciando una magia'},{id:'other',label:'Un’altra situazione'}]};
 if(event==='enter'&&!input.entering)return {status:'question',key:'entering',question:'Quale carta sta entrando?',options:names.map((name,i)=>({id:String(i),label:name}))};
 if(event==='cast'&&!input.casting)return {status:'question',key:'casting',question:'Quale carta stai lanciando?',options:names.map((name,i)=>({id:String(i),label:name}))};
 if(event==='other'&&!String(input.description||'').trim())return {status:'question',key:'description',question:'Descrivi brevemente cosa sta succedendo',options:[]};
 return {status:'ready',context:{cards:names,event,entering:event==='enter'?names[Number(input.entering)]:null,casting:event==='cast'?names[Number(input.casting)]:null,description:input.description||''},message:'Situazione raccolta. Il motore deve verificare le regole e gli effetti Oracle prima di fornire un verdetto.'};
}
root.JudgeContextInterview={next};
})(typeof window!=='undefined'?window:globalThis);
