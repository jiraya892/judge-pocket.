/* Complete, deliberately small Oracle grammar for damage-receiving creatures.
   Unrecognized text rejects the whole card; keywords are not guessed from names. */
(function(root){'use strict';
function prepare(card,index){
 const object=root.JudgeGuidedBridge.cardObject(card,index);
 const fail=reason=>({supported:false,reason});
 if(card.card_faces?.length||!object.types.includes('creature')||!Number.isSafeInteger(object.power)||!Number.isSafeInteger(object.toughness)||object.toughness<=0)return fail('Creatura o definizione P/T fuori dal perimetro.');
 const text=String(card.oracle_text||'').replace(/\([^()]*\)/g,'').trim(),traits=[];
 for(const line of text.split('\n').map(s=>s.trim()).filter(Boolean)){
  const names=[card.name,card.name?.split(',')[0]].filter(Boolean);
  if(names.some(name=>line==='Prevent all damage that would be dealt to '+name+'.')){object.preventsDamage=true;traits.push('preventDamage');continue;}
  const keywords=line.split(/,\s*/).map(s=>s.toLowerCase());
  if(keywords.some(k=>!['indestructible','flying','reach','vigilance','trample','haste','defender','menace','deathtouch','lifelink'].includes(k)))return fail('Abilità non riconosciuta completamente: '+line);
  if(keywords.includes('indestructible'))object.indestructible=true;
  traits.push(...keywords);
 }
 // These abilities have been interpreted for this noncombat damage path. No
 // printed trigger, replacement condition, protection or targeting restriction
 // is discarded as though it were absent.
 object.oracle_text='';object.recognizedCreatureTraits=traits;object.objectIdentity=object.id+'-battlefield';
 return {supported:true,object};
}
root.JudgeCreatureTraits={prepare};
})(typeof window!=='undefined'?window:globalThis);
