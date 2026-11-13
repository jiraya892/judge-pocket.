# Ricerca pubblica, suggerimenti e OCR — 13 novembre 2026

Ramo `dev/media-case-intake`. Nessuna pubblicazione o modifica a main.

## Nuova ricerca

Ricerca pubblica effettuata nel tracker di XMage usando i termini “interaction”
e “replacement”. Sono stati recuperati i post collegati e provati cinque contesti
ristretti con il motore reale, Oracle locale e il probe con controllo di integrità:

| Discussione | Contesto provato | Esito attuale |
| --- | --- | --- |
| [14357](https://github.com/magefree/mage/issues/14357) | Alpine Moon / Ancient Tomb | Unsupported |
| [12475](https://github.com/magefree/mage/issues/12475) | Urza's Saga / Echoing Deeps | Unsupported |
| [9125](https://github.com/magefree/mage/issues/9125) | Gond Gate / ingresso di Azorius Guildgate | Unsupported |
| [7832](https://github.com/magefree/mage/issues/7832) | Burrenton Forge-Tender / Soul-Scar Mage | Unsupported |
| [3515](https://github.com/magefree/mage/issues/3515) | Blind Obedience / ingresso di Xenagos | Unsupported |

Non sono ruling verificati né riproduzioni di ogni dettaglio dei post: sono
prove di capacità su contesti costruiti dalla discussione. Per Gond Gate la
seconda carta è un rappresentante scelto per il test. Risultati e motivi sono in
`search-batch-results.json`. Il test `scripts/test-search-batch.cjs` registra
questi cinque limiti, senza farli passare per interazioni risolte.

Servono ulteriori blocchi del motore per scelte dei nomi/tipi di terra, copie e
ingressi di terre, sostituzioni/prevenzione e devozione durante l'ingresso. Non
sono state introdotte eccezioni per coppie di carte per aggirare questi limiti.

## Inserimento dei nomi

La ricerca locale ora dà priorità a nome esatto, prefisso e sottostringa; accetta
più parole parziali e un refuso di una lettera nel primo nome quando non ci sono
corrispondenze dirette. Verificati `Blood` → `Blood Moon`, `Ashaia` → `Ashaya,
Soul of the Wild` e `Soul Wild` → la stessa carta. I risultati restano proposte
selezionabili: una digitazione ambigua non viene trasformata in una carta scelta.

## Fotografia

Il vecchio percorso dipendeva da `TextDetector`, spesso assente, e richiedeva un
pulsante aggiuntivo. La scelta di una foto avvia ora la lettura locale, usando
Tesseract.js quando il rilevatore nativo non restituisce testo. I dati sono
inclusi in `vendor/ocr`: circa 9,6 MiB, versioni, hash e licenze nel manifest.
Nessuna API commerciale o caricamento dell'immagine a un server.

Un nome univoco viene proposto automaticamente nel primo campo vuoto, mantenuto
modificabile. I campi già compilati non vengono sovrascritti. Se i candidati sono
ambigui, si chiede di sceglierne uno; l'analisi parte solo premendo Continua.
I job di foto superate non possono aggiornare una selezione più recente.
Le immagini sono ridimensionate prima del worker per limitare il carico.

Il test browser esegue il **vero OCR WASM**, senza sostituire il riconoscitore,
su immagini generate con i titoli inglesi Blood Moon e Ashaya. Verifica anche
l'inserimento nel primo e nel secondo campo e la conservazione del primo nome.
Questo non misura l'accuratezza su fotografie reali, riflessi, carte inclinate,
titoli italiani o dispositivi Android/iOS fisici. Non è riconoscimento dell'art
della carta. Queste verifiche restano da effettuare su foto reali.

## Verifiche effettive

Comandi, risultati e hash dei file verificati sono in
[`test-reports/search-photo/results.json`](../test-reports/search-photo/results.json).
Tutti i comandi registrati sono terminati con codice zero:

- dati e ricerca: 13 test;
- nuovi limiti di capacità: 5 probe reali;
- browser ricerca/OCR: 4 controlli, con vero OCR e immagini sintetiche;
- precedenti browser: 25 percorsi (comprese le prove di protocollo simulate dichiarate);
- regressioni: 2370 gruppi, 71 core, 27 planner, 20 protocollo, 39 integrazione
  reale, 19 beta, 16 bersagli, 50 reel, 16 discussioni, 5 presentazione, 6 provenienza;
- strumenti di ricerca: 30 test Python e 3 probe.

App shell rigenerata: 96 risorse, incluse le dipendenze del worker e i dati OCR
per la cache locale. Verificati installabilità Chromium e offline con origine
spenta nella suite beta. WebKit non installato. GitHub Actions aggiornato per
eseguire i nuovi test, ma non eseguito sul commit locale: nessun push/deployment.
