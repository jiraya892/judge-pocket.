# Beta sperimentale — perimetro e prove

## Stato

Ramo di sviluppo: `dev/beta-engine-integration`, derivato dai commit locali
`b146d81` e `2f9f576` del lavoro 16A/B. Il repository effettivamente configurato
è `jiraya892/judge-pocket.` (punto finale incluso). Non è stato rinominato in
`judge-pocket`, né è stato modificato main.

Questa è una beta locale funzionante **entro il perimetro descritto sotto**, non
un interprete generale di tutte le Comprehensive Rules. Non è una release
pubblicata. Non esiste un nuovo deployment verificato da fornire all'utente.

Il calcolo deterministico e la provenienza delle fonti sono distinti. Gli esiti
completi del valutatore ristretto guidano le domande, ma il controllo preesistente
sulle fonti resta attivo: la presentazione è `partial`, senza verdetto normativo
certificato. Non sono state disabilitate verifiche di sicurezza o eliminati test.

## Flussi realmente collegati alla PWA

| Situazione | Funzionamento e confine |
| --- | --- |
| Due o tre carte già sul campo | Tipi di terra, dipendenze layer 4, P/T numerica o conteggio terre, SBA per costituzione non positiva, ricalcolo delle fonti |
| Una magia sta per risolversi | Frase Oracle completa di danno fisso a una creatura; bersaglio tra le creature indicate; priorità, pila, risoluzione, cambio zona e SBA |
| Indistruttibile | Il danno viene segnato, ma il danno letale non distrugge la creatura; non impedisce le SBA per costituzione non positiva |
| Prevenzione | Frase completa che previene ogni danno alla creatura stessa, interpretata come effetto di prevenzione prima dell'evento |
| Una creatura entra | Inneschi obbligatori del tipo “un'altra creatura entra: guadagni N vite”, riconosciuti da Oracle e risolti realmente attraverso pila e priorità |
| Domande | Solo fatti che possono cambiare l'esito tra tutte le alternative complete; risposte conservate e modificabili |
| Carte non riconosciute o contesto aperto | Spiegazione del limite e possibilità di ricominciare, senza inventare un esito |

Il contesto viene confermato esplicitamente dall'utente. Non si assumono assenti
pedine, comandanti, danni, segnalini, risposte o altri effetti senza tale conferma.
Per la risoluzione della magia si dichiara già completato legalmente il lancio:
la beta non verifica mana disponibile, pagamento o costi alternativi.
Per gli ingressi supportati, gli unici inneschi implementati sono guadagni vita
obbligatori e commutativi; non si inventa un ordine per altri effetti simultanei.
I valori mostrati sono variazioni di vite, non totali di vite assunti reali.

Tutti i riconoscimenti si basano su forme Oracle e proprietà del modello, senza
nomi o eccezioni per coppie di carte nell'implementazione.

## Dati, ricerca e spiegazioni

- 38.779 record Oracle nello snapshot fornito, con ricerca locale per sottostringa.
- Due selezioni iniziali e pulsante per una terza carta; rimozione della terza.
- Testi Oracle e ruling consultabili nel risultato. Un ruling relativo a una
  carta non è presentato come prova automatica dell'interazione della coppia.
- Database prodotti dagli archivi esistenti, senza download: indice e 64 shard
  Oracle più 64 shard ruling, circa 12,3 MB complessivi. Gli shard si caricano a
  richiesta e sono verificati per dimensione e SHA-256 prima dell'uso.
- Il digest verifica l'integrità rispetto al manifest generato, non una firma
  del publisher. Lo snapshot non viene aggiornato automaticamente.
- Fallback Scryfall per nomi non presenti o database locale indisponibile.
  L'accesso reale a Scryfall è stato verificato con HTTP 200 nell'ambiente corrente.
- Spiegazioni costruite dal risultato deterministico: eventi, situazione finale,
  abilità di mana e riferimenti alle regole effettivamente applicate.
- Nessuna IA utilizzata per decidere o spiegare questi calcoli.

Rigenerazione: `python3 scripts/build-card-database.py` e
`python3 scripts/build-app-shell.py`. Gli archivi originali non vengono modificati.

## Errori del motore corretti durante questa fase

1. La carta di una magia con tutti i bersagli illegali ora cambia zona verso il
   cimitero; le copie cessano senza spostare una carta fisica. Una carta fisica
   non identificata produce un errore prudenziale invece di sparire.
2. Il normale cambio zona della magia precede le SBA. Prima, una transizione SBA
   successiva poteva ripristinare una copia precedente degli oggetti e riportare
   la carta magia nella zona pila nonostante la pila fosse vuota.
3. Un tipo di bersaglio sconosciuto è rifiutato anche se l'ID non è presente.
4. Le creature senza testo Oracle hanno una lista abilità vuota esplicita e
   vengono valutate correttamente nel percorso a tre carte.
5. Il controllo sulle fonti non fa più scomparire dalla vista il calcolo parziale:
   la diagnostica conserva la proiezione computata, distinta dal verdetto.
