/* Oracle recognition: exact Scryfall lookup, conservative structured patterns. */
(function(root){'use strict';
function recognize(card,object){
 const text=[card.oracle_text,...(card.card_faces||[]).map(f=>f.oracle_text)].filter(Boolean).join('\n');
 const effects=[],unknown=[];
 for(const line of text.split('\n').map(x=>x.trim()).filter(Boolean)){
  let m;
  if((m=/^([A-Za-z ]+) gets ([+-]\d+)\/([+-]\d+)\.$/.exec(line))){
   const phrase=m[1].toLowerCase();
   if(phrase==='this creature')effects.push({kind:'modifyPT',layer:'7c',targetId:object.id,power:Number(m[2]),toughness:Number(m[3])});
   else unknown.push(line);
  }else if(/^This creature has (flying|trample|vigilance|lifelink|deathtouch|haste|reach|menace|hexproof|indestructible)\.$/i.test(line)){
   unknown.push(line); // Static printed ability, not an effect that grants itself.
  }else if(/^Nonbasic lands are Mountains\.$/i.test(line)){
   effects.push({kind:'setNonbasicLandSubtype',layer:'4',targetId:'all',subtype:'Mountain'});
  }else if(/^Nontoken creatures you control are Forest lands in addition to their other types\.$/i.test(line)){
   effects.push({kind:'addLandSubtype',layer:'4',targetId:'all',scope:'nontokenCreaturesYouControl',controller:object.controller,subtype:'Forest'});
  }else if(/\b(are|become|gets?|gain|lose|have|has|instead|would|when|whenever|if|until|as long as|equal to)\b/i.test(line))unknown.push(line);
 }
 return {effects,unknown,text};
}
async function fetchCard(name){
 if(typeof name!=='string'||!name.trim())throw Error('Nome carta mancante');
 const response=await fetch('https://api.scryfall.com/cards/named?exact='+encodeURIComponent(name.trim()),{headers:{Accept:'application/json'}});
 if(!response.ok)throw Error(response.status===404?'Carta non trovata su Scryfall':'Scryfall non disponibile ('+response.status+')');
 const card=await response.json();if(!card.name||(!card.oracle_text&&!card.card_faces))throw Error('Testo Oracle non disponibile');return card;
}
root.JudgeOracleRecognition={recognize,fetchCard};
})(typeof window!=='undefined'?window:globalThis);
