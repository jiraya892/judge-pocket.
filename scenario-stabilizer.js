/* Complete evaluation for an explicitly bounded snapshot of static land-type
   effects and land-count P/T definitions. No card identities or pair rulings.
   This path uses supported layer/PT/SBA primitives, never promotes a partial
   JudgeUnifiedContinuous or legacy coordinator result to verified. */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
function evaluate(input){
 const unsupported=reason=>({supported:false,status:'unsupported',reason});
 if(input?.scope!=='clean-static-snapshot')return unsupported('Serve un contesto statico esplicito senza altri effetti, segnalini o danni.');
 if(!root.JudgeUnifiedLayer4||!root.JudgePTLayers||!root.JudgeLocalSBA)return unsupported('Moduli layer, P/T o SBA mancanti.');
 if(!Array.isArray(input.objects)||!input.objects.length||input.objects.length>8||!Array.isArray(input.effects))return unsupported('Scenario statico non valido.');
 if(input.effects.length>32)return unsupported('Troppi effetti per il perimetro statico.');
 const original=copy(input.objects),effects=copy(input.effects),ids=new Set(original.map(o=>o.id));
 if(ids.size!==original.length)return unsupported('Identità oggetti non univoche.');
 for(const o of original){
  if(o.zone!=='battlefield'||!['A','B'].includes(o.controller)||!['A','B'].includes(o.owner)||!Array.isArray(o.types)||!o.types.length||o.types.some(t=>!['creature','enchantment','artifact','land'].includes(t)))return unsupported('Tipo di permanente o zona fuori dal perimetro verificato.');
  if(!Array.isArray(o.subtypes)||o.subtypes.some(t=>['Aura','Equipment','Fortification','Role'].includes(t))||!Array.isArray(o.supertypes)||o.supertypes.includes('world'))return unsupported('Assegnazioni o supertipi fuori dal perimetro verificato.');
  if(Object.keys(o).some(k=>k.startsWith('pending'))||o.token||o.isToken||o.faceDown||o.isCommander||o.damage!==0||!o.counters||Object.values(o.counters).some(v=>v!==0)||o.oracleUnknown?.length)return unsupported('Effetti, danni, segnalini o proprietà non verificati.');
  if(!Array.isArray(o.abilities)||o.abilities.some(a=>!a||a.origin!=='rulesText'||typeof a.id!=='string'))return unsupported('Abilità fuori dal perimetro riconosciuto.');
  if(o.ptDefinition&&(o.ptDefinition.kind!=='landCount'||o.printedPower!=='*'||o.printedToughness!=='*'))return unsupported('Definizione P/T non verificata.');
  if(o.types.includes('creature')&&!o.ptDefinition&&(!Number.isSafeInteger(o.power)||!Number.isSafeInteger(o.toughness)))return unsupported('P/T stampata non determinata.');
 }
 for(const e of effects){
  const source=original.find(o=>o.id===e.sourceId);
  if(e.oracleGenerated!==true||e.lifetime&&e.lifetime.mode!=='static'||e.layer!=='4'||!['addLandSubtype','setNonbasicLandSubtype'].includes(e.kind)||e.targetId!=='all'||!source||source.types.includes('land')||!source.abilities.some(a=>a.id===e.sourceAbilityId)||!Number.isSafeInteger(e.timestamp))return unsupported('Effetto continuo fuori dal perimetro statico verificato.');
 }
 // Every printed ability must have a recognized semantic implementation.
 for(const o of original)for(const a of o.abilities)if(a.id!==o.ptDefinition?.abilityId&&!effects.some(e=>e.sourceId===o.id&&e.sourceAbilityId===a.id))return unsupported('Abilità riconosciuta senza implementazione completa.');
 const removed=new Map(),events=[],steps=[],rules=new Set();
 let finalObjects=null;
 // At least one permanent must leave on a nonterminal iteration. Thus N+1
 // evaluations suffice; the bound is independent of incoming timestamps.
 for(let iteration=0;iteration<=original.length;iteration++){
  const board=original.filter(o=>!removed.has(o.id));
  const active=effects.filter(e=>board.some(o=>o.id===e.sourceId));
  const layer=root.JudgeUnifiedLayer4.evaluate(board,active);
  if(!layer.supported)return unsupported(layer.reason);
  if(active.some(e=>e.kind==='addLandSubtype'))rules.add('613.1d');
  if(active.some(e=>e.kind==='setNonbasicLandSubtype')&&layer.objects.some(o=>o.abilities.some(a=>a.origin==='basicLandType')))rules.add('305.7');
  if(active.some(e=>e.kind==='addLandSubtype')&&active.some(e=>e.kind==='setNonbasicLandSubtype'))rules.add('613.8');
  const effective=[];
  for(const afterTypes of layer.objects){
   let o=afterTypes;
   if(o.ptDefinition&&!o.abilities.some(a=>a.id===o.ptDefinition.abilityId)){rules.add('208.5');o={...o,ptDefinition:null,power:0,toughness:0};} // printed */* was checked above: CR 208.5
   const pt=root.JudgePTLayers.evaluate(o,layer.objects,[]);
   if(!pt.supported)return unsupported(pt.reason);
   effective.push({...o,power:pt.power,toughness:pt.toughness});
  }
  const batch=root.JudgeLocalSBA.stabilizeBatch({objects:effective,players:[{id:'A',life:20},{id:'B',life:20}],effects:[]});
  if(!batch.supported)return unsupported(batch.reason);
  if(batch.changes.some(c=>c.type!=='creatureLeaves'||c.reason!=='toughness'))return unsupported('SBA fuori dal perimetro verificato.');
  steps.push({order:layer.order,objects:copy(effective)});
  if(!batch.changes.length){finalObjects=effective;break;}
  if(batch.changes.length)rules.add('704.5f');
  for(const change of batch.changes){
   const before=effective.find(o=>o.id===change.id),after=batch.state.objects.find(o=>o.id===change.id);
   if(!before||!after||after.zone!=='graveyard'||removed.has(change.id))return unsupported('Transizione SBA non verificata.');
   removed.set(change.id,{...before,zone:'graveyard',objectIdentity:after.objectIdentity});
   events.push({type:'creatureLeaves',id:change.id,name:before.name,from:'battlefield',to:'graveyard',reason:'toughness',power:before.power,toughness:before.toughness});
  }
 }
 if(!finalObjects)return unsupported('Limite di stabilizzazione raggiunto.');
 // A graveyard record describes the observed departure, not its characteristics
 // in a new zone (CDA and ownership in other zones need a different evaluator).
 const results=original.map(originalObject=>{
  const left=removed.get(originalObject.id),o=left||finalObjects.find(x=>x.id===originalObject.id);
  return left?{id:o.id,name:o.name,status:'verified',zone:'graveyard',departure:{power:o.power,toughness:o.toughness}}:{id:o.id,name:o.name,status:'verified',zone:'battlefield',types:[...o.types].sort(),subtypes:[...o.subtypes].sort(),power:o.power,toughness:o.toughness,abilities:o.abilities.map(a=>({origin:a.origin,kind:a.kind||'static',text:a.text||null,color:a.color||null})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};
 });
 return {supported:true,status:'verified',scope:'clean-static-snapshot',results,events,steps,warnings:[],rules:[...rules].sort(),coverage:'static-land-types-and-land-count-with-local-sba'};
}
root.JudgeScenarioStabilizer={evaluate};
})(typeof window!=='undefined'?window:globalThis);
