# Capitolo 16 — Blocchi A/B (in sviluppo)

Il modulo `question-planner.js` riceve fatti ignoti con opzioni finite e una funzione di valutazione dello scenario. Enumera fino a 512 combinazioni, confronta gli esiti e propone solo fatti che possono cambiarli a parità degli altri. Se tutti gli esiti coincidono restituisce `ready` senza domande. Se una combinazione non è supportata, restituisce `unsupported` anziché assumere un verdetto.

**Importante:** il modulo è un componente indipendente. L'attuale `guided-bridge.js` non fornisce ancora una funzione di valutazione completa; `game-facts.js` richiede tuttora i controllori. Pertanto Ashaya/Blood Moon **non è ancora un test end-to-end superato** e il planner non è collegato alla UI. Non dichiarare la fase conclusa prima di integrare il valutatore con layer/dipendenze e di verificare i risultati effettivi sul browser.

Test unitari proposti: `node question-planner.test.cjs` (8 casi). Devono essere eseguiti, insieme a 2370 test di gruppo e 71 core, sul commit finale prima del passaggio a 16C. Nessuna modifica a main.
