# Judge Pocket — Contratto architetturale: scenario minimo sufficiente

**Obiettivo vincolante (dal Gruppo 4F.3 ai Gruppi 5–11, e retroattivamente ai Gruppi 1–4):** risolvere una interazione fra carte Magic specificate dall'utente, **non** ricostruire o simulare l'intera partita.

## Ingresso e risposta
- Ingresso: 2+ carte interessate, situazione/azione che si vuole verificare, eventuali altre carte/effetti che l'utente indica come rilevanti.
- Il motore deve ricavare dalle regole quali fatti aggiuntivi sono indispensabili *per distinguere esiti diversi*. Chiede solo quelli, con opzioni chiare quando possibile.
- Non chiedere per impostazione predefinita lista di tutti i permanenti, ordine di ingresso di ogni carta, vite di tutti i giocatori, tutta la pila o cronologia della partita.
- Un fatto non specificato resta **sconosciuto**, mai automaticamente falso. Non creare uno stato completo immaginario.
- Se una variabile non cambia la risposta, ignorarla. Se l'esito dipende da un fatto sconosciuto, fare una domanda mirata oppure mostrare esiti condizionali espliciti.
- Risposta: ordine degli eventi rilevanti, effetto di sostituzioni/inneschi/priorità pertinente, risultato e condizioni che lo potrebbero cambiare; distinguere verificato da non supportato.
- Niente eccezioni hardcoded per coppie di carte; utilizzare Oracle, regole strutturate e rulings come evidenza. IA facoltativa, mai fonte normativa del risultato.

## Architettura
I moduli esistenti (layer, sostituzioni, trigger, zone, stack, SBA) sono **motori di regole riutilizzabili**, non un obbligo di riprodurre tutta la partita. Un adattatore per scenario parziale deve estrarre il sottografo causale degli eventi e delle carte pertinenti, tracciare per ogni fatto `known/unknown/not-relevant` e produrre `requiredFacts` per l'intervista. La verifica delle precondizioni avviene prima del calcolo. Nessun esito definitivo quando un fatto indispensabile resta ignoto.

### Retrocompatibilità e migrazione
- Gruppi 1–3: conservare algoritmi e test; rimuovere progressivamente i requisiti di stato globale dai punti di ingresso rivolti all'utente. Non alterare la semantica delle regole.
- Gruppo 4A–4F.3: eventi e snapshot devono essere **locali alla sequenza rilevante**, con domande per transizioni/identità non osservate; nessuna deduzione di una cronologia completa.
- 4F.4–4F.8: simultaneità, trigger ritardati, SBA e ciclo di priorità limitati all'interazione richiesta, con verifiche e limiti espliciti.
- Gruppo 5: pila/priorità/risoluzione *della catena pertinente*, non l'intera pila del tavolo; chiedere altri oggetti in pila solo se possono cambiare l'esito.
- Gruppo 6: regole di turni, zone, combattimento e SBA come servizi invocati su fatti rilevanti, non simulatore globale.
- Gruppo 7: interpretazione Oracle che produce dipendenze e domande sui fatti mancanti.
- Gruppo 8: analizzatore causale di 2+ carte, esiti condizionali, spiegazioni e citazioni delle regole.
- Gruppo 9: foto per identificare carte interessate e altre carte dichiarate rilevanti; nessun obbligo di fotografare il tavolo.
- Gruppo 10: UX di chiarimenti dinamici, selezioni, correzione delle risposte e distinzione tra fatti ignoti e assenti.
- Gruppo 11: test di scenari minimi e di *non-domande* (informazioni irrilevanti), oltre a regressioni, sicurezza e beta su Android.

## Stato reale al momento di questa decisione
L'intervista `context-interview.js` ora consente `requiredFacts` e non chiede automaticamente controllori, board e ordine di ingresso. **La modalità guidata legacy** `game-facts.js` / `guided-bridge.js` richiede ancora dati globali ed è da migrare: fino ad allora può restituire un diagnostico di stato incompleto, non un verdetto. L'identità degli oggetti nel Gruppo 4F.3 resta parziale; l'interazione con le SBA non è ancora completa. Non dichiarare completata la migrazione finché i test end-to-end non la dimostrano.

## Criteri di accettazione trasversali
1. Due carte e un evento pertinente possono bastare; nessuna domanda superflua.
2. Una proprietà indispensabile ignota genera una domanda specifica e non un valore inventato.
3. Rispondere a una domanda aggiorna lo scenario senza azzerare le altre risposte.
4. Aggiungere un permanente irrilevante non modifica il risultato.
5. Un effetto aggiuntivo rilevante modifica il risultato o produce una domanda mirata.
6. I moduli di regole restano deterministici; test e versione a ogni rilascio.

## Chiusura 4F.3 (v0.9.43)
Verificate 158/158 regressioni esistenti (Gruppo 3 e Gruppo 4A–4F.3), suddivise in tre esecuzioni dei test dai file GitHub. Aggiunta associazione dell'identità dell'incarnazione alle abilità innescate e richieste strutturate `requiredFacts` per cambi di zona non osservabili. Rieseguiti 17/17 test 4F.3 dopo l'ultima modifica. Limitazione: l'interfaccia guidata non trasforma ancora automaticamente tutti i `requiredFacts` del detector in domande contestuali; la sua integrazione end-to-end e il supporto completo dei cambi di zona restano lavoro successivo. La validazione su tablet/browser non è stata eseguita.
