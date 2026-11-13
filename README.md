# Judge Pocket — beta sperimentale

PWA per scegliere da due a quattro carte Magic e analizzare interazioni comprese in un
perimetro deterministico esplicito. Motore e interpretazione Oracle sono collegati
all'interfaccia; i casi non supportati vengono segnalati senza inventare risposte.

## Stato effettivo

Ricerca locale su 38.779 carte, testi Oracle e ruling dello snapshot fornito,
selezione di una carta aggiuntiva, spiegazioni con regole e funzionamento offline per
le carte già caricate. Supportati scenari ristretti di layer/dipendenze/SBA,
risoluzione di danni, indistruttibile, prevenzione e inneschi obbligatori di
entrata con guadagno vite. Nessuna eccezione per coppie di carte e nessuna API IA.

Il calcolo nel perimetro dichiarato è distinto dall'autenticazione normativa:
la UI mantiene il risultato parziale e non emette verdetti ufficialmente
certificati. Non è un interprete generale delle Comprehensive Rules.

[Perimetro, comandi, test e limiti verificati](BETA_SCOPE.md).
[Architettura dello scenario minimo](SCENARIO_MINIMO.md).
[Stato del lavoro 16A/B precedente alla beta](CHAPTER_16_PLAN.md).
[Progetto IA ibrida, modelli e stima dei costi](AI_HYBRID_ARCHITECTURE.md).

## Sviluppo e prove

Non serve una compilazione npm. Dalla root, avviare il server statico:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

La PWA usa `index.html` e `context.html`. Per le suite principali:

```sh
node question-planner.test.cjs
node chapter-16-guided.test.cjs
node chapter-16-real-engine.test.cjs
node beta-engine.test.cjs
node card-data.test.cjs
node verify-tests.cjs
node verify-groups-5h.cjs
node scripts/verify-official-provenance.test.cjs
```

Con Chromium e Playwright Python installati, eseguire anche
`scripts/test-beta-browser.py` (avvia un server isolato) e
`scripts/test-chapter-16-browser.py` (richiede il server già in esecuzione). Non equivalgono a prove su dispositivi fisici.

I dati browser si rigenerano con `scripts/build-card-database.py`; l'inventario
cache della PWA con `scripts/build-app-shell.py`. Gli archivi originali rimangono
inalterati. Il vecchio README è conservato in
[documentazione storica](docs/HISTORY_README_0.9.54.md).

Judge Pocket non è affiliata a Wizards of the Coast. Dati da snapshot Scryfall;
verificare condizioni d'uso, versione e fonte prima di affidarsi a un calcolo.
