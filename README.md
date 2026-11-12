# Judge Pocket — beta PWA

**Obiettivo architetturale aggiornato:** risolvere una specifica interazione tra carte con uno scenario minimo sufficiente, non simulare l'intera partita. Vedi [SCENARIO_MINIMO.md](./SCENARIO_MINIMO.md). La migrazione dei vecchi moduli non è ancora completa.


Prototipo mobile per consultare le carte di **Magic: The Gathering**, i loro testi Oracle, i rulings di Scryfall e analizzare alcune interazioni senza chiamare modelli di intelligenza artificiale.

## Come funziona oggi

- Ricerca carte per nome su Scryfall e visualizza testo Oracle e rulings.
- Accetta una fotografia come riferimento visivo: **non riconosce ancora automaticamente le carte nella foto**.
- Permette di selezionare più carte, comprese più copie della stessa carta.
- `engine.js`: riconosce alcune meccaniche dal testo Oracle (non dai nomi delle carte) e restituisce spiegazioni condizionali.
- `rules-core.js`: modello parziale dello stato della partita, zone, identità degli oggetti, eventi, ordini alternativi di sostituzione, inneschi semplici, pila con priorità semplificata e alcune azioni basate sullo stato.
- `simulator-ui.js`: piccola simulazione *ipotetica*, con un evento alla volta (creazione pedine, collocazione segnalini +1/+1, entrata sul campo).
- `rules-tests.html`: **15 test di regressione** eseguibili direttamente in browser.

## Attenzione: non è un giudice automatico completo

Una fotografia delle carte non basta a identificare giocatori, controllori, zone, bersagli, ordine degli eventi o effetti già applicati. Le simulazioni assumono una configurazione esplicita e possono soltanto indicare conseguenze **se** le condizioni sono soddisfatte. La parte generica di parsing Oracle riconosce pochi pattern; non è un interprete universale delle Comprehensive Rules. La pila può rappresentare oggetti, ma non risolve ancora automaticamente magie e abilità arbitrarie.

La lettura dei rulings di Scryfall non implica che un ruling specifico confermi ogni combinazione delle carte selezionate.

## Copertura e limiti

Vedi [COVERAGE.md](./COVERAGE.md). Fonte normativa di riferimento: [Magic Comprehensive Rules — Wizards of the Coast](https://magic.wizards.com/en/rules). Controllare sempre le revisioni del regolamento.

## Prove senza computer

Quando GitHub Pages sarà attivo, aprire `rules-tests.html` per vedere il risultato dei test nel browser. La pubblicazione tramite GitHub Pages **non è ancora verificata** da questo progetto.

## Struttura

- `index.html` — pagina PWA
- `app.js` — selezione e ruling delle carte
- `engine.js` — riconoscimento preliminare di meccaniche Oracle
- `rules-core.js` — stato e regole deterministiche parziali
- `simulator-ui.js` — UI della simulazione guidata
- `rules-tests.js`, `rules-tests.html` — test di regressione
- `sw.js` — cache PWA
- `manifest.webmanifest` — manifest

Judge Pocket non è affiliato a Wizards of the Coast. Dati carte/rulings da Scryfall; per le condizioni d'uso del contenuto consultare le rispettive fonti.
\n## Gruppo 4 (0.9.29)\n\n`trigger-engine.js` espone inneschi dichiarativi per eventi espliciti, condizioni intervening-if, snapshot prima/dopo per last known information, inneschi ritardati una tantum e ordinamento APNAP multiplayer. Gli effetti non vengono risolti automaticamente e il parser Oracle non copre ancora tutte le abilità. Test: `group-4-tests.html`.\n

## Capitolo 5 — stato del ramo di sviluppo (2026-11-12)

Il ramo `dev/groups-5f-5h` include una pipeline deterministica **parziale** per pila, bersagli, risoluzione di eventi strutturati, transizioni di zona, sostituzioni, inneschi e SBA locali. Il registro della diagnostica browser `group-4-tests.html` è stato aggiornato a **452 test di gruppo**, con altri **71 test core** eseguiti in CI. I risultati definitivi sono attestati soltanto dal report `test-reports/latest/summary.md` per il commit esatto.

Per il contratto di scenario minimo consultare `SCENARIO_MINIMO.md`; per le lacune critiche e i criteri di chiusura consultare `AUDIT_CAPITOLO_5.md`. La diagnostica automatica Node non prova il comportamento effettivo di Android, il service worker offline, il flusso completo Oracle → domande → verdetto o la copertura di tutte le Comprehensive Rules. Non trasferire queste modifiche a `main` senza un rilascio esplicito.
