# Capitolo 15 — Blocco 2: audit controllato via GitHub Actions

Workflow manuale `.github/workflows/official-rules-audit.yml` limitato al ramo `dev/groups-5f-5h`, permessi `contents: read`, senza pubblicazione su Pages, senza commit e senza importazione. Esegue `node scripts/audit-official-txt.cjs` su runner GitHub, recuperando la pagina ufficiale Wizards e il collegamento TXT via HTTPS con host consentiti, senza redirect, timeout, limiti di dimensione e controllo MIME. Verifica intestazione, versione attesa `2026-11-06`, presenza delle regole campione, glossario e crediti, e produce `test-reports/official/diagnostic.json` come artifact temporaneo.

Il digest SHA-256 calcolato è **locale** e non prova l'autenticità del documento. I campi di fiducia restano falsi. Se versione o struttura differiscono, il workflow fallisce e pubblica solo la diagnostica.

**Stato:** workflow implementato ma **non ancora eseguito tramite workflow_dispatch**; non esiste un risultato di acquisizione reale verificato in GitHub Actions. I 40 nuovi test 15E–15H controllano la politica dei report sintetici, non la rete. Il prossimo passo è avviare manualmente il workflow e analizzarne il risultato; solo allora si potrà affermare che l'acquisizione reale sul runner funziona.
