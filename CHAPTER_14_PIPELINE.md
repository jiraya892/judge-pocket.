# Capitolo 14 — Blocco 3: pipeline di acquisizione controllata

`JudgeOfficialAcquisitionPipeline.acquireAndReview(fetcher,expectedEdition,minimum)` concatena acquisizione HTTPS da pagina ufficiale, parser, controllo strutturale e calcolo SHA-256 **locale** del corpus estratto. Il digest locale serve a confrontare due acquisizioni; non è un digest firmato o pubblicato da Wizards. Il risultato è sempre `authenticated:false`, `officialDigestVerified:false`, `importable:false` e richiede revisione.

`JudgeAcquisitionHandoff` distingue i fallimenti potenzialmente dovuti a CORS e consiglia un'acquisizione controllata lato server, senza eseguire proxy non autorizzati né disabilitare CORS. Valida i campi di un report, ma non autentica il mittente e non autorizza importazioni.

**Limiti:** nessun test end-to-end con fetch reale dalla PWA, nessuna firma crittografica dell'editore, nessun pin ufficiale. Le 40 regressioni nuove coprono classificazione CORS e report non affidabili, non una prova di correttezza del documento completo. I verdetti restano non verificati.
