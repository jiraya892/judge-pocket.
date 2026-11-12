# Capitolo 12 — Blocco 3: controllo strutturale e versionamento

`corpus-coverage.js` controlla numero minimo di regole, identificatori duplicati o malformati, testo vuoto, sottoregole senza regola madre, sezioni e regole richieste. `compare` distingue regole aggiunte, rimosse e modificate tra due estrazioni.

`corpus-version-review.js` verifica date valide, ordinamento cronologico delle edizioni e regressioni di versione. La sua indicazione `readyForReview` significa **pronto per una revisione umana/indipendente**, non corpus completo o autenticato. Il risultato contiene sempre `authenticated:false`.

**Limiti:** un testo sintetico con numeri plausibili può superare i controlli strutturali. Senza un elenco ufficiale delle regole e un digest approvato indipendentemente, non è possibile garantire che l'estrazione sia completa, corretta o autentica. I test non utilizzano testi delle Comprehensive Rules reali.
