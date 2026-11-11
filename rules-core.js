/* Judge Pocket game-state kernel. Partial, deterministic, NOT a full rules engine.
   Reference groups: 400, 603, 614, 616, 704. Only declared operations are executable. */
(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
const next=(s,p)=>p+(s.nextId++);
function player(s,id){const p=s.players.find(p=>p.id===id);if(!p)throw Error('Giocatore sconosciuto: '+id);return p}
function get(s,id){const o=s.objects.find(o=>o.id===id);if(!o)throw Error('Oggetto sconosciuto: '+id);return o}
function createGame(ids=['A','B'],life=20){
 if(ids.length<2||new Set(ids).size!==ids.length)throw Error('Servono almeno due giocatori diversi');
 return {players:ids.map(id=>({id,life,poison:0,lost:false,drawFromEmpty:false})),
 objects:[],stack:[],pending:[],nextId:1,activePlayer:ids[0],priorityPlayer:ids[0],passes:0,log:[]};
}
function addObject(s,data){
 player(s,data.owner);player(s,data.controller||data.owner);
 const o={id:next(s,'o'),name:data.name,owner:data.owner,controller:data.controller||data.owner,
 zone:data.zone||'battlefield',types:(data.types||[]).map(t=>t.toLowerCase()),
 oracle_text:data.oracle_text||'',card_faces:copy(data.card_faces||[]),
 token:!!data.token,power:data.power??null,toughness:data.toughness??null,loyalty:data.loyalty??null,
 counters:copy(data.counters||{}),damage:0,deathtouchMarked:false,tapped:false,indestructible:!!data.indestructible};
 if(!o.name)throw Error('Nome oggetto mancante');
 s.objects.push(o);return o;
}
function moveZone(s,oid,to,controller){
 const old=copy(get(s,oid));s.objects=s.objects.filter(o=>o.id!==oid);
 if(old.token&&to!=='battlefield'){s.log.push('Pedina cessata: '+old.name);return {before:old,after:null}}
 const o={...old,id:next(s,'o'),zone:to,controller:controller||old.owner,
 counters:{},damage:0,deathtouchMarked:false,tapped:false};
 s.objects.push(o);s.log.push(old.name+' '+old.zone+' -> '+to);return {before:old,after:o};
}
const battlefield=s=>s.objects.filter(o=>o.zone==='battlefield');
const typed=(o,type)=>o.types.includes(type);
function modifiers(s){
 if(!root.JudgeEngine)return [];
 const found=[];
 for(const o of battlefield(s)){
  const f=root.JudgeEngine.parse(o);
  if(f.tokenDouble)found.push({id:o.id+':token',name:o.name,event:'createTokens',op:'double',controller:o.controller,condition:'token'});
  if(f.counterDouble)found.push({id:o.id+':doubleCounter',name:o.name,event:'putCounters',op:'double',controller:o.controller,condition:'doubleCounter'});
  if(f.counterPlusOne)found.push({id:o.id+':plusCounter',name:o.name,event:'putCounters',op:'add',amount:1,controller:o.controller,condition:'plusCounter'});
 }
 return found;
}
function allowed(m,e,s){
 if(m.event!==e.type||!Number.isInteger(e.amount)||e.amount<1)return false;
 if(m.condition==='token')return m.controller===e.player;
 const o=s.objects.find(x=>x.id===e.target);
 if(!o||o.zone!=='battlefield'||o.controller!==m.controller)return false;
 if(m.condition==='doubleCounter')return e.fromEffect===true;
 if(m.condition==='plusCounter')return e.counterType==='+1/+1'&&typed(o,'creature');
 return false;
}
function previewEvent(s,event){
 const e=copy(event);
 if(!['createTokens','putCounters'].includes(e.type))return {variants:[{event:e,order:[]}],amounts:[],truncated:false};
 if(!Number.isInteger(e.amount)||e.amount<0)throw Error('Quantità non valida');
 const variants=[],mod=modifiers(s),limit=32;
 function walk(ev,used,order){
  const left=mod.filter(m=>!used.has(m.id)&&allowed(m,ev,s));
  if(!left.length){variants.push({event:ev,order});return}
  for(const m of left){
   if(variants.length>=limit)return;
   walk({...ev,amount:m.op==='double'?ev.amount*2:ev.amount+m.amount},
       new Set([...used,m.id]),[...order,m.id]);
  }
 }
 walk(e,new Set(),[]);
 return {variants,amounts:[...new Set(variants.map(x=>x.event.amount))].sort((a,b)=>a-b),truncated:variants.length>=limit};
}
function applyEvent(s,event,order){
 const preview=previewEvent(s,event);
 if(preview.truncated)return {applied:false,reason:'Troppi rami: verifica manuale necessaria',preview};
 if(['createTokens','putCounters','gainLife','loseLife','dealDamage'].includes(event.type)&&(!Number.isInteger(event.amount)||event.amount<0))return {applied:false,reason:'Quantità non valida',preview};
 if(preview.amounts.length>1&&!order)return {applied:false,requiresChoice:true,preview};
 const variant=order?preview.variants.find(v=>v.order.join(',')===order.join(',')):preview.variants[0];
 if(!variant)return {applied:false,reason:'Ordine degli effetti non valido',preview};
 const e=variant.event;let result={applied:true,event:e,order:variant.order,created:[]};
 if(e.type==='createTokens'){
  if(!e.token||!e.token.name||e.amount>100||!s.players.some(p=>p.id===e.player))return {applied:false,reason:'Pedina non specificata o più di 100 pedine',preview};
  for(let i=0;i<e.amount;i++)result.created.push(addObject(s,{...e.token,token:true,owner:e.player,controller:e.player}).id);
 }else if(e.type==='putCounters'){
  const o=get(s,e.target);if(o.zone!=='battlefield')return {applied:false,reason:'Oggetto fuori dal campo',preview};
  const key=e.counterType||'+1/+1';o.counters[key]=(o.counters[key]||0)+e.amount;
 }else if(e.type==='gainLife')player(s,e.player).life+=e.amount;
 else if(e.type==='loseLife')player(s,e.player).life-=e.amount;
 else if(e.type==='dealDamage'){
  const target=s.objects.find(o=>o.id===e.target);
  if(target){target.damage+=e.amount;if(e.deathtouch&&e.amount>0)target.deathtouchMarked=true}
  else player(s,e.target).life-=e.amount;
 }else if(e.type==='tap'||e.type==='untap'){get(s,e.target).tapped=e.type==='tap'}
 else if(e.type==='moveZone')result.moved=moveZone(s,e.target,e.to,e.controller);
 else if(e.type==='enterBattlefield'){
  result.moved=moveZone(s,e.target,'battlefield',e.controller);
  if(result.moved.after)result.triggers=queueEnterTriggers(s,result.moved.after);
 }else return {applied:false,reason:'Evento non supportato',preview};
 s.log.push('Evento applicato: '+e.type);return result;
}
function queueEnterTriggers(s,entered){
 if(!root.JudgeEngine)return [];
 const queued=[];
 for(const o of battlefield(s)){
  const lines=root.JudgeEngine.textOf(o).split('\n');
  for(const line of lines){
   if(!/^(when|whenever)\b/i.test(line)||!/\benters(?: the battlefield)?\b/i.test(line))continue;
   const self=/^(when|whenever)\s+(~|this creature|this permanent|this artifact)\s+enters/i.test(line);
   const escaped=o.name.replace(/[^a-zA-Z0-9 ]/g,'\\$&');
   const named=new RegExp('^(when|whenever)\\s+'+escaped+'\\s+enters','i').test(line);
   const any=/^whenever (?:a|another) (?:creature|artifact|permanent) enters\b/i.test(line);
   if(!(self||named||any))continue;
   if((self||named)&&o.id!==entered.id)continue;
   if(any&&/\bcreature enters/i.test(line)&&!typed(entered,'creature'))continue;
   if(any&&/\bartifact enters/i.test(line)&&!typed(entered,'artifact'))continue;
   if(/under your control/i.test(line)&&o.controller!==entered.controller)continue;
   let copies=1;
   for(const m of battlefield(s)){
    if(m.controller!==o.controller)continue;
    const f=root.JudgeEngine.parse(m);
    if(f.etbExtra&&(!f.etbArtifactCreature||typed(entered,'artifact')||typed(entered,'creature')))copies++;
   }
   for(let i=0;i<copies;i++){
    const t={id:next(s,'t'),kind:'trigger',controller:o.controller,source:o.id,description:line,
     targetEvent:entered.id,resolution:'manual'};
    s.pending.push(t);queued.push(t);
   }
  }
 }
 return queued;
}
function putTriggersOnStack(s,orderByPlayer={}){
 const ids=s.players.map(p=>p.id),start=ids.indexOf(s.activePlayer);
 const apnap=[...ids.slice(start),...ids.slice(0,start)],placements=[];
 // Validate all player-defined orders before changing the stack.
 for(const id of apnap){
  const theirs=s.pending.filter(t=>t.controller===id);
  const order=orderByPlayer[id];
  if(theirs.length>1&&(!Array.isArray(order)||order.length!==theirs.length||
    new Set(order).size!==theirs.length||theirs.some(t=>!order.includes(t.id))))
    return {applied:false,reason:'Serve ordinare gli inneschi del giocatore '+id,options:theirs};
 }
 for(const id of apnap){
  const theirs=s.pending.filter(t=>t.controller===id);
  const order=orderByPlayer[id];
  if(theirs.length>1&&(!Array.isArray(order)||order.length!==theirs.length||
    new Set(order).size!==theirs.length||theirs.some(t=>!order.includes(t.id))))
    return {applied:false,reason:'Serve ordinare gli inneschi del giocatore '+id,options:theirs};
  const queue=order?order.map(tid=>theirs.find(t=>t.id===tid)):theirs;
  for(const tr of queue){s.stack.push(tr);placements.push(tr.id)}
 }
 s.pending=[];return {applied:true,placements};
}
function pushStack(s,item){
 player(s,item.controller);
 const entry={id:next(s,'s'),controller:item.controller,kind:item.kind||'spell',
 source:item.source||null,targets:copy(item.targets||[]),description:item.description||'',resolution:'manual'};
 s.stack.push(entry);s.passes=0;return entry;
}
function targetStillLegal(s,target){
 if(s.players.some(p=>p.id===target.id))return true;
 const o=s.objects.find(o=>o.id===target.id);
 return !!o&&(target.zone===undefined||o.zone===target.zone);
}
function passPriority(s,id){
 if(s.priorityPlayer!==id)throw Error('Priorità non del giocatore '+id);
 const ids=s.players.map(p=>p.id),n=ids.indexOf(id);
 s.passes++;s.priorityPlayer=ids[(n+1)%ids.length];
 if(s.passes<ids.length)return {type:'pass',next:s.priorityPlayer};
 s.passes=0;s.priorityPlayer=s.activePlayer;
 if(!s.stack.length)return {type:'nextStepRequired'};
 const entry=s.stack.pop(),legality=entry.targets.map(t=>targetStillLegal(s,t));
 return {type:'resolveManually',entry,legalTargets:legality,allTargetsIllegal:legality.length>0&&legality.every(v=>!v)};
}
function stateBasedActions(s){
 const out=[];
 for(const p of s.players)if(!p.lost&&(p.life<=0||p.poison>=10||p.drawFromEmpty)){
  p.lost=true;out.push({type:'loss',player:p.id,reason:p.life<=0?'life':p.poison>=10?'poison':'emptyLibrary'});
 }
 for(const o of [...battlefield(s)]){
  if(typed(o,'creature')&&o.toughness!==null){
   const pt=o.toughness+(o.counters['+1/+1']||0)-(o.counters['-1/-1']||0);
   if(pt<=0||(!o.indestructible&&(o.damage>=pt||o.deathtouchMarked))){
    const reason=pt<=0?'toughness':o.deathtouchMarked?'deathtouch':'damage';
    moveZone(s,o.id,'graveyard');out.push({type:'creatureLeaves',name:o.name,reason});
   }
  }
  if(typed(o,'planeswalker')&&o.loyalty!==null&&o.loyalty+(o.counters.loyalty||0)<=0){
   moveZone(s,o.id,'graveyard');out.push({type:'planeswalkerLeaves',name:o.name,reason:'loyalty'});
  }
 }
 return out;
}
root.JudgeRulesCore={createGame,addObject,moveZone,battlefield,modifiers,previewEvent,applyEvent,
 queueEnterTriggers,putTriggersOnStack,pushStack,targetStillLegal,passPriority,stateBasedActions};
})(typeof window!=='undefined'?window:globalThis);
