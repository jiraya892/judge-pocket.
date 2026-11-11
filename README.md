# Judge Pocket — beta PWA

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
