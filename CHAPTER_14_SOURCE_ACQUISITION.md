# Capitolo 14 — Blocco 1: acquisizione della fonte reale

**Fonte ufficiale verificata tramite pagina Wizards:** https://magic.wizards.com/en/rules . La pagina espone collegamenti PDF, DOCX e **TXT**; il TXT corrente osservato il 12 novembre 2026 è https://media.wizards.com/2026/downloads/MagicCompRules%2020261106.txt, intestato `effective as of November 6, 2026`. Questi URL non sono digest e non attestano una firma digitale del produttore.

`official-txt-acquisition.js` recupera prima la pagina ufficiale, individua un unico collegamento TXT assoluto al dominio `media.wizards.com`, e poi richiede il testo senza cookie e senza redirect, controllando URL di risposta, MIME e limiti di dimensione. La funzione è asincrona e richiede un `fetcher` (ad esempio `fetch.bind(window)`) in un ambiente che consenta CORS. **Non è stato ancora eseguito un download reale dalla PWA in CI**: i test coprono il rilevamento e il parser con fixture sintetiche. Il browser potrebbe bloccare l'accesso cross-origin: in tal caso il risultato resta non supportato.

Corretto il parser TXT: ignora indice e titoli di sezione, comincia dalle regole numerate e si ferma al glossario. Il TXT ufficiale può richiedere ulteriori verifiche di struttura e completezza. Il testo integrale non è stato copiato nel repository.

**Autenticazione:** un URL HTTPS scoperto sulla pagina ufficiale è un'evidenza di origine del trasporto, non una firma digitale. Nessun digest ufficiale è stato inventato; `authenticated:false` e `digestVerified:false` rimangono obbligatori. Non usare questi risultati per autorizzare un verdetto Judge.
