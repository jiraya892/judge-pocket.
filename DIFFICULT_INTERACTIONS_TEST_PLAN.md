> Aggiornamento: il piano storico sotto non descrive lo stato attuale di tutti i
> moduli. Per candidati estratti dai dati, casi riprodotti, implementazione e prove
> aggiornate consultare [case-studies/README.md](case-studies/README.md). La sola
> presenza di un modulo non attesta copertura generale.

# Casi difficili — piano di verifica Pocket Judge

Questi casi sono **specifiche di regressione**, non test superati. Ogni caso richiede stato iniziale, ordine degli eventi e risultato atteso verificato contro le Comprehensive Rules correnti e i ruling ufficiali. Non usare una risposta generata dall'IA come unico oracolo.

| ID | Scenario | Meccanismi | Stato motore 2026-11-12 |
|---|---|---|---|
| LAYER-001 | Ashaya, Soul of the Wild e Blood Moon, distinguendo ordine di entrata e segnalini | effetti continui, dipendenze, layer, azioni basate sullo stato | NON SUPPORTATO: manca il motore dei layer |
| PREV-001 | Teferi's Protection: danno contro perdita di punti vita | protezione, prevenzione, vita | NON SUPPORTATO: manca la prevenzione generale |
| PREV-002 | Solemnity e Nine Lives: prevenzione del danno e segnalini | sostituzione, prevenzione, segnalini | NON SUPPORTATO: effetti non implementati |
| LAYER-002 | Humility e Opalescence con timestamp differenti | layer, dipendenze, forza/costituzione | NON SUPPORTATO: manca il motore dei layer |
| STACK-001 | Due abilità innescate controllate da giocatori diversi | pila, APNAP, priorità | PARZIALE: ordinamento testato; risoluzione manuale |
| ZONE-001 | Una creatura cambia zona e viene bersagliata tramite il vecchio ID | identità oggetti, legalità bersagli | PARZIALE: test presente |

## Protocollo obbligatorio

1. Registrare testo Oracle e versione del regolamento consultati, più URL e data del ruling quando disponibile.
2. Esplicitare zone, controllori, ordine di entrata, segnalini, priorità e scelte rilevanti; se mancano informazioni, formulare varianti o chiedere chiarimenti.
3. Preparare il risultato atteso con una fonte indipendente dal codice e dall'IA che propone la modifica.
4. Eseguire un test ripetibile sul motore: PASS, FAIL oppure UNSUPPORTED. Non confondere una risposta testuale con una simulazione verificata.
5. Salvare i casi risolti nella suite di regressione. Non dichiarare il motore affidabile in base al numero di esempi superati.

## Sequenza tecnica

- Consolidare i test di stato, zone, identità, trigger e priorità.
- Introdurre rappresentazione strutturata di abilità ed effetti, con segnalazione esplicita di meccaniche sconosciute.
- Implementare layer e dipendenze prima di tentare LAYER-001 o LAYER-002.
- Aggiungere prevenzione e modificatori di danno prima di PREV-001 o PREV-002.
- Integrare domande in linguaggio naturale tramite API lato server, senza esporre chiavi nel client e senza presentare risposte non verificate come sentenze definitive.
