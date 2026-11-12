# Capitolo 13 — Blocco 4: audit di sicurezza

Corrette due false attestazioni: `explanation-view.js` poteva promuovere flag diagnostici e testo locale non autenticato a `verified`; `guided-trust-gate.js` poteva fidarsi di flag dello stato della fonte senza prova crittografica. Ora entrambi i percorsi restano conservativi. Aggiornati i test legacy 11P e aggiunti 40 test 13M–13P.

Limiti residui: nessun corpus o digest ufficiale autenticato; API legacy locali (`JudgeLocalRulesSource.load`, `JudgeOutcomeTrust.classify`, `JudgeEvidenceLedger`) ancora utilizzabili come diagnostica, non come prova di autenticità. La barriera copre la UI guidata, non client JavaScript modificati o tutte le API sperimentali. I test software non dimostrano completezza delle regole né correttezza universale dei ruling.
