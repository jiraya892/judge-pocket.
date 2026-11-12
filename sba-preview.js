/* Conservative state-based-action preview (CR 704): no mutation, no fabricated choices. */
(function(root){'use strict';
function preview(results,objects){
 if(!Array.isArray(results)||!Array.isArray(objects))return {supported:false,reason:'Stato incompleto'};
 const actions=[],unknown=[];
 for(const r of results){
  const source=objects.find(o=>o.id===r.id);
  if(!source||r.status!=='partial'){unknown.push({id:r.id,reason:'Caratteristiche non verificate'});continue}
  if(!r.types?.includes('creature'))continue;
  if(!Number.isFinite(r.toughness)){unknown.push({id:r.id,reason:'Costituzione non determinata'});continue}
  if(r.toughness<=0)actions.push({id:r.id,name:r.name,action:'moveToGraveyard',reason:'CR 704.5f: costituzione pari o inferiore a zero',requiresChoice:false});
  else if(Number.isFinite(r.damage)&&r.damage>=r.toughness){unknown.push({id:r.id,reason:'Danno letale potenziale: indistruttibile e prevenzioni non ancora verificati'})}
 }
 return {supported:unknown.length===0,actions,unknown,executed:false};
}
root.JudgeSBAPreview={preview};
})(typeof window!=='undefined'?window:globalThis);
