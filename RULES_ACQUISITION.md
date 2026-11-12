# Capitolo 12 — Blocco 2: acquisizione e parsing

**Fonte ufficiale di riferimento:** https://magic.wizards.com/en/rules (pagina Wizards of the Coast con i collegamenti alle Comprehensive Rules PDF e DOCX). Il modulo riconosce esclusivamente indirizzi HTTPS sotto `magic.wizards.com` o `media.wizards.com` con estensioni `.pdf`, `.docx` o `.txt`. Questo è un controllo di ammissibilità del percorso, **non prova di autenticità del documento**.

`JudgeRulesTextParser.parse` accetta **solo testo già estratto** e verifica intestazione, data di efficacia, numeri di regola, duplicati, limite di dimensione e numero minimo di regole. Non è un lettore binario PDF/DOCX, non scarica documenti, non converte impaginazioni complesse e non certifica la completezza del testo. Le righe del glossario e le tabelle possono richiedere un parser specifico prima dell'uso in produzione.

`JudgeRulesAcquisition.prepare` restituisce un digest SHA-256 deterministico e contrassegna il materiale come `not-authenticated`, `importable:false`. `commit` richiede un manifest coerente e un elenco di pin revisionati indipendentemente; senza un pin affidabile l'importazione viene rifiutata. Nessun digest ufficiale è stato inventato o inserito nel repository.

I test usano **testo sintetico**, non una copia ufficiale delle regole. Per un'importazione reale serviranno: recupero verificabile del file ufficiale, estrazione affidabile PDF/DOCX, revisione della versione e approvazione indipendente del digest.