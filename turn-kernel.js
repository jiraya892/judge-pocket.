/* Experimental turn timing kernel; no automatic spell resolution. */
(function(root){
'use strict';
const sequence=[
 ['beginning','untap'],['beginning','upkeep'],['beginning','draw'],
 ['precombat_main','main'],['combat','beginning_of_combat'],
 ['combat','declare_attackers'],['combat','declare_blockers'],
 ['combat','combat_damage'],['combat','end_of_combat'],
 ['postcombat_main','main'],['ending','end'],['ending','cleanup']
];
function makeTurn(activePlayer='A',players=['A','B']){
 if(!players.includes(activePlayer)||new Set(players).size!==players.length||players.length<2)throw Error('Giocatori non validi');
 return {players:[...players],activePlayer,turnNumber:1,index:0,phase:'beginning',step:'untap',priorityPlayer:null,stack:[],passes:0,resolutionPending:false};
}
function canReceivePriority(s){
 return s.step!=='untap'&&s.step!=='cleanup';
}
function grantPriority(s){
 if(!canReceivePriority(s))return {granted:false,reason:'Questo passo normalmente non concede priorità'};
 if(s.priorityPlayer!==null||s.resolutionPending)throw Error('Priorità già assegnata o risoluzione in attesa');
 s.priorityPlayer=s.activePlayer;s.passes=0;return {granted:true,player:s.priorityPlayer};
}
function canCastSorcery(s,player){
 return s.activePlayer===player&&(s.phase==='precombat_main'||s.phase==='postcombat_main')&&s.priorityPlayer===player&&s.stack.length===0;
}
function advanceStep(s){
 if(s.stack.length||s.resolutionPending)throw Error('Pila non vuota o risoluzione in attesa');
 if(s.priorityPlayer!==null)throw Error('Prima completare i passaggi di priorità');
 s.index=(s.index+1)%sequence.length;
 if(s.index===0){const i=s.players.indexOf(s.activePlayer);s.activePlayer=s.players[(i+1)%s.players.length];s.turnNumber++;}
 [s.phase,s.step]=sequence[s.index];s.passes=0;return {phase:s.phase,step:s.step,activePlayer:s.activePlayer};
}
function passPriority(s,player){
 if(!canReceivePriority(s)||s.priorityPlayer!==player)throw Error('Priorità non disponibile');
 const i=s.players.indexOf(player);s.passes++;
 if(s.passes<s.players.length){s.priorityPlayer=s.players[(i+1)%s.players.length];return {type:'pass',next:s.priorityPlayer};}
 s.priorityPlayer=null;s.passes=0;s.resolutionPending=s.stack.length>0;
 return s.resolutionPending?{type:'stackResolutionRequired'}:{type:'stepReady'};
}
function resolveTopManually(s){
 if(s.priorityPlayer!==null||!s.stack.length||!s.resolutionPending)throw Error('Risoluzione non disponibile');
 const item=s.stack.pop();s.resolutionPending=false;
 // This kernel does not execute Oracle text: caller must apply the effect separately.
 // After resolution, state-based actions and pending triggers must be handled by the caller.
 return {type:'manualResolution',item,requiresStateBasedActions:true,requiresTriggerProcessing:true};
}
function resumeAfterResolution(s){
 if(s.priorityPlayer!==null||s.resolutionPending)throw Error('Priorità già assegnata o risoluzione in attesa');
 if(!canReceivePriority(s))throw Error('Priorità non disponibile');
 return grantPriority(s);
}
root.JudgeTurnKernel={sequence,makeTurn,canReceivePriority,grantPriority,canCastSorcery,advanceStep,passPriority,resolveTopManually,resumeAfterResolution};
})(typeof window!=='undefined'?window:globalThis);
