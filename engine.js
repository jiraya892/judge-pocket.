/* Judge Pocket beta: riconoscimento di meccaniche dal testo Oracle.
 * Il motore produce solo conseguenze CONDIZIONALI di alcune regole generali.
 * Non rappresenta lo stato della partita e non interpreta arbitrariamente tutto Oracle.
 */
(function(root){
'use strict';
const textOf = card => [card.oracle_text,...(card.card_faces||[]).map(face=>face.oracle_text)].filter(Boolean).join('\n');
const has = (s,re) => re.test(s);
function parse(card){
 const text=textOf(card);
 const lines=text.split(/\n/);
 const tokenDouble=lines.some(s=>has(s,/^if\b.{0,180}\btokens?\b.{0,160}\btwice that many\b.{0,110}\binstead\b/i)&&has(s,/\b(?:create|created)\b/i));
 const counterDouble=lines.some(s=>has(s,/^if\b.{0,170}\bcounters?\b.{0,170}\btwice that many\b.{0,110}\binstead\b/i)&&has(s,/\b(?:put|placed)\b/i));
 const counterPlusOne=lines.some(s=>has(s,/^if\b.{0,170}\+1\/\+1 counters?\b.{0,120}\bthat many plus one\b.{0,90}\binstead\b/i));
 const etbExtra=lines.some(s=>has(s,/^if\b.{0,180}\bentering (?:the battlefield|)\b.{0,130}\btriggered ability\b.{0,95}\btriggers an additional time\b/i));
 const etbAny=lines.some(s=>has(s,/\bif a permanent entering\b/i)&&has(s,/\btriggers an additional time\b/i));
 const etbArtifactCreature=lines.some(s=>has(s,/\bif an artifact or creature entering\b/i)&&has(s,/\btriggers an additional time\b/i));
 const tokenCreate=lines.some(s=>has(s,/\bcreate\b.{0,160}\btokens?\b/i)||has(s,/\bcreates?\b.{0,160}\btokens?\b/i));
 const counterCreate=lines.some(s=>has(s,/\bput\b.{0,150}\b\+1\/\+1 counters?\b/i)&&!has(s,/^if\b/i));
 const etbTrigger=lines.some(s=>has(s,/^(?:when|whenever)\b.{0,180}\benters? (?:the battlefield|)\b/i));
 return {name:card.name||'Carta senza nome',text,tokenDouble,counterDouble,counterPlusOne,etbExtra,etbAny,etbArtifactCreature,tokenCreate,counterCreate,etbTrigger};
}
const names = features => features.map(f=>f.name).join(', ');
function analyze(cards){
 const fs=cards.map(parse);
 const findings=[];
 function add(title,description,conditions,sources,rules){
  findings.push({title,description,conditions,sources:sources.map(f=>f.name),rules,certainty:'condizionale'});
 }
 const td=fs.filter(f=>f.tokenDouble), producers=fs.filter(f=>f.tokenCreate&&!f.tokenDouble);
 if(td.length>0&&(td.length>1||producers.length)){
   const multiple=2**td.length;
   add('Creazione di pedine: effetti di sostituzione',
     'Se tutti gli effetti individuati si applicano allo stesso evento di creazione di pedine, viene creato '+multiple+' volte il numero inizialmente previsto.',
     'Gli effetti devono essere già attivi e applicarsi ai giocatori coinvolti. I raddoppi non agiscono retroattivamente. Controlla anche eventuali effetti di sostituzione aggiuntivi.',
     [...td,...producers],['614.1','614.5','614.16','616.1']);
 }
 const doubles=fs.filter(f=>f.counterDouble), plus=fs.filter(f=>f.counterPlusOne), counterSources=fs.filter(f=>f.counterCreate&&!f.counterPlusOne&&!f.counterDouble);
 if(doubles.length+plus.length>1 || (doubles.length+plus.length>0&&counterSources.length)){
   const haveBoth=doubles.length>0&&plus.length>0;
   const description=haveBoth
     ? 'Più effetti modificano i segnalini: il risultato può dipendere dall’ordine scelto. Con un raddoppio e un incremento di +1, se l’evento iniziale mette un segnalino +1/+1, si possono ottenere 3 o 4 segnalini.'
     : doubles.length>0
      ? 'Se tutti i '+doubles.length+' effetti di raddoppio si applicano allo stesso evento di collocazione di segnalini, il numero viene moltiplicato per '+(2**doubles.length)+'.'
      : 'Ogni effetto applicabile che aggiunge un segnalino +1/+1 aumenta il numero previsto di un segnalino.';
   add('Segnalini: effetti di sostituzione',description,
     'La quantità e il tipo di segnalini, il controllore del permanente, la causa della collocazione e l’ordine di applicazione devono rispettare le condizioni di ciascuna carta. L’esempio numerico vale solo per un raddoppio e un incremento.',
     [...doubles,...plus,...counterSources],['614.1','614.16','616.1']);
 }
 const etb=fs.filter(f=>f.etbExtra);
 const triggers=fs.filter(f=>f.etbTrigger&&!f.etbExtra);
 if(etb.length>1||(etb.length>0&&triggers.length)){
   add('Abilità innescate dall’entrata sul campo',
     'Se tutti i '+etb.length+' effetti aggiuntivi si applicano a un’unica abilità innescata, essa si innesca '+(etb.length+1)+' volte in totale (un innesco normale e '+etb.length+' aggiuntivi).',
     'L’evento deve rispettare il tipo di permanente richiesto (per alcuni effetti, solo artefatto o creatura). Deve trattarsi di un’abilità innescata di un permanente controllato dal giocatore corretto. Non è un raddoppio moltiplicativo e non si applica a ogni abilità di entrata.',
     [...etb,...triggers],['603.1','603.2','603.3']);
 }
 return {findings,recognized:fs.map(f=>({
  name:f.name,mechanics:[
   f.tokenDouble&&'raddoppio pedine',
   f.counterDouble&&'raddoppio segnalini',
   f.counterPlusOne&&'incremento segnalini +1/+1',
   f.etbExtra&&'innesco aggiuntivo per entrata sul campo',
   f.tokenCreate&&'creazione pedine',
   f.counterCreate&&'collocazione segnalini',
   f.etbTrigger&&'innesco di entrata sul campo'
  ].filter(Boolean)})),limitations:[
  'Non considera priorità, bersagli, ordine sulla pila, stato della partita o effetti continui complessi.',
  'Un meccanismo riconosciuto non dimostra che le condizioni siano soddisfatte: l’analisi è sempre condizionale.',
  'Non riconoscere una meccanica non significa che le carte non interagiscano.'
 ]};
}
root.JudgeEngine={analyze,parse,textOf};
})(typeof window!=='undefined'?window:globalThis);
