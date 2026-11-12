/* Group 4 — declarative triggered abilities (CR 603, 603.4, 603.6, 603.7, 603.10, 101.4).
   Explicit descriptors only; never guess Oracle semantics or resolve unknown effects. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function match(pattern,event,context){
 if(!pattern||!event||typeof pattern.type!=='string')return false;
 for(const [key,value] of Object.entries(pattern)){
  const actual=key.startsWith('before.')?context?.before?.[key.slice(7)]:key.startsWith('after.')?context?.after?.[key.slice(6)]:event[key];
  if(value==='*')continue;
  if(Array.isArray(value)){if(!value.includes(actual))return false;}
  else if(actual!==value)return false;
 }
 return true;
}
function legacyCondition(expr,ctx){
 if(expr===undefined||expr===null)return true;
 if(typeof expr!=='object'||Array.isArray(expr))return false;
 if(Array.isArray(expr.all))return expr.all.every(x=>condition(x,ctx));
 if(Array.isArray(expr.any))return expr.any.some(x=>condition(x,ctx));
 if(own(expr,'not'))return !condition(expr.not,ctx);
 if(typeof expr.path!=='string'||!['eq','ne','gt','gte','lt','lte','in'].includes(expr.op))return false;
 const parts=expr.path.split('.');if(!['event','before','after','source','controller'].includes(parts[0])||parts.some(p=>!p||p==='__proto__'||p==='constructor'||p==='prototype'))return false;
 let v=ctx;for(const p of parts)v=v?.[p];
 switch(expr.op){case 'eq':return v===expr.value;case 'ne':return v!==expr.value;case 'gt':return typeof v==='number'&&v>expr.value;case 'gte':return typeof v==='number'&&v>=expr.value;case 'lt':return typeof v==='number'&&v<expr.value;case 'lte':return typeof v==='number'&&v<=expr.value;case 'in':return Array.isArray(expr.value)&&expr.value.includes(v);}
 return false;
}
function condition(expr,ctx){return !!root.JudgeTriggerConditions&&root.JudgeTriggerConditions.test(expr,ctx);}
function observe(state,events,abilities,options={}){
 if(!root.JudgeTriggerConditions)return {supported:false,reason:'Motore condizioni 4C mancante'};
 if(!state||!Array.isArray(state.players)||!Array.isArray(events)||!Array.isArray(abilities))return {supported:false,reason:'Input non valido'};
 const players=state.players.map(p=>p.id);if(!players.length||new Set(players).size!==players.length)return {supported:false,reason:'Giocatori non validi'};
 const pending=clone(state.pendingTriggers||[]),used=new Set(state.firedDelayed||[]),trace=[];
 const ids=new Set();for(const a of abilities){
  if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id)||!players.includes(a.controller)||!a.event||typeof a.event.type!=='string'||!['normal','delayed','reflexive'].includes(a.kind||'normal'))return {supported:false,reason:'Descrittore abilità non valido'};
  if(a.interveningIf!=null&&!root.JudgeTriggerConditions.valid(a.interveningIf))return {supported:false,reason:'Condizione intervening-if non valida'};
  ids.add(a.id);
 }
 for(let i=0;i<events.length;i++){
  const record=events[i],event=record.event||record;
  if(!event||typeof event.type!=='string')return {supported:false,reason:'Evento non valido'};
  for(const a of abilities){
   if(a.kind==='delayed'&&used.has(a.id))continue;
   const source=(record.before?.objects||state.objects||[]).find(o=>o.id===a.source)||null;
   const afterSource=(record.after?.objects||state.objects||[]).find(o=>o.id===a.source)||null;
   // Ordinary battlefield triggers must exist at the relevant instant.
   // Leaves-the-battlefield and zone-change triggers inspect the before snapshot (LKI).
   const leaves=['leavesBattlefield','dies','moveZone'].includes(event.type)&&event.from==='battlefield';
   const validSource=a.kind==='delayed'||a.source===undefined||
      (leaves?source?.zone==='battlefield':afterSource?.zone==='battlefield');
   // An ability belonging to a specific incarnation must not fire for a different incarnation.
   const relevant=leaves?source:afterSource;
   if(a.sourceIdentity!==undefined&&relevant?.objectIdentity!==a.sourceIdentity)continue;
   if(!validSource||!match(a.event,event,record))continue;
   const ctx={event,before:record.before||null,after:record.after||null,source:leaves?source:afterSource,controller:a.controller};
   if(!condition(a.interveningIf,ctx))continue;
   const id='trigger:'+i+':'+a.id;
   pending.push({id,abilityId:a.id,controller:a.controller,source:a.source??null,event:clone(event),description:a.description||'',interveningIf:clone(a.interveningIf??null),context:clone(ctx),resolution:'manual'});
   trace.push(id);
   if(a.kind==='delayed'&&a.once!==false)used.add(a.id);
  }
 }
 return {supported:true,pending,firedDelayed:[...used],trace};
}
function stackAPNAP(state,pending,orders={}){
 const players=state?.players?.map(p=>p.id)||[],start=players.indexOf(state?.activePlayer);
 if(start<0||new Set(players).size!==players.length||!Array.isArray(pending))return {supported:false,reason:'Stato APNAP non valido'};
 if(pending.some(t=>!players.includes(t.controller)))return {supported:false,reason:'Controllore innesco non valido'};
 const sequence=players.slice(start).concat(players.slice(0,start)),placements=[];
 for(const id of sequence){
  const theirs=pending.filter(t=>t.controller===id),order=orders[id];
  if(theirs.length>1&&(!Array.isArray(order)||order.length!==theirs.length||new Set(order).size!==theirs.length||theirs.some(t=>!order.includes(t.id))))return {supported:false,reason:'Scelta ordine richiesta',player:id,options:theirs.map(t=>t.id)};
  if(order&&(!Array.isArray(order)||order.length!==theirs.length||new Set(order).size!==theirs.length||theirs.some(t=>!order.includes(t.id))))return {supported:false,reason:'Ordine non valido',player:id};
  placements.push(...(order?order.map(tid=>theirs.find(t=>t.id===tid)):theirs));
 }
 return {supported:true,stack:[...(state.stack||[]),...clone(placements)],placements:placements.map(t=>t.id),pending:[]};
}
function recheck(trigger,current){
 if(!trigger||!current)return {supported:false,reason:'Contesto assente'};
 if(root.JudgeTriggerConditions)return root.JudgeTriggerConditions.resolution(trigger,current);
 return {supported:false,reason:'Motore condizioni 4C non disponibile'};
}
root.JudgeTriggers={match,condition,observe,stackAPNAP,recheck};
})(typeof window!=='undefined'?window:globalThis);
