/* Unified layer-4 type effects: a single state and ordered effect queue.
   Deliberately refuses ambiguous dependency patterns rather than issuing rulings. */
(function(root){'use strict';
const basic=['Plains','Island','Swamp','Mountain','Forest'];const mana={Plains:'W',Island:'U',Swamp:'B',Mountain:'R',Forest:'G'};
const kinds=new Set(['addType','removeType','addLandSubtype','setNonbasicLandSubtype']);
function clone(o){return {...o,types:[...o.types],subtypes:[...(o.subtypes||[])],supertypes:[...(o.supertypes||[])],abilities:[...(o.abilities||[])]}}
function applies(e,o){if(e.targetId&&e.targetId!=='all'&&e.targetId!==o.id)return false;
 if(e.kind==='addLandSubtype')return e.scope==='nontokenCreaturesYouControl'&&o.types.includes('creature')&&!o.token&&o.controller===e.controller;
 if(e.kind==='setNonbasicLandSubtype')return o.types.includes('land')&&!o.supertypes.includes('basic');return true}
function apply(e,objects){return objects.map(original=>{const o=clone(original);if(!applies(e,o))return o;
 if(e.kind==='addType'&&!o.types.includes(e.value))o.types.push(e.value);
 if(e.kind==='removeType')o.types=o.types.filter(t=>t!==e.value);
 if(e.kind==='addLandSubtype'){if(!o.types.includes('land'))o.types.push('land');if(!o.subtypes.includes(e.subtype))o.subtypes.push(e.subtype)}
 if(e.kind==='setNonbasicLandSubtype'){o.subtypes=o.subtypes.filter(t=>!basic.includes(t));o.subtypes.push(e.subtype);o.abilities=o.abilities.filter(a=>a.origin!=='rulesText'&&a.origin!=='basicLandType');o.abilities.push({id:'intrinsic-mana-'+e.subtype,origin:'basicLandType',kind:'tapForMana',color:mana[e.subtype]})}
 return o})}
function evaluate(objects,effects){if(!Array.isArray(objects)||!Array.isArray(effects)||objects.some(o=>!o||!o.id||!Array.isArray(o.types)||!Array.isArray(o.abilities)))return {supported:false,reason:'Oggetti layer 4 incompleti'};
 if(effects.some(e=>!e||!kinds.has(e.kind)||!Number.isSafeInteger(e.timestamp)||e.layer!=='4'))return {supported:false,reason:'Effetto layer 4 sconosciuto'};
 if(effects.some(e=>['addLandSubtype','setNonbasicLandSubtype'].includes(e.kind)&&!basic.includes(e.subtype)))return {supported:false,reason:'Sottotipo terra non supportato'};
 if(effects.some(e=>e.kind==='addLandSubtype'&&e.scope!=='nontokenCreaturesYouControl'))return {supported:false,reason:'Ambito terra non supportato'};
 if(effects.some(e=>!e.targetId))return {supported:false,reason:'Ambito effetto non specificato'};
 const tagged=effects.map((e,i)=>({...e,_id:e.id||'effect-'+i,_index:i}));if(new Set(tagged.map(e=>e._id)).size!==tagged.length)return {supported:false,reason:'ID effetti duplicati'};
 let state=objects.map(clone),pending=tagged,order=[];
 while(pending.length){const deps=new Map();for(const e of pending){const dependencies=[];
 for(const other of pending){if(e===other)continue;
 if((e.dependency||[]).includes(other._id)){dependencies.push(other._id);continue}
 // Recognize only the provable type-to-land applicability dependency.
 if(e.kind==='setNonbasicLandSubtype'&&other.kind==='addLandSubtype'&&state.some((o,i)=>!applies(e,o)&&applies(e,apply(other,state)[i])))dependencies.push(other._id);
 if(e.kind==='setNonbasicLandSubtype'&&other.kind==='addType'&&other.value==='land'&&state.some((o,i)=>!applies(e,o)&&applies(e,apply(other,state)[i])))dependencies.push(other._id);
 // General layer-4 applicability changes: adding/removing creature or land type can change the set of affected objects.
 if((e.kind==='addLandSubtype'||e.kind==='setNonbasicLandSubtype')&&(other.kind==='addType'||other.kind==='removeType')&&state.some((o,i)=>applies(e,o)!==applies(e,apply(other,state)[i]))&&!dependencies.includes(other._id))dependencies.push(other._id);
 }
 deps.set(e._id,dependencies)}
 if(pending.some(e=>(e.dependency||[]).some(id=>!tagged.some(x=>x._id===id))))return {supported:false,reason:'Dipendenza sconosciuta'};
 let ready=pending.filter(e=>deps.get(e._id).every(id=>!pending.some(x=>x._id===id)));
 if(!ready.length)return {supported:false,reason:'Dipendenza circolare: rilevamento completo non disponibile'};
 ready.sort((a,b)=>a.timestamp-b.timestamp||a._index-b._index);const e=ready[0];state=apply(e,state);order.push({kind:e.kind,layer:'4',timestamp:e.timestamp,id:e._id});pending=pending.filter(x=>x!==e)
 }
 return {supported:true,objects:state,order,coverage:'restricted-layer4'};
}
root.JudgeUnifiedLayer4={evaluate};
})(typeof window!=='undefined'?window:globalThis);
