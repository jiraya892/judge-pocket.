# Capitolo 15 — Blocco 4: provenienza e integrità

L'audit GitHub Actions #3 del commit 74e48c6 ha acquisito un TXT dalla pagina Wizards: edizione 2026-11-06, 3182 regole, glossario e crediti presenti, nessuna regola fondamentale mancante. Il report resta `review-required`.

## Confini della prova

Un digest SHA-256 calcolato localmente prova l'identità dei byte **solo rispetto a un digest atteso ottenuto in modo indipendente e autenticato**. Un URL su media.wizards.com e HTTPS non costituiscono, da soli, una firma del publisher. Anche un JSON che dichiara `verificationMethod: independent-publisher-signed-digest` non costituisce prova crittografica.

`scripts/verify-official-provenance.cjs` controlla la coerenza di edizione, URL, copertura e digest rispetto a un documento di evidenza fornito separatamente, ma **non valida firme digitali**. Di conseguenza mantiene sempre `authenticated=false`, `officialDigestVerified=false` e `importable=false`. Fallisce in modalità chiusa, anche con evidenza apparentemente coerente. Non collegare questo script all'abilitazione di ruling verificati.

Test isolati: `node scripts/verify-official-provenance.test.cjs`. Non sostituiscono i 2370 test browser e i 71 core, da rieseguire e attestare sul commit finale prima di dichiarare regressione superata.

## Condizioni per una futura promozione

Occorrono un canale indipendente di pubblicazione del digest o una firma verificabile, una chiave del publisher autenticata tramite canale affidabile, verifica crittografica dei byte effettivamente scaricati, controllo edizione e provenienza, e test negativi su chiave, digest, URL e contenuto alterati. Fino ad allora nessuna importazione automatica come fonte autenticata.
