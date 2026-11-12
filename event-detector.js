/* Group 4A: deterministic transition-to-event detector. No Oracle text guessing. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function detect(before,after){
 if(!before||!after||!Array.isArray(before.objects)||!Array.isArray(after.objects))return {supported:false,reason:'Snapshot oggetti mancanti'};
 const ids=new Set(),old=new Map(),now=new Map();
 for(const [items,map] of [[before.objects,old],[after.objects,now]])for(const obj of items){
  if(!obj||typeof obj.id!=='string'||!obj.id||map.has(obj.id)||typeof obj.zone!=='string')return {supported:false,reason:'Oggetto o ID non valido'};
  map.set(obj.id,obj);ids.add(obj.id);
 }
 const records=[];
 const emit=(event,b,a)=>records.push({event,before:clone({objects:before.objects,object:b||null}),after:clone({objects:after.objects,object:a||null})});
 for(const id of ids){
  const b=old.get(id),a=now.get(id),from=b?.zone??null,to=a?.zone??null;
  // A stable ID may be reused across snapshots only if the identity token is stable.
  // A same-zone identity change hides one or more zone transitions: refuse to guess.
  if(from===to){if(b&&a&&b.objectIdentity!==undefined&&a.objectIdentity!==undefined&&b.objectIdentity!==a.objectIdentity)return {supported:false,reason:'Identità cambiata senza transizione di zona osservabile',requiredFacts:[{key:'hiddenZoneTransition:'+id,question:'Il permanente '+id+' è uscito dalla zona '+from+' ed è poi rientrato? Quali cambi di zona sono avvenuti?',options:[],reason:'L’identità è cambiata ma gli eventi intermedi non sono noti'}]};continue;}
  if(b&&a&&b.objectIdentity!==undefined&&a.objectIdentity!==undefined&&b.objectIdentity===a.objectIdentity)return {supported:false,reason:'Cambio zona senza nuova identità oggetto',requiredFacts:[{key:'newObjectIdentity:'+id,question:'Confermi che '+id+' ha cambiato zona da '+from+' a '+to+' e rappresenta un nuovo oggetto?',options:[{id:'yes',label:'Sì, è un nuovo oggetto'},{id:'unknown',label:'Non lo so'}],reason:'Un cambio di zona crea normalmente un nuovo oggetto'}]};
  // Object IDs must represent one zone-change identity; a reused ID is not a new object.
  if(from==='battlefield'&&to!=='battlefield'){
   const event={type:'leavesBattlefield',target:id,from,to,controller:b.controller??null,objectIdentity:b.objectIdentity??id};emit(event,b,a);
   if(to==='graveyard'&&b.types?.includes('creature'))emit({...event,type:'dies'},b,a);
  }
  if(to==='battlefield'&&from!=='battlefield')emit({type:'enterBattlefield',target:id,from,to,controller:a.controller??null,objectIdentity:a.objectIdentity??id},b,a);
  if(from!==null&&to!==null)emit({type:'moveZone',target:id,from,to,fromIdentity:b?.objectIdentity??id,toIdentity:a?.objectIdentity??id},b,a);
 }
 return {supported:true,records};
}
root.JudgeEventDetector={detect};
})(typeof window!=='undefined'?window:globalThis);
