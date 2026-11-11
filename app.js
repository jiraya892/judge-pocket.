const $=id=>document.getElementById(id);let cards=[];let adding=false;let nextCardInstance=1;let analysisRun=0;const rulingsCache=new Map();
$('photo').addEventListener('change',e=>{let f=e.target.files?.[0];if(!f)return;let img=$('photoPreview');if(img.dataset.url)URL.revokeObjectURL(img.dataset.url);img.dataset.url=URL.createObjectURL(f);img.src=img.dataset.url;img.hidden=false});
$('name').addEventListener('keydown',e=>{if(e.key==='Enter')$('add').click()});
$('add').onclick=async()=>{if(adding)return;let name=$('name').value.trim();if(!name)return;adding=true;$('add').disabled=true;$('status').textContent='Cerco la carta…';try{let r=await fetch('https://api.scryfall.com/cards/named?fuzzy='+encodeURIComponent(name));let c=await r.json();if(!r.ok)throw Error(c.details||'Carta non trovata');cards.push({...c,_instanceId:'selection-'+(nextCardInstance++)});analysisRun++;$('analysis').replaceChildren();$('name').value='';$('status').textContent='Carta aggiunta';render()}catch(e){$('status').textContent='Errore: '+e.message}finally{adding=false;$('add').disabled=false}};
$('clear').onclick=()=>{cards=[];analysisRun++;$('analysis').replaceChildren();render();$('status').textContent='Selezione svuotata'};
function render(){let root=$('cards');root.replaceChildren();for(let c of cards){let d=document.createElement('div');d.className='card';let h=document.createElement('h3');h.textContent=c.name;d.append(h);let t=document.createElement('p');t.textContent=c.oracle_text||c.card_faces?.map(x=>x.oracle_text).filter(Boolean).join(' / ')||'Testo Oracle non disponibile';d.append(t);let a=document.createElement('a');a.href=c.scryfall_uri;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Apri carta su Scryfall';d.append(a);let b=document.createElement('button');b.className='secondary';b.textContent='Mostra rulings';b.onclick=async()=>{b.disabled=true;b.textContent='Caricamento…';try{let r=await fetch(c.rulings_uri);if(!r.ok)throw Error('Rulings non disponibili');let j=await r.json();let ul=document.createElement('ul');for(let x of j.data||[]){let li=document.createElement('li');li.textContent=x.comment;ul.append(li)}if(!ul.children.length){let li=document.createElement('li');li.textContent='Nessun ruling disponibile';ul.append(li)}d.append(ul);b.remove()}catch(e){b.disabled=false;b.textContent='Riprova rulings';$('status').textContent=e.message}};d.append(b);let remove=document.createElement('button');remove.className='secondary';remove.textContent='Rimuovi questa carta';remove.onclick=()=>{cards=cards.filter(x=>x._instanceId!==c._instanceId);analysisRun++;$('analysis').replaceChildren();render()};d.append(remove);root.append(d)}window.refreshJudgeTargets?.()}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Motore generale: il testo Oracle viene interpretato per meccaniche, non per nomi di carte.
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
  const report=JudgeEngine.analyze(selected);
  if(report.findings.length){
    for(const finding of report.findings){
      showText(out,finding.title,'h3');
      showText(out,finding.description);
      showText(out,'Condizioni: '+finding.conditions);
      showText(out,'Carte coinvolte: '+finding.sources.join(', '));
      showText(out,'Regole di riferimento: '+finding.rules.join(', '));
    }
  }else{
    showText(out,'Nessun risultato determinabile con le meccaniche supportate. Questo non significa che le carte non interagiscano.');
  }
  const recognized=report.recognized.filter(x=>x.mechanics.length);
  if(recognized.length)showText(out,'Meccaniche individuate: '+recognized.map(x=>x.name+' ('+x.mechanics.join(', ')+')').join('; ')+'.');
  showText(out,'Limiti: '+report.limitations.join(' '));
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

// API interna per il modulo di simulazione: copie della stessa carta sono istanze distinte.
window.getJudgeSelectedCards=()=>[...cards];
