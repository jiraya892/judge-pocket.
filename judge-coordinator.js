/* 2A: one authoritative continuous-effect evaluation path.
   Legacy engines are implementation details of JudgeUnifiedContinuous, never alternate rulings. */
(function(root){'use strict';
const kinds=new Set(['addType','removeType','setColor','addColor','removeColor','addAbility','removeAbility','removeAllAbilities','setPT','definePT','modifyPT','switchPT','setController','replaceText','copyCharacteristics','addLandSubtype','setNonbasicLandSubtype']);
function evaluate(input){
 if(!input||!Array.isArray(input.objects)||!Array.isArray(input.effects)||!Array.isArray(input.players))return {supported:false,reason:'Formato stato non valido'};
 if(!root.JudgeRulesCore||!root.JudgeUnifiedContinuous)return {supported:false,reason:'Motore unificato o stato partita mancante'};
 const game=root.JudgeRulesCore.createGame(['A','B']);
 for(const p of input.players){const dest=game.players.find(x=>x.id===p.id);if(!dest||!Number.isInteger(p.life))return {supported:false,reason:'Giocatore non valido'};dest.life=p.life}
 game.activePlayer=input.turn?.activePlayer||'A';game.priorityPlayer=input.turn?.priorityPlayer||'A';
 const source=input.objects.filter(o=>o.zone==='battlefield'),warnings=[],results=[];
 const ids=new Set();for(const o of input.objects){
  if(!o.id||ids.has(o.id)||!o.name||!['A','B'].includes(o.owner)||!['A','B'].includes(o.controller)||!Array.isArray(o.types))return {supported:false,reason:'Oggetto invalido o ID duplicato'};
  ids.add(o.id);const added=root.JudgeRulesCore.addObject(game,o);added.damage=o.damage||0;added.tapped=!!o.tapped;
 }
 const active=input.effects.filter(e=>!e.oracleGenerated||source.some(o=>o.id===e.sourceId));
 const model=root.JudgeEffectModel?.build(source,active);
 const modelProblem=model?.supported?null:(model?.reason||'Modello effetti non disponibile');
 const unknownEffects=active.filter(e=>!kinds.has(e.kind));
 const unknownOracle=source.filter(o=>(o.oracleUnknown||[]).length);
 // An unrecognized global effect may influence every object: never use a fallback engine.
 const invalidScope=active.filter(e=>!e.targetId||(e.targetId!=='all'&&!source.some(o=>o.id===e.targetId)));
 const invalidSources=active.filter(e=>e.oracleGenerated&&(!e.sourceId||!source.some(o=>o.id===e.sourceId)));
 const problems=[...(modelProblem?[modelProblem]:[]),...unknownEffects.map(e=>'Operazione sconosciuta: '+(e.kind||e.text||'?')),...invalidScope.map(e=>'Ambito non valido: '+(e.kind||'?')),...invalidSources.map(e=>'Fonte non valida: '+(e.kind||'?')),...unknownOracle.map(o=>'Oracle incompleto: '+o.name)];
 let shared=null;
 if(!problems.length){shared=root.JudgeUnifiedContinuous.evaluate(source.map(o=>({...o,abilities:o.abilities||[],subtypes:o.subtypes||[],supertypes:o.supertypes||[]})),active);if(!shared.supported)problems.push(shared.reason||'Effetti non supportati')}
 if(problems.length)warnings.push(...problems);
 for(const o of input.objects){
  if(o.zone!=='battlefield'){results.push({id:o.id,name:o.name,status:'not-evaluated'});continue}
  if(problems.length){results.push({id:o.id,name:o.name,status:'unsupported',reason:problems.join(' | ')});continue}
  const s=shared.objects[source.indexOf(o)],power=s.power??null,toughness=s.toughness??null,types=s.types;
  results.push({id:o.id,name:o.name,status:'partial',types,subtypes:s.subtypes||[],controller:s.controller,power,toughness,damage:o.damage||0,order:shared.order,coverage:shared.coverage,possibleZeroToughness:types.includes('creature')&&toughness!==null&&toughness<=0,possibleLethalDamage:types.includes('creature')&&toughness!==null&&toughness>0&&(o.damage||0)>=toughness})
 }
 warnings.push('Risultati parziali: SBA non eseguite, copertura Oracle e dipendenze CR 613 non complete.');
 return {supported:true,game,results,warnings,modules:{gameState:true,unifiedContinuous:true,genericLayers:true,landLayers:true,oracleRecognition:!!root.JudgeOracleRecognition,stateBasedActions:'advisory-only'}};
}
root.JudgeCoordinator={evaluate};
})(typeof window!=='undefined'?window:globalThis);