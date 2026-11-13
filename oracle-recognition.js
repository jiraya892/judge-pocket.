/* Oracle recognition: exact Scryfall lookup, conservative structured patterns. */
(function(root){'use strict';
function recognize(card,object){
 const text=[card.oracle_text,...(card.card_faces||[]).map(f=>f.oracle_text)].filter(Boolean).join('\n');
 const effects=[],unknown=[];
 const generated=(effect,line)=>{const id='oracle-static-'+object.id+'-'+effects.length;object.abilities=object.abilities||[];object.abilities.push({id,origin:'rulesText',kind:'static',text:line});effects.push({...effect,sourceId:object.id,sourceAbilityId:id});};
 // Reminder text has no rules function (CR 207.2a). Keep the original text for diagnostics.
 const rulesText=text.replace(/\([^()]*\)/g,'');
 for(const line of rulesText.split('\n').map(x=>x.trim()).filter(Boolean)){
  let m;
  if((m=/^([A-Za-z ]+) gets ([+-]\d+)\/([+-]\d+)\.$/.exec(line))){
   const phrase=m[1].toLowerCase();
   if(phrase==='this creature')effects.push({kind:'modifyPT',layer:'7c',targetId:object.id,power:Number(m[2]),toughness:Number(m[3])});
   else unknown.push(line);
  }else if(/^This creature has (flying|trample|vigilance|lifelink|deathtouch|haste|reach|menace|hexproof|indestructible)\.$/i.test(line)){
   unknown.push(line); // Static printed ability, not an effect that grants itself.
  }else if([card.name,card.name?.split(',')[0],...(card.card_faces||[]).map(f=>f.name)].filter(Boolean).some(name=>line===name+"'s power and toughness are each equal to the number of lands you control.")){
   const abilityId='oracle-pt-'+object.id;object.abilities=object.abilities||[];object.abilities.push({id:abilityId,origin:'rulesText',text:line});object.ptDefinition={kind:'landCount',abilityId};
  }else if(/^Nonbasic lands are Mountains\.$/i.test(line)){
   generated({kind:'setNonbasicLandSubtype',layer:'4',targetId:'all',subtype:'Mountain'},line);
  }else if(/^Nontoken creatures you control are Forest lands in addition to their other types\.$/i.test(line)){
   generated({kind:'addLandSubtype',layer:'4',targetId:'all',scope:'nontokenCreaturesYouControl',controller:object.controller,subtype:'Forest'},line);
  }else unknown.push(line);
 }
 return {effects,unknown,text};
}
async function fetchCard(name){
 if(typeof name!=='string'||!name.trim())throw Error('Nome carta mancante');
 if(root.JudgeCardRefresh){const refreshed=await root.JudgeCardRefresh.get(name);if(refreshed)return refreshed;}
 if(root.JudgeCardData){try{const local=await root.JudgeCardData.get(name);if(local)return local;}catch(e){/* Online transport remains an explicit fallback; no missing data is invented. */}}
 const controller=typeof AbortController==='function'?new AbortController():null;
 const timer=controller?setTimeout(()=>controller.abort(),12000):null;
 try{
  const response=await fetch('https://api.scryfall.com/cards/named?exact='+encodeURIComponent(name.trim()),{headers:{Accept:'application/json'},...(controller?{signal:controller.signal}:{})});
  if(!response.ok)throw Error(response.status===404?'Carta non trovata su Scryfall':'Scryfall non disponibile ('+response.status+')');
  const card=await response.json();if(!card.name||(typeof card.oracle_text!=='string'&&!card.card_faces))throw Error('Testo Oracle non disponibile');return card;
 }catch(error){if(error.name==='AbortError')throw Error('La ricerca online sta impiegando troppo tempo. Riprova o usa una carta già caricata.');throw error;}
 finally{if(timer)clearTimeout(timer);}
}
root.JudgeOracleRecognition={recognize,fetchCard};
})(typeof window!=='undefined'?window:globalThis);
