# Capitolo 12 — Blocco 4: flusso di importazione

`JudgeRulesImportFlow.review` unisce controlli sull'URL, parsing di testo già estratto, numero minimo di regole, sezioni obbligatorie, presenza delle regole richieste, confronto delle edizioni e digest SHA-256. Un report strutturalmente valido è `readyForReview`, ma **non** è autenticato né automaticamente importabile.

`importReviewed` ripete i controlli di copertura e versione e richiede il manifest coerente e un pin indipendente, tramite `JudgeRulesAcquisition.commit`. I test utilizzano esclusivamente testi e digest sintetici.

**Limiti di sicurezza da risolvere prima della produzione:** non è presente un registro ufficiale di digest autenticati; il parser non scarica PDF/DOCX e non garantisce estrazione completa; i pin sono forniti dal chiamante e non sono verificati crittograficamente rispetto a Wizards. Le API legacy consentono caricamento locale non autenticato. Non presentare il corpus importato come ufficiale soltanto perché supera questi test.
