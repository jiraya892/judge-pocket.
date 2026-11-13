/* Human-readable computed outcomes, kept separate from source authentication. */
(function(root){'use strict';
const rules={
 '503.1':'All’inizio del mantenimento si innescano le abilità pertinenti; il giocatore attivo riceve priorità dopo i controlli e la messa in pila degli inneschi.',
 '603.6a':'Gli inneschi di ingresso si verificano quando un permanente entra sul campo di battaglia.',
 '101.2':'Quando un effetto dice che qualcosa può accadere e un altro dice che non può, prevale il divieto.',
 '613.1f':'Gli effetti che aggiungono o rimuovono abilità si applicano nel layer 6.',
 '702.19':'Travolgere permette di assegnare danni al giocatore dopo avere assegnato danno letale ai bloccanti, contando danni già segnati e tocco letale.',
 '702.3b':'Una creatura con difensore non può attaccare.',
 '509.1b':'La dichiarazione dei bloccanti deve rispettare tutte le restrizioni di blocco applicabili.',
 '509.1':'La dichiarazione dei bloccanti deve rispettare le restrizioni e le abilità delle creature.',
 '702.16f':'Una creatura con protezione non può essere bloccata da creature con la qualità protetta.',
 '702.16e':'La protezione previene il danno da fonti con la qualità protetta.',
 '702.9':'Volare limita quali creature possono bloccare l’attaccante.',
 '702.111b':'Minaccia richiede almeno due bloccanti.',
 '115.1a':'Una magia bersaglia solo se il testo o le regole lo indicano; un effetto su ogni creatura non sceglie bersagli.',
 '704.3':'Le azioni basate sullo stato vengono controllate dopo la risoluzione, non tra le istruzioni della stessa magia.',
 '101.1':'Il testo di una carta può modificare la regola generale.',
 '702.2b':'Un danno positivo da una fonte con tocco letale è sufficiente per distruggere una creatura, salvo effetti come indistruttibile.',
 '704.5h':'Il tocco letale si controlla per il danno inflitto dall’ultima verifica delle azioni basate sullo stato.',
 '702.15b':'Il danno di una fonte con legame vitale fa guadagnare altrettante vite al suo controllore, come parte del danno.',
 '613.1d':'Layer 4: effetti che modificano i tipi delle carte.',
 '613.8':'Dipendenze: un effetto può dover essere applicato prima di un altro, anche se è entrato dopo.',
 '305.7':'Impostare un tipo di terra base rimuove le abilità del testo della terra e le dà la corrispondente abilità di mana.',
 '208.5':'Una forza o costituzione indicata con * senza una definizione applicabile si considera 0.',
 '704.5f':'Una creatura con costituzione pari o inferiore a 0 viene messa nel cimitero.',
 '603.1':'Un’abilità innescata specifica un evento che la fa innescare e un effetto.',
 '603.2':'Un’abilità si innesca automaticamente quando si verifica il suo evento.',
 '603.3':'Gli inneschi vengono messi in pila prima che un giocatore riceva priorità.',
 '603.4':'La condizione «se» posta subito dopo l’evento di innesco deve essere vera sia all’innesco sia alla risoluzione.',
 '615.1':'La prevenzione modifica o impedisce il danno prima che venga inflitto.',
 '702.11b':'Antimalocchio impedisce alle magie e abilità controllate dagli avversari di bersagliare il permanente.',
 '702.18a':'Velo impedisce a qualsiasi magia o abilità di bersagliare il permanente.',
 '702.16b':'La protezione da un colore impedisce di essere bersagliati da magie o abilità di fonti con quel colore.',
 '702.12b':'Indistruttibile impedisce la distruzione per danno letale, ma non la morte per costituzione non positiva.',
 '608.2b':'All’inizio della risoluzione si ricontrolla la legalità dei bersagli.',
 '608.2c':'Le istruzioni della magia si eseguono nell’ordine indicato.',
 '704.5g':'Una creatura con danno letale viene distrutta come azione basata sullo stato.',
 '510.1c':'Una creatura bloccata assegna il danno ai suoi bloccanti; senza bloccanti rimasti non assegna danno, salvo abilità come travolgere.',
 '702.4b':'Attacco improvviso e doppio attacco creano una prima sottofase di danno; doppio attacco permette di infliggere danno anche nella seconda.',
 '121.2':'Se un effetto fa pescare più carte, le carte vengono pescate una alla volta.',
 '614.1a':'«Invece» identifica una sostituzione dell’evento indicato dal testo.',
 '614.5':'Una sostituzione può modificare un evento una sola volta, senza riapplicarsi ricorsivamente agli eventi che ha prodotto.',
 '616.1':'Quando più sostituzioni si applicano, il giocatore interessato sceglie quale applicare per prima.'
};
function render(container,output){
 if(!container)return;container.replaceChildren();
 const outcome=output?.diagnostic?.computedOutcome||output?.outcome;
 if(!output?.diagnostic?.calculationVerified||!outcome)return;
 const add=(tag,text,parent=container)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el};
 add('h3','Passaggi calcolati');
 if(!(outcome.events||[]).length)add('p','Nel contesto dichiarato non si verificano cambi di zona.');
 for(const event of outcome.events||[])add('p',event.type==='creatureLeaves'?(event.reason==='lethalDamage'?event.name+' viene distrutta per danno letale.':event.name+' ha costituzione '+event.toughness+' e viene messa nel cimitero. Gli effetti delle fonti rimaste vengono ricalcolati.'):event.description||event.type);
 add('h3',outcome.scope==='trigger-occurrence'?'Conteggio degli inneschi, prima della risoluzione':outcome.scope==='draw-instructions'?'Istruzioni di pescata, senza risoluzione completa':'Situazione finale');
 if(outcome.scope==='trigger-occurrence')add('p','Le abilità in pila non sono state risolte. I conteggi non descrivono segnalini, carte pescate o permanenti creati successivamente.');
 if(outcome.scope==='draw-instructions')add('p','Il contenuto di mano e grimorio, le carte effettivamente pescate e le conseguenze di un grimorio vuoto non sono stati simulati.');
 for(const result of outcome.results||[]){
  const section=add('article','');add('h3',result.name,section);
  if(result.zone==='graveyard'){add('p','Nel cimitero.',section);continue}
  const labels={creature:'Creatura',land:'Terra',artifact:'Artefatto',enchantment:'Incantesimo',instant:'Istantaneo',sorcery:'Stregoneria'};
  const text=[result.zone==='battlefield'?'Sul campo di battaglia':result.zone,(result.types||[]).map(t=>labels[t]||t).join(', '),(result.subtypes||[]).join(', ')];
  if(Number.isFinite(result.power)&&Number.isFinite(result.toughness))text.push(result.power+'/'+result.toughness);
  if(Number.isFinite(result.damage)&&result.damage>0)text.push(result.damage+' danni segnati');
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
  button.onclick=async()=>{button.disabled=true;list.textContent='Caricamento…';try{const online=await root.JudgeCardRefresh?.rulings(card);const records=online??await root.JudgeCardData.rulings(card.oracle_id);if(!isCurrent())return;list.replaceChildren();for(const ruling of records){const p=document.createElement('p');p.textContent=(ruling.published_at||'')+' · '+(ruling.source||'fonte non indicata')+': '+ruling.comment;list.append(p)}if(!records.length)list.textContent=online?'Nessun ruling disponibile per questa carta.':'Nessun ruling presente nello snapshot per questa carta.';button.hidden=true}catch(error){list.textContent='Ruling non disponibili: '+error.message;button.disabled=false}};
  details.append(summary,type,oracle);if(card._judgeData){const fresh=document.createElement('p');fresh.textContent=(card._judgeData.stale?'Ultima copia disponibile':'Oracle aggiornato')+' · '+new Date(card._judgeData.retrievedAt).toLocaleDateString('it-IT');details.append(fresh)}else{const local=document.createElement('p');local.textContent='Database locale dell’app';details.append(local)}details.append(button,list);container.append(details);
 }
}
root.JudgeResultView={render,cards,describeRule:id=>rules[id]||null};
})(typeof window!=='undefined'?window:globalThis);
