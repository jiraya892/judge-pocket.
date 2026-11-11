(function(){
'use strict';
const output=document.getElementById('testResults');
let passed=0,failed=0;
const k=window.JudgeRulesCore;
const textDouble='If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.';
const textCounters='If an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.';
const textScales='If one or more +1/+1 counters would be put on a creature you control, that many plus one +1/+1 counters are put on it instead.';
function assert(condition,message){if(!condition)throw Error(message)}
function test(name,fn){
 const line=document.createElement('p');
 try{fn();passed++;line.textContent='✓ '+name;line.className='ok'}
 catch(e){failed++;line.textContent='✕ '+name+' — '+e.message;line.className='fail'}
 output.append(line);
}
function add(s,name,oracle_text,props={}){return k.addObject(s,{name,oracle_text,owner:'A',controller:'A',...props})}
test('Raddoppio pedine: due effetti producono quattro volte le pedine',()=>{
 const s=k.createGame();add(s,'Double1',textDouble);add(s,'Double2',textDouble);
 assert(k.previewEvent(s,{type:'createTokens',player:'A',amount:1}).amounts.join(',')==='4','Risultato non pari a 4')
});
test('Raddoppio pedine: controllore dell’evento considerato',()=>{
 const s=k.createGame();add(s,'Double1',textDouble);
 assert(k.previewEvent(s,{type:'createTokens',player:'B',amount:1}).amounts[0]===1,'Modificato evento dell’avversario')
});
test('Doppio + incremento: ordini alternativi 3 e 4',()=>{
 const s=k.createGame();add(s,'Double',textCounters);add(s,'Plus',textScales);
 const c=add(s,'Bear','',{types:['creature'],toughness:2});
 const evt={type:'putCounters',target:c.id,amount:1,counterType:'+1/+1',fromEffect:true};
 assert(k.previewEvent(s,evt).amounts.join(',')==='3,4','Risultati diversi da 3 e 4');
 assert(k.applyEvent(s,evt).requiresChoice,'Scelta ordine non richiesta')
});
test('La causa conta: un costo non applica Doubling Season',()=>{
 const s=k.createGame();add(s,'Double',textCounters);
 const c=add(s,'Bear','',{types:['creature'],toughness:2});
 assert(k.previewEvent(s,{type:'putCounters',target:c.id,amount:1,counterType:'+1/+1',fromEffect:false}).amounts[0]===1,'Raddoppio non consentito')
});
test('Le zone cambiano l’identità di un oggetto',()=>{
 const s=k.createGame(),o=add(s,'Bear','',{types:['creature']});
 const moved=k.moveZone(s,o.id,'graveyard');
 assert(moved.after.id!==o.id&&moved.after.zone==='graveyard','Identità immutata')
});
test('Una pedina che lascia il campo cessa di esistere',()=>{
 const s=k.createGame(),o=add(s,'Soldier','',{types:['creature'],token:true});
 assert(k.moveZone(s,o.id,'graveyard').after===null,'Pedina erroneamente conservata')
});
test('Danno letale: azione basata sullo stato',()=>{
 const s=k.createGame(),o=add(s,'Bear','',{types:['creature'],toughness:2});
 k.applyEvent(s,{type:'dealDamage',target:o.id,amount:2});
 assert(k.stateBasedActions(s).some(a=>a.type==='creatureLeaves'),'Nessuna azione basata sullo stato')
});
test('Indistruttibile non salva da costituzione zero',()=>{
 const s=k.createGame();add(s,'Creature','',{types:['creature'],toughness:0,indestructible:true});
 assert(k.stateBasedActions(s).some(a=>a.type==='creatureLeaves'),'Creatura non rimossa')
});
test('Indistruttibile impedisce la distruzione da danno letale',()=>{
 const s=k.createGame(),o=add(s,'Creature','',{types:['creature'],toughness:2,indestructible:true});
 k.applyEvent(s,{type:'dealDamage',target:o.id,amount:5});
 assert(!k.stateBasedActions(s).some(a=>a.type==='creatureLeaves'),'Creatura indistruttibile rimossa')
});
test('Segnalini +1/+1 e -1/-1 si annullano',()=>{
 const s=k.createGame(),o=add(s,'Creature','',{types:['creature'],toughness:2,counters:{'+1/+1':2,'-1/-1':1}});
 k.stateBasedActions(s);
 assert(o.counters['+1/+1']===1&&o.counters['-1/-1']===0,'Segnalini errati')
});
test('Regola delle leggende: non scegliere senza l’utente',()=>{
 const s=k.createGame(),a=add(s,'Legend','',{types:['creature'],legendary:true}),b=add(s,'Legend','',{types:['creature'],legendary:true});
 assert(k.legendConflicts(s).length===1,'Conflitto non rilevato');
 assert(k.resolveLegendChoice(s,a.id).applied,'Scelta rifiutata');
 assert(k.legendConflicts(s).length===0,'Conflitto non risolto')
});
test('Abilità di entrata moderna e pila',()=>{
 const s=k.createGame(),c=add(s,'Visionary','When Visionary enters, draw a card.',{types:['creature'],zone:'hand'});
 const evt=k.applyEvent(s,{type:'enterBattlefield',target:c.id,controller:'A'});
 assert(evt.triggers.length===1,'Innesco non rilevato');
 assert(k.putTriggersOnStack(s).applied&&s.stack.length===1,'Innesco non collocato sulla pila')
});
test('Ordine APNAP: il non-attivo è in cima',()=>{
 const s=k.createGame();
 s.pending=[{id:'A1',controller:'A'},{id:'B1',controller:'B'}];
 assert(k.putTriggersOnStack(s).applied&&s.stack.at(-1).controller==='B','Ordine errato')
});
test('La priorità passa prima che la pila si risolva',()=>{
 const s=k.createGame();k.pushStack(s,{controller:'A',description:'test'});
 assert(k.passPriority(s,'A').type==='pass','La pila si è risolta troppo presto');
 assert(k.passPriority(s,'B').type==='resolveManually','La pila non viene proposta per la risoluzione')
});
test('Un bersaglio cambia identità dopo cambio zona',()=>{
 const s=k.createGame(),c=add(s,'Bear','',{types:['creature']});
 const ref={id:c.id,zone:'battlefield'};
 assert(k.targetStillLegal(s,ref),'Bersaglio iniziale sconosciuto');
 k.moveZone(s,c.id,'graveyard');
 assert(!k.targetStillLegal(s,ref),'Bersaglio vecchio ancora valido')
});
const summary=document.getElementById('testSummary');
summary.textContent=passed+' test superati, '+failed+' falliti.';
summary.className=failed?'fail':'ok';
})();
