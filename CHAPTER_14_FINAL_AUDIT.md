# Capitolo 14 — Blocco 4: audit finale

Aggiunto `JudgeAcquisitionReportSeal`: convalida i campi conservativi di un report di acquisizione, calcola un fingerprint SHA-256 deterministico e confronta report. **Il fingerprint non è una firma digitale**, non autentica il produttore né protegge da un chiamante che modifica contemporaneamente il report e il fingerprint.

40 nuovi test (14M–14P) coprono URL manipolati, false attestazioni, digest locali alterati e confronto di report. I test end-to-end con fetch reale nel browser e l'autenticazione indipendente della provenienza **non sono stati completati**. Le simulazioni esistenti coprono i singoli componenti; non costituiscono un collaudo end-to-end completo.

Limiti residui: CORS del sito Wizards da verificare nel browser PWA, parser e copertura strutturale da confrontare integralmente con un corpus reale, nessun digest firmato ufficiale o pin indipendente approvato, nessun verdetto Judge verificato. Le API di importazione legacy non sono una root of trust. Il ramo pubblico main non va modificato senza autorizzazione.
