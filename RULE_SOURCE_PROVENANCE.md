# Capitolo 11 — Provenienza dei riferimenti alle Comprehensive Rules

Il verificatore `local-rules-source.js` non contiene un corpus ufficiale preinstallato. Di conseguenza, **nessun riferimento è verificato nella PWA di produzione** finché non viene importato un corpus locale controllato. Questa è una scelta di sicurezza: il vecchio campo `verified: true` non è più una prova sufficiente.

Il caricamento richiede un'edizione datata, una dichiarazione di origine e un elenco di numeri e testi delle regole. `verify` controlla che il numero esista nel corpus caricato e che l'estratto compaia realmente nel testo locale. Questo controllo **non autentica crittograficamente** l'origine del corpus: metadati e contenuto possono essere falsificati da chi chiama `load`. Un futuro importatore deve confrontare la fonte con un file Wizards approvato e un digest fissato nella build prima di chiamare `load`.

I test dei gruppi 11E–11L usano un corpus **sintetico** con frasi dimostrative. Non sono prove che le regole 613.1 o 704.5 contengano quelle frasi e non devono essere mostrate come citazioni reali.

La diagnostica continua a presentare il risultato come parziale/non supportato, senza promuovere automaticamente un calcolo dei layer a verdetto.