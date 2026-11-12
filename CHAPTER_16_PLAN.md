# Capitolo 16 — Blocchi A/B (in sviluppo)

Il modulo `question-planner.js` riceve fatti ignoti con opzioni finite e una funzione di valutazione dello scenario. Enumera fino a 512 combinazioni, confronta gli esiti e propone solo fatti che possono cambiarli a parità degli altri. Se tutti gli esiti coincidono restituisce `ready` senza domande. Se una combinazione non è supportata, restituisce `unsupported` anziché assumere un verdetto.

**Importante:** il modulo è un componente indipendente. L'attuale `guided-bridge.js` non fornisce ancora una funzione di valutazione completa; `game-facts.js` richiede tuttora i controllori. Pertanto Ashaya/Blood Moon **non è ancora un test end-to-end superato** e il planner non è collegato alla UI. Non dichiarare la fase conclusa prima di integrare il valutatore con layer/dipendenze e di verificare i risultati effettivi sul browser.

Test unitari proposti: `node question-planner.test.cjs` (8 casi). Devono essere eseguiti, insieme a 2370 test di gruppo e 71 core, sul commit finale prima del passaggio a 16C. Nessuna modifica a main.

## Aggiornamento integrazione

Il bridge guidato ora usa il pianificatore per enumerare configurazioni di controllori con Oracle recognition e JudgeCoordinator, e registra `diagnostic.questionPlanning` (solo anteprima). Il modulo viene caricato in `context.html`. **Non** nasconde ancora le domande né promuove un risultato parziale a verdetto: il coordinatore segnala esplicitamente copertura incompleta, e la UI non è ancora collegata a un ciclo di domande dinamiche. L'assenza di un contesto board completo continua a bloccare il normale percorso. La verifica Ashaya/Blood Moon e i test end-to-end rimangono aperti.

La GitHub Actions creata esegue solo gli 8 test unitari: non dimostra le 2370+71 regressioni. Non sono disponibili in questa sessione log di un'esecuzione riuscita del workflow; nessun conteggio va presentato come superato.

## Esecuzione locale verificata — 2026-11-12

Eseguito `node question-planner.test.cjs` con Node.js v22.16.0 in una copia locale dei due file del pianificatore: **8/8 PASS** (controller irrilevante, esiti identici, controller rilevante, risposta già nota, scenario unsupported, opzioni invalide, limite scenari, scelte indipendenti). Questo non equivale a un'esecuzione GitHub Actions né alla suite completa del repository. Non sono stati eseguiti i 2370 test di gruppo né i 71 core in questa sessione. La validazione end-to-end Ashaya + Blood Moon resta non completata.

## Revisione conservativa — 2026-11-12

- `guided-bridge.js`: la pianificazione non può più trattare risultati `partial` del coordinatore come scenari verificati; soltanto risultati `verified` possono autorizzare l'eliminazione di domande. Il coordinatore attuale non garantisce questo livello, quindi la soppressione resta sospesa.
- `context-ui.js`: dopo la prima domanda su controllori o ordine di ingresso, il colloquio richiede le informazioni residue anziché inferirle arbitrariamente.
- `.github/workflows/chapter-16-tests.yml`: trigger estesi ai file del percorso guidato e controlli `node --check` aggiunti. Non equivale alla suite 2370+71.
- Il connettore GitHub disponibile restituisce soltanto esecuzioni associate a pull request. La ricerca per commit `93db6f46bf9e012d5a24d2bb09f01f1f0c9cff17` non ha restituito run: ciò **non dimostra** l'assenza di workflow push. I log delle esecuzioni verdi riferite dall'utente non sono stati consultati.
- Il test completo Ashaya + Blood Moon e le regressioni 2370+71 restano non verificati. Non dichiarare 16A/16B completati.
