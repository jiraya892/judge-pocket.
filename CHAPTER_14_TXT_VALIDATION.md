# Capitolo 14 — Blocco 2: collaudo della fonte TXT

La pagina ufficiale https://magic.wizards.com/en/rules collega il documento TXT https://media.wizards.com/2026/downloads/MagicCompRules%2020261106.txt, intestato `effective as of November 6, 2026`. Ho verificato pubblicamente che il documento è accessibile come testo e include regole numerate, glossario e crediti. Non ho scaricato il file con il runtime GitHub né dimostrato che la PWA possa leggerlo in presenza delle restrizioni CORS.

`official-txt-validation.js` aggiunge verifiche conservative su intestazione, data, conteggio minimo, ordine delle sezioni, presenza di regole campione (100.1, 101.1, 613.1, 614.1, 615.1, 704.1, 903.1), glossario e crediti. Non equivale a un confronto completo con un indice ufficiale firmato. I test usano esclusivamente esempi sintetici.

`official-txt-acquisition.js` intercetta gli errori di rete, CORS e lettura del corpo. Se l'acquisizione fallisce, non esegue importazioni implicite. Nessun digest ufficiale o attestazione crittografica è stato aggiunto. La fonte rimane `authenticated:false` e `digestVerified:false`; i verdetti Judge restano non verificati.

**Prossimi passi:** collaudare la fetch reale in un ambiente che permetta CORS, confrontare l'estrazione completa con il TXT corrente e progettare una pipeline di acquisizione server-side controllata se il browser non può leggere il sito ufficiale.
