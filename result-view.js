/* Human-readable computed outcomes, kept separate from source authentication. */
(function(root){'use strict';
const rules={
 '613.1d':'Layer 4: effetti che modificano i tipi delle carte.',
 '613.8':'Dipendenze: un effetto può dover essere applicato prima di un altro, anche se è entrato dopo.',
 '305.7':'Impostare un tipo di terra base rimuove le abilità del testo della terra e le dà la corrispondente abilità di mana.',
 '208.5':'Una forza o costituzione indicata con * senza una definizione applicabile si considera 0.',
 '704.5f':'Una creatura con costituzione pari o inferiore a 0 viene messa nel cimitero.',
 '603.1':'Un’abilità innescata specifica un evento che la fa innescare e un effetto.',
 '603.2':'Un’abilità si innesca automaticamente quando si verifica il suo evento.',
 '603.3':'Gli inneschi vengono messi in pila prima che un giocatore riceva priorità.',
 '615.1':'La prevenzione modifica o impedisce il danno prima che venga inflitto.',
 '702.12b':'Indistruttibile impedisce la distruzione per danno letale, ma non la morte per costituzione non positiva.',
 '608.2b':'All’inizio della risoluzione si ricontrolla la legalità dei bersagli.',
 '608.2c':'Le istruzioni della magia si eseguono nell’ordine indicato.',
 '704.5g':'Una creatura con danno letale viene distrutta come azione basata sullo stato.'
};
function render(container,output){
 if(!container)return;container.replaceChildren();
 const outcome=output?.diagnostic?.computedOutcome||output?.outcome;
 if(!output?.diagnostic?.calculationVerified||!outcome)return;
 const add=(tag,text,parent=container)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el};
 add('h3','Passaggi calcolati');
 if(!(outcome.events||[]).length)add('p','Nel contesto dichiarato non si verificano cambi di zona.');
 for(const event of outcome.events||[])add('p',event.type==='creatureLeaves'?(event.reason==='lethalDamage'?event.name+' viene distrutta per danno letale.':event.name+' ha costituzione '+event.toughness+' e viene messa nel cimitero. Gli effetti delle fonti rimaste vengono ricalcolati.'):event.description||event.type);
 add('h3','Situazione finale');
 for(const result of outcome.results||[]){
  const section=add('article','');add('h3',result.name,section);
  if(result.zone==='graveyard'){add('p','Nel cimitero.',section);continue}
  const labels={creature:'Creatura',land:'Terra',artifact:'Artefatto',enchantment:'Incantesimo',instant:'Istantaneo',sorcery:'Stregoneria'};
  const text=[result.zone==='battlefield'?'Sul campo di battaglia':result.zone,(result.types||[]).map(t=>labels[t]||t).join(', '),(result.subtypes||[]).join(', ')];
  if(Number.isFinite(result.power)&&Number.isFinite(result.toughness))text.push(result.power+'/'+result.toughness);
  add('p',text.filter(Boolean).join(' · '),section);
  for(const ability of result.abilities||[])if(ability.kind==='tapForMana')add('p','Abilità di mana intrinseca: '+({W:'bianco',U:'blu',B:'nero',R:'rosso',G:'verde'}[ability.color]||ability.color)+'.',section);
 }
 const used=(outcome.rules||[]).filter(id=>Object.prototype.hasOwnProperty.call(rules,id));
 if(used.length){add('h3','Regole applicate nel calcolo');for(const id of used)add('p','CR '+id+' — '+rules[id]);
  const link=add('a','Consulta la pagina ufficiale delle Comprehensive Rules');link.href='https://magic.wizards.com/en/rules';link.target='_blank';link.rel='noopener noreferrer';
 }
 add('p','Questi riferimenti descrivono le regole implementate. Non attestano una firma o un’autenticazione del documento ufficiale.').className='note';
}
async function cards(container,names,isCurrent){
 if(!container||!root.JudgeCardData)return;
 const records=await Promise.all(names.map(name=>root.JudgeCardData.get(name).catch(()=>null)));
 if(!isCurrent())return;container.replaceChildren();
 for(const card of records.filter(Boolean)){
  const details=document.createElement('details'),summary=document.createElement('summary'),type=document.createElement('p'),oracle=document.createElement('p'),button=document.createElement('button'),list=document.createElement('div');
  summary.textContent=card.name+' — Oracle e ruling';type.textContent=card.type_line;oracle.textContent=card.oracle_text||(card.card_faces||[]).map(f=>f.name+': '+f.oracle_text).join(' / ')||'Nessuna abilità nel testo Oracle.';oracle.style.whiteSpace='pre-wrap';button.textContent='Mostra i ruling dello snapshot';button.className='option';button.type='button';
  button.onclick=async()=>{button.disabled=true;list.textContent='Caricamento…';try{const records=await root.JudgeCardData.rulings(card.oracle_id);if(!isCurrent())return;list.replaceChildren();for(const ruling of records){const p=document.createElement('p');p.textContent=(ruling.published_at||'')+' · '+(ruling.source||'fonte non indicata')+': '+ruling.comment;list.append(p)}if(!records.length)list.textContent='Nessun ruling presente nello snapshot per questa carta.';button.hidden=true}catch(error){list.textContent='Ruling non disponibili: '+error.message;button.disabled=false}};
  details.append(summary,type,oracle,button,list);container.append(details);
 }
}
root.JudgeResultView={render,cards};
})(typeof window!=='undefined'?window:globalThis);
