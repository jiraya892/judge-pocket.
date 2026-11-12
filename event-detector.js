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
  if(from===to)continue;
  // Object IDs must represent one zone-change identity; a reused ID is not a new object.
  if(from==='battlefield'&&to!=='battlefield'){
   const event={type:'leavesBattlefield',target:id,from,to,controller:b.controller??null};emit(event,b,a);
   if(to==='graveyard'&&b.types?.includes('creature'))emit({...event,type:'dies'},b,a);
  }
  if(to==='battlefield'&&from!=='battlefield')emit({type:'enterBattlefield',target:id,from,to,controller:a.controller??null},b,a);
  if(from!==null&&to!==null)emit({type:'moveZone',target:id,from,to},b,a);
 }
 return {supported:true,records};
}
root.JudgeEventDetector={detect};
})(typeof window!=='undefined'?window:globalThis);
