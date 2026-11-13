# Aggiornamenti automatici delle fonti

## Carte e ruling

`card-refresh.js`, collegato al percorso guidato, consulta Scryfall per le carte effettivamente cercate. Ogni carta e lista di ruling viene ricontrollata dopo 24 ore; i suggerimenti di ricerca online dopo sei ore. La ricerca mostra subito i risultati locali e poi aggiunge quelli online, anche per nomi assenti dal database iniziale. Non serve inserire manualmente una nuova espansione.

I dati consultati sono conservati in Cache Storage, separatamente dall'app shell e per percorso dell'app. Restano disponibili dopo la chiusura e offline, nei browser che consentono questa memoria. In caso di quota esaurita o modalità privata rimangono il database incluso e una cache in memoria. Non viene scaricato automaticamente l'intero catalogo sul telefono: offline il catalogo completo rimane quello della build, più le carte e le ricerche già memorizzate. Il riconoscitore fotografico conserva il proprio indice locale: questo intervento aggiorna ricerca e consultazione Oracle, non addestra un nuovo riconoscitore.

Le richieste sono deduplicate, distanziate di 150 ms e interrotte dopo due secondi. Un errore conserva la copia precedente o usa il database locale; una pausa evita richieste ripetute dopo un errore e rispetta `Retry-After` numerico sui 429. Le fonti visualizzate distinguono copia Scryfall aggiornata, copia scaduta e database locale. Non vengono sostituiti il motore o le sue regole di supporto: un nuovo testo Oracle con abilità non implementate produce `unsupported`.

## Comprehensive Rules

`.github/workflows/source-data-updates.yml` predispone un controllo giornaliero. Il job:

1. Recupera `https://magic.wizards.com/en/rules` e individua un collegamento TXT univoco su `media.wizards.com`.
2. Controlla origine HTTPS, assenza di redirect, dimensione, intestazione, data reale, regole duplicate, ancore dei capitoli, glossario e crediti.
3. Confronta il testo, regola per regola, con l'ultima acquisizione riuscita: aggiunte, rimozioni, modifiche.
4. Conserva candidato completo e rapporto come artifact di GitHub Actions. Una cache conserva il confronto fra esecuzioni; se viene eliminata, il rapporto riparte esplicitamente da una prima osservazione.
5. Lascia invariati corpus attivo, pin di provenienza e codice del motore. Un errore o un'edizione più vecchia non sovrascrivono il candidato precedente.

Il file nuovo è un **candidato di aggiornamento**, non una prova che il motore abbia imparato le nuove regole. Il job non applica automaticamente cambiamenti alla logica e non promuove mai una fonte a `authenticated` o `importable`. I controlli preesistenti di provenienza rimangono attivi. Le modifiche alle regole devono essere valutate e collegate ai test e alle implementazioni interessate; uno stesso numero CR può avere cambiato significato.

## Stato di attivazione

Il codice è nel ramo di sviluppo; questo intervento non esegue push, merge, deploy o release. L'app pubblicata non cambia finché queste modifiche non vengono pubblicate con autorizzazione.

Gli aggiornamenti delle carte funzionano all'uso nella versione con questo codice. Il monitor pianificato può iniziare solo dopo che il workflow sarà nel ramo predefinito del repository e GitHub Actions sarà abilitato: i workflow pianificati non partono da un semplice branch di sviluppo. Il monitor non scrive su `main` e dispone solo di `contents: read`.

La rete dell'ambiente cloud attuale consente `api.scryfall.com`, ma blocca `magic.wizards.com` e `media.wizards.com`. Il tentativo reale è riportato nei risultati. Per riprovare l'acquisizione ufficiale qui occorre consentire questi due domini nelle impostazioni dell'ambiente; la policy di GitHub Actions è separata. Nessun digest o risultato di acquisizione ufficiale viene inventato.

## Verifiche riproducibili

```sh
node card-refresh.test.cjs
python3 scripts/test_rules_updates.py
python3 scripts/test-source-updates-browser.py
python3 scripts/check-rules-update.py
```

I primi due comandi verificano cache, aggiornamento dopo scadenza, errori, dati invalidi, limite delle richieste e differenze fra edizioni con trasporti/strutture sintetiche. Il test Chromium usa testi Oracle reali del database come risposte HTTP controllate, rimuove una carta dall'indice incluso per simulare una nuova carta, quindi verifica il calcolo reale e la persistenza offline. Una fixture Oracle deliberatamente modificata verifica che un'abilità nuova non venga ignorata: non è presentata come una vera modifica pubblicata da Scryfall.

Il parser/confronto è stato eseguito anche sulla copia CR del 17 aprile 2026 già acquisita: 3.138 regole riconosciute, senza dichiararla acquisizione ufficiale corrente. Il quarto comando richiede accesso a Wizards e qui termina con il blocco di rete HTTP 403.

Le regressioni degli scenari fissano il database Oracle locale e rifiutano gli aggiornamenti HTTP di sfondo: rimangono riproducibili mentre i test separati verificano il nuovo aggiornamento. I test delle domande attendono esplicitamente il cambio della domanda asincrona. Dettagli ed esiti in [test-reports/source-updates/results.json](test-reports/source-updates/results.json).
