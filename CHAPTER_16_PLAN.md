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

## Verifica successiva — 2026-11-12

- `guided-bridge.js` ora rifiuta `cast`, `other`, eventi sconosciuti e una carta in ingresso non corrispondente **prima** di chiedere fatti sul campo di battaglia. Non si devono chiedere dati che non possono sbloccare un calcolo supportato.
- `chapter-16-guided.test.cjs` include 9 verifiche con moduli simulati, tre delle quali per questo comportamento. Sono test di flusso, non una verifica del motore CR 613 o della combinazione Ashaya/Blood Moon.
- In questa sessione non è stato possibile clonare il repository dal container (DNS GitHub non raggiungibile). Non sono stati eseguiti localmente i 10 test planner, i 9 di integrazione, né i 2370+71 di regressione. Le esecuzioni GitHub Actions push non sono elencabili tramite l'azione del connettore disponibile, limitata ai run pull request; non dichiarare log consultati.

## Verifica corrente — 2026-11-13 (Codex Cloud)

Base: `fd9262b79137fe55e1ca84da13e219bd5143aa38`, ramo esclusivo
`dev/chapter-16-question-planner`. Nessuna modifica a main, nessun push,
nessuna pubblicazione dell'app o dell'ambiente; nessun lavoro su 16C.

### Modifiche verificate

- Il planner esige `supported: true` **e** `status: verified`, senza avvisi,
  fatti mancanti o diagnostici bloccanti. Non accetta un risultato `partial`,
  nemmeno quando tutti i valori numerici coincidono. Valida anche le risposte
  note rispetto al dominio. Confronta oggetti JSON indipendentemente dall'ordine
  delle chiavi, rifiuta serializzazioni che perderebbero informazioni, e isola
  gli input dagli effetti collaterali del valutatore. Limite: 512 scenari.
- Il bridge usa realmente il planner per controllori e ordine di ingresso,
  conserva risposte parziali e propone domande solo dopo scenari completamente
  verificati. La completezza del contesto resta una dichiarazione esplicita;
  gli effetti aggiuntivi non sono enumerati come se fossero assenti. Il dominio
  attuale della modalità guidata è limitato a 2–3 carte e due controllori.
- Se il motore è incompleto, il percorso si ferma prima di chiedere campo,
  controllori o cronologia che non potrebbero sbloccarlo. L'ingresso di una carta
  non è più simulato come semplice presenza sul campo. Non si inventano dati o
  verdetti. Le domande successive della UI non impongono il completamento di
  fatti che il planner potrebbe poi stabilire irrilevanti.
- Corrette espressioni regolari sovra-escapate per sottotipi e valori numerici.
  Il riconoscitore ignora reminder text e gestisce l'autoriferimento abbreviato
  del nome nelle definizioni P/T. Sono regole generali, senza nomi o coppie
  codificati nell'implementazione.
- Nel calcolo continuo, se una definizione P/T viene rimossa e i valori stampati
  sono esplicitamente `*/*`, si applica la base zero (CR 208.5). Per formule
  ignote resta `unsupported`. Nessuna promozione del risultato parziale.
- Il browser ignora risposte asincrone obsolete dopo il riavvio del colloquio;
  un contesto rifiutato non lascia una schermata vuota.
- Il workflow del capitolo ora esegue anche motore reale, regressioni complete e
  test di provenienza. Rimosso il filtro dei file che poteva escludere cambiamenti
  ai moduli del motore o ai dati Oracle.

### Comandi e risultati effettivi

Eseguiti con Node.js `v24.22.1`, Python `3.12.14` e Chromium/Playwright:

| Comando | Risultato |
| --- | --- |
| `node question-planner.test.cjs` | 27/27 PASS |
| `node chapter-16-guided.test.cjs` | 20/20 PASS, valutatore simulato |
| `node chapter-16-real-engine.test.cjs` | 19/19 PASS, moduli reali e Oracle del database |
| `node verify-tests.cjs` | 71 PASS, 0 FAIL |
| `node verify-groups-5h.cjs` | 2370/2370 PASS, 0 errori di esecuzione |
| `node scripts/verify-official-provenance.test.cjs` | 6/6 PASS |
| `python3 scripts/test-chapter-16-browser.py` | 3/3 percorsi PASS |
| `git diff --check` | PASS |

Per ripetere la prova browser: avviare nella root del checkout
`python3 -m http.server 8000 --bind 127.0.0.1`; con Playwright Python e Chromium
installati, eseguire lo script indicato. Non richiede Scryfall in rete: sostituisce
solo il trasporto con i record del database fornito. Il primo percorso usa il
motore reale; il secondo simula deliberatamente un valutatore verificato per
provare domande, correzioni, conservazione delle risposte e controllo finale
sulle fonti; il terzo verifica l'invalidazione delle risposte asincrone obsolete.

### Cosa dimostra Ashaya + Blood Moon

Il test legge i record reali da `oracle-cards-part-*.jsonl.gz` (nessuna sostituzione
del motore). Attraversa riconoscimento Oracle, fatti, coordinatore, layer condivisi,
dipendenze e planner. Nelle otto combinazioni di controllori e ordine verifica che
l'effetto che aggiunge Forest venga applicato prima di quello che imposta Mountain,
che le abilità da rules text siano rimosse e rimanga quella intrinseca di mana
rosso, e che la P/T calcolata dopo la perdita della definizione sia 0/0.

**Questo è ancora un calcolo di caratteristiche, non l'interazione completa.**
La stabilizzazione delle SBA, il cambio di zona, gli eventuali inneschi e il
ricalcolo dopo la scomparsa della fonte non vengono eseguiti dal coordinatore
usato nel percorso guidato. Il test verifica esplicitamente `partial` nel
coordinatore e `unsupported` nel bridge: non deve diventare verde mediante un
semplice cambio di etichetta a `verified`. Il browser controlla lo stesso limite.

### Dati effettivamente integrati e limiti di chiusura

I quattro archivi Oracle e l'archivio ruling sono presenti nel repository. Il
percorso di produzione continua a recuperare i singoli testi da Scryfall; gli
archivi sono usati dal nuovo test reale, non costituiscono ancora un database
locale collegato alla UI. Il protocollo di domande è connesso, ma il coordinatore
attuale **non emette alcun risultato verificato**. Il confine di presentazione
mantiene inoltre non autenticata la fonte delle regole: non è stato aggirato.

Pertanto **16A/16B non sono dichiarati conclusi**: manca un valutatore completo
per il perimetro di interazione, con SBA e ricalcolo delle fonti, che possa
soddisfare onestamente il contratto del planner e il confine sulle evidenze.
I test con valutatore simulato provano il protocollo, non colmano questo limite.

### GitHub Actions: osservazioni, non risultati inventati

La pagina pubblica della run
<https://github.com/jiraya892/judge-pocket./actions/runs/43293476196/job/131445478695>
riporta `succeeded`, sul commit `f56276c3a2782ae45b103bb8ca1a55eb09425545`.
È un'esecuzione precedente, non la validazione di queste modifiche. La pagina
richiede «Sign in to view logs»: i log dettagliati non sono stati consultati.
L'API Actions su `api.github.com` è stata rifiutata dal proxy (CONNECT 403);
il tentativo di leggere lo step dal suo URL pubblico ha restituito HTTP 404.
Non sono stati richiesti token né modifiche alla configurazione della rete.
Il nuovo workflow e Node 22 in CI restano da verificare sul futuro commit remoto:
nessun push è stato eseguito, rispettando l'istruzione di non pubblicare.
