# Capitolo 16 — Blocchi A/B (in sviluppo)

Il modulo `question-planner.js` riceve fatti ignoti con opzioni finite e una funzione di valutazione dello scenario. Enumera fino a 512 combinazioni, confronta gli esiti e propone solo fatti che possono cambiarli a parità degli altri. Se tutti gli esiti coincidono restituisce `ready` senza domande. Se una combinazione non è supportata, restituisce `unsupported` anziché assumere un verdetto.

**Importante:** il modulo è un componente indipendente. L'attuale `guided-bridge.js` non fornisce ancora una funzione di valutazione completa; `game-facts.js` richiede tuttora i controllori. Pertanto Ashaya/Blood Moon **non è ancora un test end-to-end superato** e il planner non è collegato alla UI. Non dichiarare la fase conclusa prima di integrare il valutatore con layer/dipendenze e di verificare i risultati effettivi sul browser.

Test unitari proposti: `node question-planner.test.cjs` (8 casi). Devono essere eseguiti, insieme a 2370 test di gruppo e 71 core, sul commit finale prima del passaggio a 16C. Nessuna modifica a main.

## Aggiornamento integrazione

Il bridge guidato ora usa il pianificatore per enumerare configurazioni di controllori con Oracle recognition e JudgeCoordinator, e registra `diagnostic.questionPlanning` (solo anteprima). Il modulo viene caricato in `context.html`. **Non** nasconde ancora le domande né promuove un risultato parziale a verdetto: il coordinatore segnala esplicitamente copertura incompleta, e la UI non è ancora collegata a un ciclo di domande dinamiche. L'assenza di un contesto board completo continua a bloccare il normale percorso. La verifica Ashaya/Blood Moon e i test end-to-end rimangono aperti.

La GitHub Actions creata esegue solo gli 8 test unitari: non dimostra le 2370+71 regressioni. Non sono disponibili in questa sessione log di un'esecuzione riuscita del workflow; nessun conteggio va presentato come superato.
