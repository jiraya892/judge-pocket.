/* CR 500–514: complete ordinary-turn window schema and explicit phase parser.
   This coordinates windows/actions; it does not claim to implement each effect
   occurring in a window. Missing turn-action adapters stop advancement. */
(function(root){'use strict';
const windows=[
 ['untap','beginning','Stap',false,'502.1',['phasing','dayNightCheck','untap']],
 ['upkeep','beginning','Mantenimento',true,'503.1',[]],
 ['draw','beginning','Pesca',true,'504.1',['drawCard']],
 ['main1','precombatMain','Prima fase principale',true,'505.1',[]],
 ['beginCombat','combat','Inizio del combattimento',true,'507.1',['chooseDefendingPlayerIfRequired']],
 ['declareAttackers','combat','Dichiarazione degli attaccanti',true,'508.1',['declareAttackers']],
 ['declareBlockers','combat','Dichiarazione dei bloccanti',true,'509.1',['declareBlockers']],
 ['firstStrikeDamage','combat','Primo danno da combattimento',true,'510.4',['assignCombatDamage','dealCombatDamage']],
 ['combatDamage','combat','Danno da combattimento',true,'510.1',['assignCombatDamage','dealCombatDamage']],
 ['endCombat','combat','Fine del combattimento',true,'511.1',[]],
 ['main2','postcombatMain','Seconda fase principale',true,'505.1',[]],
 ['endStep','ending','Sottofase finale',true,'513.1',[]],
 ['cleanup','ending','Cancellazione',false,'514.1',['discardToMaximumHandSize','removeDamageAndExpireEffects']]
].map(([id,phase,label,priority,rule,actions])=>Object.freeze({id,step:['main1','main2'].includes(id)?null:id,phase,label,priority,rule,actions:Object.freeze(actions)}));
const byStep=new Map(windows.map(w=>[w.id,w]));
const phrases=new Map([
 ['untap','untap'],['stap','untap'],['sottofase di stap','untap'],['mantenimento','upkeep'],['upkeep','upkeep'],['up keep','upkeep'],
 ['pesca','draw'],['sottofase di pesca','draw'],['draw step','draw'],['prima fase principale','main1'],['fase principale precombattimento','main1'],['precombat main phase','main1'],
 ['inizio del combattimento','beginCombat'],['beginning of combat','beginCombat'],['dichiarazione degli attaccanti','declareAttackers'],['declare attackers','declareAttackers'],
 ['dichiarazione dei bloccanti','declareBlockers'],['declare blockers','declareBlockers'],['prima sottofase di danno da combattimento','firstStrikeDamage'],['first strike damage step','firstStrikeDamage'],
 ['assegnazione dei danni da combattimento','combatDamage'],['danno da combattimento','combatDamage'],['combat damage step','combatDamage'],['fine del combattimento','endCombat'],['end of combat','endCombat'],
 ['seconda fase principale','main2'],['fase principale postcombattimento','main2'],['postcombat main phase','main2'],['sottofase finale','endStep'],['end step','endStep'],['cancellazione','cleanup'],['cleanup','cleanup'],['cleanup step','cleanup']
]);
const normalize=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function interpret(text){
 const key=normalize(text);if(key==='fase principale'||key==='main phase'||key==='main')return {supported:true,phase:'main',step:null,label:'Fase principale (prima o seconda non specificata)'};
 if(key==='combattimento'||key==='combat phase'||key==='combat')return {supported:true,phase:'combat',step:null,label:'Combattimento (sottofase non specificata)'};
 const w=byStep.get(phrases.get(key));return w?{supported:true,...w}:{supported:false,reason:'Fase o sottofase non identificata.'};
}
function next(step,options={}){
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['hasAttackers','needsFirstStrike','repeatCleanup','skipDrawStep'].includes(k)))return {supported:false,reason:'Modifiche al turno non supportate.'};
 const {hasAttackers,needsFirstStrike,repeatCleanup,skipDrawStep}=options;
 if(!byStep.has(step))return {supported:false,reason:'Sottofase sconosciuta'};
 if(step==='upkeep')return typeof skipDrawStep!=='boolean'?{supported:false,requiredFact:'skipDrawStep'}:{supported:true,window:byStep.get(skipDrawStep?'main1':'draw')};
 if(step==='declareAttackers'&&typeof hasAttackers!=='boolean')return {supported:false,requiredFact:'hasAttackers'};
 if(step==='declareAttackers'&&!hasAttackers)return {supported:true,window:byStep.get('endCombat')};
 if(step==='declareBlockers'&&typeof needsFirstStrike!=='boolean')return {supported:false,requiredFact:'needsFirstStrike'};
 if(step==='declareBlockers')return {supported:true,window:byStep.get(needsFirstStrike?'firstStrikeDamage':'combatDamage')};
 if(step==='cleanup')return typeof repeatCleanup!=='boolean'?{supported:false,requiredFact:'repeatCleanup'}:{supported:true,window:byStep.get(repeatCleanup?'cleanup':'untap'),newTurn:!repeatCleanup};
 return {supported:true,window:windows[windows.findIndex(w=>w.id===step)+1]};
}
async function enter(state,step,actionAdapter){
 const w=byStep.get(step);if(!w)return {supported:false,status:'unsupported',reason:'Sottofase sconosciuta.'};
 if(!Array.isArray(state?.players)||!Array.isArray(state?.objects)||!Array.isArray(state?.stack)||!state.players.some(p=>p.id===state.turn?.activePlayer)||state.stack.length)return {supported:false,status:'unsupported',reason:'Stato iniziale o pila non pronti per una nuova sottofase.'};
 let current=JSON.parse(JSON.stringify(state));current.turn={...(current.turn||{}),phase:w.phase,step:w.step,window:w.id};current.priority=null;current.passes=0;
 const actions=step==='untap'?['observeWindowStart',...w.actions]:step==='cleanup'?['observeWindowStart',...w.actions,'checkCleanupPriority']:['observeWindowStart',...w.actions,'stabilizeAndCollectTriggers'];
 for(const type of actions){if(typeof actionAdapter!=='function')return {supported:false,status:'unsupported',reason:'Azione di turno non ancora collegata: '+type,requiredAction:type};const result=await actionAdapter(current,{type,player:current.turn.activePlayer});if(!result?.supported||result.status!=='verified'||!result.state)return {supported:false,status:'unsupported',reason:'Azione di turno non completamente verificata: '+type};current=result.state;}
 const priorityWindow=w.priority||step==='cleanup'&&(!!current.pendingTriggers?.length||current.cleanupNeedsPriority===true);
 if(priorityWindow&&!current.pendingTriggers?.length)current.priority=current.turn.activePlayer;
 return {supported:true,status:'verified',state:current,window:w,priorityWindow,requiresTriggerPlacement:priorityWindow&&!!current.pendingTriggers?.length};
}
async function leave(state,nextWindow,adapter){
 const current=byStep.get(state?.turn?.window||state?.turn?.step),destination=byStep.get(nextWindow);
 if(!current||!destination||!Array.isArray(state.stack)||state.stack.length||state.pendingTriggers?.length)return {supported:false,status:'unsupported',reason:'Pila, inneschi o finestra del turno non pronti.'};
 let result=JSON.parse(JSON.stringify(state));const actions=[...(current.step?['endStepEffectsAndMana']:[]),...(current.id==='endCombat'?['removeFromCombat']:[]),...(current.phase!==destination.phase?['endPhaseEffectsAndMana']:[])];
 for(const type of actions){if(typeof adapter!=='function')return {supported:false,status:'unsupported',requiredAction:type};const applied=await adapter(result,{type,from:current.id,to:destination.id});if(!applied?.supported||applied.status!=='verified'||!applied.state)return {supported:false,status:'unsupported',reason:'Chiusura della finestra non verificata.'};result=applied.state;}
 return {supported:true,status:'verified',state:result};
}
root.JudgeTurnStructure={windows:Object.freeze(windows),interpret,next,enter,leave};
})(typeof window!=='undefined'?window:globalThis);
