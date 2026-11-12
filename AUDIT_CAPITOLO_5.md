# Gruppo 5Y — Audit di chiusura del capitolo 5
Data: 2026-11-12. Ramo: `dev/groups-5f-5h`. Nessuna modifica a `main`.

## Evidenza verificata
Il report `test-reports/latest/summary.md` conferma per il commit 5X `fcbfb8459438c88266500b167678b35b486daac8` **409/409** test dei gruppi e **71/71** core, risultato success. Questi test attestano soltanto i casi codificati, non conformità generale alle Comprehensive Rules.

## Esito
**Capitolo 5 NON chiudibile come motore generale delle interazioni Magic.** La struttura è utilizzabile per scenari espliciti e ristretti, ma permangono lacune di correttezza e integrazione. Non aggiungere altre lettere soltanto per piccoli controlli di formato: correggere prima le lacune end-to-end.

## Blocchi critici (priorità)
1. **Risoluzione di magie reali e cambi di zona.** `turn-pipeline.js`, ramo `passPriority`, rimuove l'oggetto dalla pila e applica gli eventi, ma non chiama `JudgeStackZone.transition` al termine di una magia risolta. La transizione è usata per neutralizzazione/rimozione, non per la risoluzione ordinaria. Una carta magia può restare rappresentata in zona `stack` nel modello degli oggetti; istantanei/stregonerie e magie permanenti hanno destinazioni diverse. Occorre un modello esplicito di destinazione e inneschi relativi.
2. **Bersagli parzialmente illegali.** `resolution-engine.js` scarta ogni istruzione priva di `targetId` quando un bersaglio diventa illegale, anche se un'istruzione è indipendente dai bersagli; non rappresenta le dipendenze di ogni istruzione, i bersagli ripetuti o più occorrenze dello stesso oggetto. Il blocco prudenziale è meglio di un risultato errato, ma non è una risoluzione generale secondo CR 608.
3. **Regole di legalità dei bersagli incomplete.** `target-engine.js` usa id, kind, zona, tipo, controllore e un flag unknown; non calcola protezione, hexproof, shroud, ward, restrizioni di bersagli e modificatori Oracle. Inoltre verifica un `kind` sconosciuto solo *dopo* il controllo dell'esistenza: per un id assente può restituire illegal invece di unsupported.
4. **SBA incomplete.** `local-sba.js` gestisce solo un sottoinsieme di creature e una singola stabilizzazione; non copre in generale le azioni basate sullo stato né i cicli fino a punto fisso. Il `turn-pipeline` dipende da questa stabilizzazione per risolvere.
5. **Interazioni fra eventi, sostituzioni e inneschi.** `event-pipeline.js` ammette solo sei eventi primitivi. Mancano un AST Oracle generale, eventi di cambio zona, sostituzioni specifiche di zona, effetti che creano oggetti, scelta completa degli effetti applicabili e tutte le interazioni con inneschi.
6. **Costi e priorità parziali.** `choices-costs.js` gestisce soltanto mana generico e vita, non pagamenti colorati, tap/sacrificio, costi alternativi/addizionali e scelte modali complesse. `priority-engine.js` richiede un ordine completo di giocatori e un giocatore attivo; non deriva autonomamente tutte le finestre da un contesto minimo.
7. **Integrazione e verifica del prodotto.** Il test runner Node carica suite browser tramite VM; non è un test reale del flusso carta Oracle -> domanda mirata -> risposta -> verdetto, né della PWA su Android. `group-4-tests.html` contiene un registro statico vecchio (313 test) e non riflette le suite 5H–5X. README/COVERAGE sono datati rispetto al codice.

## Piano proposto per la chiusura
- **5Y.1 (P0)**: test end-to-end per risoluzione e zone, con casi instant/sorcery/permanent spell/copia, più test dei trigger; correggere il percorso reale.
- **5Y.2 (P0)**: contratto esplicito delle dipendenze delle istruzioni dai bersagli; preservare istruzioni indipendenti e chiedere chiarimenti quando la dipendenza è ignota.
- **5Y.3 (P0)**: integrare scelta/ricontrollo dei bersagli con caratteristiche effettive e restrizioni note; casi fail-closed quando manca il testo interpretato.
- **5Y.4 (P1)**: regressioni incrociate per SBA, sostituzioni, inneschi, ordine APNAP e priorità, con condizioni ignote.
- **5Y.5 (P1)**: test del contratto scenario minimo, UI, aggiornamento diagnostica browser, README/COVERAGE e prova Android.

## Criterio di uscita
Chiudere il capitolo 5 **solo come sottoinsieme esplicito e documentato** quando: (a) i flussi strutturati supportati sono coerenti end-to-end, (b) nessuna regola non implementata produce un verdetto definitivo, (c) suite incrociate e test browser superati, (d) limiti noti elencati. La copertura di tutte le carte/Comprehensive Rules resta obiettivo dei capitoli successivi, non condizione realistica per 5Y.
