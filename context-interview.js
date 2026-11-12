/* Minimal context interview: questions only when state is missing. No card-specific rulings. */
(function(root){'use strict';
function next(input){const names=(input?.cards||[]).map(x=>String(x||'').trim()).filter(Boolean);if(names.length<2)return {status:'needCards',question:'Quali carte vuoi confrontare?',options:[]};
 const event=input.event;if(!event)return {status:'question',key:'event',question:'Che cosa sta succedendo?',options:[{id:'enter',label:'Una carta sta entrando nel campo di battaglia'},{id:'present',label:'Le carte sono già sul campo di battaglia'},{id:'cast',label:'Sto lanciando una magia'},{id:'other',label:'Un’altra situazione'}]};
 if(event==='enter'&&!input.entering)return {status:'question',key:'entering',question:'Quale carta sta entrando?',options:names.map((name,i)=>({id:String(i),label:name}))};
 if(event==='cast'&&!input.casting)return {status:'question',key:'casting',question:'Quale carta stai lanciando?',options:names.map((name,i)=>({id:String(i),label:name}))};
 if(event==='other'&&!String(input.description||'').trim())return {status:'question',key:'description',question:'Descrivi brevemente cosa sta succedendo',options:[]};
 if(!input.controllers||input.controllers.length!==names.length)return {status:'question',key:'controllers',question:'Chi controlla '+names[(input.controllers||[]).length]+'?',options:[{id:'A',label:'Giocatore A'},{id:'B',label:'Giocatore B'}]};
 if(!input.board)return {status:'question',key:'board',question:'Ci sono altri permanenti che potrebbero influire?',options:[{id:'complete',label:'No, soltanto queste carte'},{id:'additional',label:'Sì, ci sono altre carte'}]};
 if(input.board==='additional'&&!input.extraComplete)return {status:'question',key:'extraCards',question:'Aggiungi altri permanenti rilevanti, uno alla volta. Quando hai finito premi Continua.',options:[{id:'done',label:'Continua con le carte aggiunte'}]};
 if(input.event==='present'&&!input.order)return {status:'question',key:'order',question:'Quale carta è entrata per prima?',options:names.map((name,i)=>({id:String(i),label:name}))};
 return {status:'ready',context:{cards:names,event,controllers:input.controllers,board:input.board,extraComplete:!!input.extraComplete,order:input.order? [Number(input.order),...names.map((_,i)=>i).filter(i=>i!==Number(input.order))]:null,enteringIndex:input.event==='enter'?Number(input.entering):null,castingIndex:input.event==='cast'?Number(input.casting):null,entering:event==='enter'?names[Number(input.entering)]:null,casting:event==='cast'?names[Number(input.casting)]:null,description:input.description||''},message:'Situazione raccolta. Il motore deve verificare le regole e gli effetti Oracle prima di fornire un verdetto.'};
}
root.JudgeContextInterview={next};
})(typeof window!=='undefined'?window:globalThis);
