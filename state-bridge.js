/* Explicit state-editor adapter. Unsupported free text is never guessed. */
(function(root){'use strict';
const supported=new Set(['addType','removeType','setColor','addColor','removeColor','addAbility','removeAbility','removeAllAbilities','setPT','definePT','modifyPT','switchPT','setController','replaceText']);
function evaluate(input){
 if(!input||!Array.isArray(input.objects)||!Array.isArray(input.effects))return {supported:false,reason:'Stato non valido'};
 if(!root.JudgeLayers||!root.JudgeRulesCore)return {supported:false,reason:'Motori non caricati'};
 const game=root.JudgeRulesCore.createGame(['A','B']);
 for(const p of input.players||[]){const target=game.players.find(x=>x.id===p.id);if(target&&Number.isInteger(p.life))target.life=p.life;}
 game.activePlayer=input.turn?.activePlayer||'A';game.priorityPlayer=input.turn?.priorityPlayer||'A';
 const mapping=new Map(),results=[],warnings=[];
 for(const o of input.objects){
  if(!o.name||!['A','B'].includes(o.owner)||!['A','B'].includes(o.controller))return {supported:false,reason:'Proprietario o controllore non valido'};
  const created=root.JudgeRulesCore.addObject(game,{name:o.name,owner:o.owner,controller:o.controller,zone:o.zone,types:o.types,power:o.power,toughness:o.toughness,counters:o.counters,token:o.token});
  created.damage=o.damage||0;created.tapped=!!o.tapped;
  mapping.set(o.id,created);
 }
 for(const o of input.objects){
  if(o.zone!=='battlefield'){results.push({id:o.id,name:o.name,zone:o.zone,status:'not-evaluated'});continue;}
  const applicable=input.effects.filter(e=>e.targetId===o.id||e.targetId==='all');
  const invalid=applicable.filter(e=>!supported.has(e.kind));
  if(invalid.length){results.push({id:o.id,name:o.name,status:'unsupported',reason:'Effetti descritti in testo libero o operazioni non riconosciute: '+invalid.map(x=>x.text||x.kind||'sconosciuto').join('; ')});continue;}
  const effects=applicable.map(e=>({layer:e.layer,kind:e.kind,timestamp:e.timestamp,value:e.value,power:e.power,toughness:e.toughness,values:e.values,from:e.from,to:e.to}));
  const base={types:o.types,controller:o.controller,power:o.power,toughness:o.toughness,abilities:[],colors:[],text:''};
  const outcome=root.JudgeLayers.evaluate(base,effects);
  if(!outcome.supported){results.push({id:o.id,name:o.name,status:'unsupported',reason:outcome.reason});continue;}
  const counter=o.counters?.['+1/+1']||0;
  const power=outcome.state.power===null?null:outcome.state.power+counter;
  const toughness=outcome.state.toughness===null?null:outcome.state.toughness+counter;
  results.push({id:o.id,name:o.name,status:'partial',types:outcome.state.types,controller:outcome.state.controller,power,toughness,damage:o.damage||0,order:outcome.order,possibleZeroToughness:outcome.state.types.includes('creature')&&toughness!==null&&toughness<=0,possibleLethalDamage:outcome.state.types.includes('creature')&&toughness!==null&&toughness>0&&(o.damage||0)>=toughness});
 }
 if(input.effects.some(e=>!e.targetId))warnings.push('Effetti senza bersaglio/ambito strutturato non applicati: specifica il permanente interessato.');
 warnings.push('Le caratteristiche delle carte sono quelle inserite manualmente, non verificate con Oracle.');
 warnings.push('Non sono calcolati effetti automatici delle carte, dipendenze generali, prevenzione, indistruttibile, inneschi o azioni basate sullo stato complete.');
 return {supported:true,game,results,warnings};
}
root.JudgeStateBridge={evaluate};
})(typeof window!=='undefined'?window:globalThis);