6. Il service worker viene registrato da entrambe le pagine d'ingresso; include
   tutti gli script effettivamente richiesti, conserva cache di altre app e
   restituisce errori offline comprensibili per risorse mai caricate.

La fixture della vecchia suite 5C è stata corretta aggiungendo l'oggetto carta
reale alla magia: nessuna asserzione è stata rimossa e il conteggio resta 2370.

## Verifiche concrete

Comandi dalla root del checkout (Node 24.22.1, Python 3.12.14):

| Comando | Risultato locale |
| --- | --- |
| `node question-planner.test.cjs` | 27/27 PASS |
| `node chapter-16-guided.test.cjs` | 20/20 PASS, protocollo con valutatore simulato |
| `node chapter-16-real-engine.test.cjs` | 39/39 PASS, Oracle e motore reali |
| `node beta-engine.test.cjs` | 17/17 PASS, danni, prevenzione, inneschi e zone reali |
| `node card-data.test.cjs` | 10/10 PASS, tutti i 128 shard, integrità, lookup e ruling |
| `node verify-tests.cjs` | 71/71 PASS |
| `node verify-groups-5h.cjs` | 2370/2370 PASS, nessun errore di esecuzione |
| `node scripts/verify-official-provenance.test.cjs` | 6/6 PASS |
| `python3 scripts/test-beta-browser.py` | 7 percorsi PASS in Chromium |
| `python3 scripts/test-chapter-16-browser.py` | 3 percorsi PASS in Chromium |

Totale suite Node: 2560 test. Le prove browser sono separate, non aggiunte al
conteggio dei test del motore. La prova beta avvia e interrompe un server isolato per verificare realmente
l’assenza della rete anche nei service worker. Per la prova del Capitolo 16
avviare prima `python3 -m http.server 8000 --bind 127.0.0.1`. Il primo tentativo di installabilità usava una
sessione privata (che Chromium non rende installabile): ripetuto con un profilo
persistente isolato, il CDP non riporta errori di installabilità.

Le prove beta non sostituiscono il motore o le risposte della rete con risultati
precalcolati: cercano le carte nel database effettivo e attraversano i moduli
reali. Il test separato di protocollo 16 dichiara esplicitamente la parte simulata.

## PWA e dispositivi

Chromium ha verificato manifest, icone 192/512, service worker e installabilità.
Sono passati flussi a viewport mobile con tocco, assenza di overflow orizzontale,
ricaricamento offline e recupero da interazioni non supportate. Offline funzionano
l'app shell, l'indice e le carte/ruling già caricati; non si promette che gli
shard mai scaricati siano disponibili senza connessione.

WebKit non eseguito: il runtime non è installato nell'ambiente. Non sono state
eseguite installazioni o prove su smartphone/tablet Android o iOS fisici. Safari
ha indicazioni di installazione nella UI, ma questo non equivale a una prova reale.

## Limiti e chiusura

Non sono supportate in generale protezione/ward, mana e costi arbitrari, scelte
modali, commander replacement, copie, combattimento, stack complessi o ogni
sostituzione/innesco Oracle. I moduli preesistenti restano disponibili per input
strutturati ma la loro presenza non equivale a interpretazione di qualsiasi carta.

I rami remoti pertinenti sono stati letti: `main`, `dev/groups-5f-5h`,
`feature/rules-engine-foundation`, `dev/chapter-16-question-planner`. I primi due
rami storici di sviluppo non hanno commit esterni alla storia già in main. Il
lavoro locale 16A/B è conservato nella storia del ramo beta.

Il workflow del ramo beta comprende regressioni, database, riproducibilità e
browser. I risultati CI remoti vanno attestati sul commit esatto, non dedotti dai
risultati locali o da run precedenti. Nessuna release o pubblicazione Pages è
stata avviata da questo lavoro.

## Traccia della validazione CI

- `4f206ff`: prima integrazione inviata solo al ramo di sviluppo. La run
  [43348443702](https://github.com/jiraya892/judge-pocket./actions/runs/43348443702)
  è fallita nella fase browser; non viene descritta come superata.
- `88b04c2`: il browser CI usa l'artefatto Playwright installato e le eccezioni
  vengono esposte come annotazioni pubbliche. La run
  [43348928363](https://github.com/jiraya892/judge-pocket./actions/runs/43348928363)
  ha reso leggibile il fallimento: il controllo offline riceveva una risposta
  dal server ancora acceso. Non era prova di funzionamento offline.
- `8290325`: il test usa ora un server isolato e lo arresta realmente durante
  la prova offline. Tutti i sette percorsi browser sono stati rieseguiti
  localmente con esito positivo. L'esito remoto viene attestato separatamente,
  dopo aver letto la run corrispondente.

I log completi GitHub richiedono login; sono state lette le pagine pubbliche delle
run/job e le annotazioni delle prove create dal workflow, senza estrarre token.
Nessuna esecuzione fallita è stata mascherata o sostituita da un test senza assert.
