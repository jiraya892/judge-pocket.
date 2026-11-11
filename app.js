const $=id=>document.getElementById(id);let cards=[];let adding=false;let analysisRun=0;const rulingsCache=new Map();
$('photo').addEventListener('change',e=>{let f=e.target.files?.[0];if(!f)return;let img=$('photoPreview');if(img.dataset.url)URL.revokeObjectURL(img.dataset.url);img.dataset.url=URL.createObjectURL(f);img.src=img.dataset.url;img.hidden=false});
$('name').addEventListener('keydown',e=>{if(e.key==='Enter')$('add').click()});
$('add').onclick=async()=>{if(adding)return;let name=$('name').value.trim();if(!name)return;adding=true;$('add').disabled=true;$('status').textContent='Cerco la carta…';try{let r=await fetch('https://api.scryfall.com/cards/named?fuzzy='+encodeURIComponent(name));let c=await r.json();if(!r.ok)throw Error(c.details||'Carta non trovata');if(cards.some(x=>x.id===c.id)){ $('status').textContent='Carta già presente';return}cards.push(c);analysisRun++;$('analysis').replaceChildren();$('name').value='';$('status').textContent='Carta aggiunta';render()}catch(e){$('status').textContent='Errore: '+e.message}finally{adding=false;$('add').disabled=false}};
$('clear').onclick=()=>{cards=[];analysisRun++;$('analysis').replaceChildren();render();$('status').textContent='Selezione svuotata'};
function render(){let root=$('cards');root.replaceChildren();for(let c of cards){let d=document.createElement('div');d.className='card';let h=document.createElement('h3');h.textContent=c.name;d.append(h);let t=document.createElement('p');t.textContent=c.oracle_text||c.card_faces?.map(x=>x.oracle_text).filter(Boolean).join(' / ')||'Testo Oracle non disponibile';d.append(t);let a=document.createElement('a');a.href=c.scryfall_uri;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Apri carta su Scryfall';d.append(a);let b=document.createElement('button');b.className='secondary';b.textContent='Mostra rulings';b.onclick=async()=>{b.disabled=true;b.textContent='Caricamento…';try{let r=await fetch(c.rulings_uri);if(!r.ok)throw Error('Rulings non disponibili');let j=await r.json();let ul=document.createElement('ul');for(let x of j.data||[]){let li=document.createElement('li');li.textContent=x.comment;ul.append(li)}if(!ul.children.length){let li=document.createElement('li');li.textContent='Nessun ruling disponibile';ul.append(li)}d.append(ul);b.remove()}catch(e){b.disabled=false;b.textContent='Riprova rulings';$('status').textContent=e.message}};d.append(b);let remove=document.createElement('button');remove.className='secondary';remove.textContent='Rimuovi questa carta';remove.onclick=()=>{cards=cards.filter(x=>x.id!==c.id);analysisRun++;$('analysis').replaceChildren();render()};d.append(remove);root.append(d)}}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Analisi conservativa: segnala soltanto argomenti condivisi, senza dedurre esiti delle regole.
const topics=[['segnalini',/counter|proliferate|doubl(?:e|ing)|segnalin/i],['pedine',/token|pedin/i],['cimitero',/graveyard|dies|died|cimiter/i],['esilio',/exile|exiled|esili/i],['lancio di magie',/cast|spell|lanci/i],['entrata sul campo',/enters(?: the battlefield)?|enter the battlefield|entra sul campo/i],['danno',/damage|danno/i],['pescare carte',/draw (?:a |two |three |that many )?cards?|pesca/i],['mana',/mana|add \{/i],['sacrificio',/sacrifice|sacrific/i],['attacco',/attacks?|attacc/i],['guadagno di punti vita',/gain(?:s)? (?:that much |[0-9]+ )?life|guadagni? punti vita/i]];
const oracle=c=>[c.oracle_text,...(c.card_faces||[]).map(f=>f.oracle_text)].filter(Boolean).join(' ');

const exactRules=[
 {names:['Panharmonicon','Yarok, the Desecrated'],title:'Inneschi aggiuntivi all’entrata sul campo',explain:'Se un permanente che entra sul campo fa innescare un’abilità di un permanente che controlli e anche Panharmonicon si applica a quell’evento, l’abilità si innesca una volta in più per ciascuno dei due effetti: tre inneschi totali anziché uno.',caveat:'L’oggetto che entra deve essere un artefatto o una creatura, e la stessa abilità deve soddisfare le condizioni di entrambe le carte.'},
 {names:['Anointed Procession','Mondrak, Glory Dominus'],title:'Raddoppi della creazione di pedine',explain:'Se entrambi sono sotto il tuo controllo e si applicano allo stesso evento in cui crei pedine, il numero di pedine create è quattro volte quello inizialmente previsto.',caveat:'Vale soltanto per nuovi eventi di creazione di pedine sotto il tuo controllo.'},
 {names:['Doubling Season','Parallel Lives'],title:'Effetti di sostituzione sulla creazione di pedine',explain:'Se entrambi gli effetti sono applicabili allo stesso evento di creazione di pedine sotto il tuo controllo, ciascuno raddoppia il numero: il risultato è quattro volte il numero iniziale.',caveat:'Vale soltanto per gli eventi a cui si applicano entrambi gli effetti; non riguarda pedine già presenti.'},
 {names:['Doubling Season','Anointed Procession'],title:'Effetti di sostituzione sulla creazione di pedine',explain:'Quando entrambi si applicano allo stesso evento che crea pedine sotto il tuo controllo, il numero di pedine viene moltiplicato per quattro.',caveat:'Controllore e testo preciso dell’effetto che crea le pedine sono rilevanti.'},
 {names:['Parallel Lives','Anointed Procession'],title:'Effetti di sostituzione sulla creazione di pedine',explain:'Se entrambi gli effetti si applicano allo stesso evento di creazione di pedine sotto il tuo controllo, vengono create quattro volte le pedine inizialmente previste.',caveat:'Non modifica pedine già sul campo di battaglia.'},
 {names:['Doubling Season','Hardened Scales'],title:'Segnalini +1/+1 e sostituzioni',explain:'Se uno o più segnalini +1/+1 stanno per essere messi su una creatura che controlli per effetto di un evento a cui si applicano entrambi, il numero iniziale N diventa 2×(N+1) oppure 2×N+1, secondo l’ordine scelto dal controllore dell’oggetto interessato.',caveat:'Doubling Season richiede che sia un effetto a mettere i segnalini su un permanente che controlli. Il risultato dipende dall’ordine degli effetti di sostituzione.'}
];
function norm(s){return s.toLowerCase().replace(/[^a-z0-9]/g,'')}

// Scryfall card-specific rulings help verify relevant text but are NOT an automatic verdict.
async function loadCardRulings(card){
  if(rulingsCache.has(card.id))return rulingsCache.get(card.id);
  if(typeof card.rulings_uri!=='string'||!card.rulings_uri.startsWith('https://api.scryfall.com/'))
    throw Error('URL rulings Scryfall mancante');
  const response=await fetch(card.rulings_uri,{headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Risposta Scryfall HTTP '+response.status);
  const json=await response.json();
  const result=Array.isArray(json.data)?json.data.filter(r=>typeof r.comment==='string'):[];
  rulingsCache.set(card.id,result);
  return result;
}
function showText(parent,txt,tag='p'){
  const el=document.createElement(tag);
  el.textContent=txt;
  parent.append(el);
  return el;
}
$('analyze').onclick=async()=>{
  const run=++analysisRun;
  const selected=[...cards];
  const out=$('analysis');
  out.replaceChildren();
  if(selected.length<2){showText(out,'Seleziona almeno due carte per confrontarle.');return}
  let count=0;
  for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++){
    const a=selected[i],b=selected[j];
    const found=exactRules.find(r=>r.names.some(n=>norm(n)===norm(a.name))&&r.names.some(n=>norm(n)===norm(b.name)));
    if(found){
      count++;
      showText(out,a.name+' + '+b.name,'h3');
      showText(out,found.title);
      showText(out,found.explain);
      showText(out,'Condizioni: '+found.caveat);
    }else{
      const shared=topics.filter(([,re])=>re.test(oracle(a))&&re.test(oracle(b))).map(([name])=>name);
      showText(out,a.name+' + '+b.name+': '+(shared.length?'possibili temi comuni: '+shared.join(', '):'nessuna parola chiave comune rilevata')+'. Esito non determinato.');
    }
  }
  showText(out,count?'Le conclusioni valgono soltanto con le condizioni indicate.':'Il motore non dispone di regole specifiche per queste combinazioni.');
  showText(out,'Rulings ufficiali delle singole carte (non dimostrano da soli il risultato della combinazione):','h3');
  const status=showText(out,'Caricamento dei rulings Scryfall…');
  const list=document.createElement('div');
  out.append(list);
  const limit=selected.slice(0,8);
  for(const card of limit){
    if(run!==analysisRun)return;
    const section=document.createElement('div');
    section.className='card';
    showText(section,card.name,'h3');
    try{
      const rulings=await loadCardRulings(card);
      if(run!==analysisRun)return;
      if(rulings.length===0)showText(section,'Nessun ruling specifico disponibile su Scryfall.');
      for(const ruling of rulings.slice(0,10)){
        showText(section,(ruling.published_at?ruling.published_at+' — ':'')+ruling.comment);
      }
      if(rulings.length>10)showText(section,'Altri rulings disponibili: '+(rulings.length-10)+'.');
      if(typeof card.scryfall_uri==='string'){
        const link=document.createElement('a');
        link.href=card.scryfall_uri;link.target='_blank';link.rel='noopener noreferrer';
        link.textContent='Fonte: Scryfall — '+card.name;
        section.append(link);
      }
    }catch(e){
      if(run!==analysisRun)return;
      showText(section,'Non sono riuscito a recuperare i rulings: '+e.message);
    }
    list.append(section);
    if(limit.length>1)await new Promise(resolve=>setTimeout(resolve,110));
  }
  if(run!==analysisRun)return;
  status.textContent='Consultazione rulings completata per '+limit.length+' carte.';
  if(selected.length>limit.length)showText(out,'Per non sovraccaricare Scryfall, ho mostrato i rulings delle prime '+limit.length+' carte.');
  showText(out,'I rulings sono indicazioni specifiche per le carte, non un simulatore dello stato della partita. Per casi non codificati il risultato rimane sconosciuto; nessuna IA viene chiamata.');
};
