# Descrizione della partita e contesto temporale

## Obiettivo di prodotto

L'utente descrive carte, situazione e domanda, scrivendo o dettando nell'app. Il sistema identifica gli oggetti Oracle, ricostruisce i fatti dichiarati e affida il calcolo al motore deterministico. Le Comprehensive Rules sono la specifica del comportamento del motore. Una discussione, un modello linguistico o una trascrizione non stabiliscono il ruling.

**La fase è un fatto opzionale fino a quando può cambiare l'esito.** Le fasi non sono un questionario obbligatorio. Un ingresso di Ashaya sotto Blood Moon si analizza come ingresso, applicazione degli effetti continui e controllo delle azioni basate sullo stato. Il risultato di questo ingresso è riferito al primo controllo SBA prima della priorità: non si afferma che nello stap venga concessa priorità o eseguito un controllo intermedio. L'assenza della fase non diventa implicitamente “prima fase principale”. Quando il tempo conta, si distinguono fase, sottofase, evento che la apre e giocatore a cui appartiene il turno.

## Primo blocco implementato

- Un testo iniziale unico e un pulsante di dettatura dentro `context.html`, con selezione manuale ancora disponibile.
- Ricerca dei nomi nel catalogo Oracle, corrispondenza più lunga e abbreviazioni prima della virgola. Un'abbreviazione con più versioni richiede una scelta: nello snapshot “Ashaya” identifica più carte. I nomi duplicati di due facce identiche non aggiungono falsa ambiguità.
- Estrazione di controllori, permanenti esplicitamente in campo, attaccante/bloccante, magia/bersaglio, ingresso, guadagno vita, totale di vite guadagnate nel turno e finestre temporali riconosciute. Un lancio già avvenuto e la domanda su cosa accada all'ingresso sono distinti dalla verifica del lancio.
- Conservazione del testo originale e delle evidenze. Clausole non interpretate, negazioni non gestite, quantità negative/intervalli non supportati, copie multiple e fatti contraddittori bloccano la conversione in scenario: non vengono eliminati.
- Collegamento al percorso esistente tramite uno stato tipizzato. L'utente non deve riempire i campi delle carte quando il testo è ricostruito; riceve solo le domande residue del pianificatore e la conferma del perimetro simulato.
- Distinzione tra coordinate del parlante (“tu/avversario”) e ruoli del motore (“attaccante/bloccante”, “lanciatore”). Per gli inneschi viene considerato il giocatore dell'evento, che può essere diverso dal giocatore attivo.
- Ingresso statico reale: campo stabile prima dell'ingresso, carta entrante con timestamp più recente, applicazione dei layer/P/T e stabilizzazione al primo controllo SBA dopo l'ingresso, prima della priorità. Si accettano solo i testi completamente riconosciuti; nessuna eccezione basata sui nomi.
- Inizio del mantenimento con abilità Oracle di guadagno vita fisso, obbligatorie o facoltative: osservazione degli inneschi, pila, passaggi di priorità e risoluzione tramite il motore reale. La scelta facoltativa viene chiesta solo se può cambiare il risultato.

Il nuovo testo iniziale è un **interprete con grammatica delimitata**, non un modello IA generale già installato. Non comprende ancora qualunque frase o pronuncia, non interpreta il contenuto di una pila arbitraria e non completa automaticamente le regole non implementate. Il riconoscimento usa il catalogo locale, con nomi inglesi e abbreviazioni verificabili; non effettua un'estrazione libera di nuovi nomi italiani da tutto il testo tramite un LLM. La ricerca manuale conserva l'aggiornamento Scryfall già implementato.

## Fasi e sottofasi

`turn-structure.js` rappresenta l'intero ordine ordinario del turno: cinque fasi e tredici finestre contando la sottofase condizionale del primo danno. Le fasi principali sono finestre senza sottofasi, non sottofasi inventate.

| Fase | Finestre |
|---|---|
| Iniziale | Stap, mantenimento, pesca |
| Principale precombattimento | Prima fase principale, senza sottofasi |
| Combattimento | Inizio, dichiarazione attaccanti, dichiarazione bloccanti, primo danno condizionale, danno normale, fine |
| Principale postcombattimento | Seconda fase principale, senza sottofasi |
| Finale | Sottofase finale, cancellazione |

Il modello esplicita le condizioni per saltare la pesca, saltare blocchi/danni quando non ci sono attaccanti, creare il primo danno e ripetere la cancellazione. Una condizione sconosciuta non diventa automaticamente falsa. Modifiche non previste del turno vengono rifiutate.

Le azioni sono coordinate in un ordine esplicito: fase fuori/fase dentro, controllo giorno/notte, stap; pesca; eventuale scelta del difensore nelle varianti, dichiarazioni; assegnazione e danno; scarto fino alla mano massima e rimozione danni/fine degli effetti simultanee in cancellazione. Le chiusure prevedono scadenza degli effetti e svuotamento delle riserve di mana; alla fine del combattimento vengono rimossi gli oggetti dal combattimento. Stap non apre priorità; la cancellazione può aprire la finestra eccezionale prevista da CR 514.3a.

**Questo coordinatore non è un simulatore completo di ogni azione di turno.** Gli esecutori vengono forniti dagli adapter del motore. Se un'azione o un controllo non ha un adapter completamente verificato, l'avanzamento si ferma; uno stato `partial` non apre priorità. Sono codificati ordine, obblighi e punti di collegamento, non tutte le meccaniche possibili di phasing, giorno/notte, pesca, scarto o turni aggiuntivi. Il combattimento singolo usa il modello per scegliere le finestre di danno; il nuovo percorso di mantenimento esegue la propria catena effettiva tramite la pila.

Le finestre temporali lette dal testo vengono conservate senza essere richieste quando irrilevanti. Un evento incompatibile con una fase esplicitamente dichiarata viene segnalato. L'inizio del mantenimento non è dedotto dalla sola frase “sono nel mantenimento”. Il combattimento a partire dal secondo danno con attacco improvviso/doppio attacco richiede ancora il collegamento allo stato dopo il primo danno, e non viene simulato ripetendo per ipotesi il primo danno.

## Dettatura

La funzione usa `SpeechRecognition`/`webkitSpeechRecognition` del browser, avviata dal tocco dell'utente, in italiano. Il browser può usare un proprio servizio remoto; non viene dichiarata trascrizione locale. Il testo è mostrato e modificabile prima dell'analisi. Se il servizio non è disponibile o il microfono è negato, rimangono scrittura e dettatura della tastiera del telefono. La dettatura non avvia automaticamente il calcolo; gli eventi tardivi di una sessione finita vengono ignorati.

Nessun modello linguistico è stato scaricato, nessuna API IA a pagamento è stata aggiunta. Un futuro interprete linguistico potrà sostituire il parser di ingresso dopo validazione di schema, copertura delle frasi, nomi Oracle e fatti. Non riceverà il compito di inventare il risultato del motore. Servono ancora la scelta/integrazione di tale modello e prove su vere descrizioni vocali e dispositivi mobili.

## Verifiche

```sh
node scene-intake.test.cjs
node turn-structure.test.cjs
python3 scripts/test-scene-intake-browser.py
```

Il primo test usa Oracle reale e motore reale: verifica anche l'ingresso Ashaya/Blood Moon in tutte le tredici finestre con lo stesso risultato e nessuna domanda temporale. Per un innesco “your end step” il giocatore attivo può essere necessario; per “each end step” la domanda viene soppressa se irrilevante. Le scelte facoltative non sono assunte.

Le prove Chromium verificano testo → eventuale disambiguazione → ingresso → SBA, modifica della descrizione, conservazione di una fase irrilevante, mantenimento reale, blocco delle clausole non interpretate, protezione dalle risposte tardive quando si cambia modalità, consegna vocale simulata ed errore di autorizzazione simulato. **Non sono prove di accuratezza su audio reale o microfoni Android/iOS.**

Il riferimento CR consultato per questo blocco è la copia del 17 aprile 2026 già registrata in `case-studies/forty-cr-review.json`; gli estratti aggiuntivi sono in `case-studies/scene-turn-cr-review.json`. L'autenticazione verso l'ultima pubblicazione Wizards non viene dichiarata e il gate delle fonti rimane invariato. Risultati e impronte dei sorgenti: `test-reports/scene-intake/results.json`.

## Lavoro successivo

Comporre la stabilizzazione continua con tutti gli eventi/inneschi rilevanti; collegare gli esecutori delle restanti azioni del turno; gestire stato di pila, costi, scelte, bersagli e cronologia realmente necessari. Integrare poi l'interprete linguistico generale e provarlo su descrizioni reali italiane/inglesi, mantenendo il motore come fonte delle decisioni. Ogni nuova famiglia di meccaniche richiede casi da Oracle/ruling/CR e regressioni: aggiungere il testo del regolamento non equivale a implementarne la semantica.

Verifica del blocco: 29/29 controlli di descrizione/ingresso/fatti temporali, 16/16 di struttura del turno e 8 percorsi Chromium nuovi. Regressioni: 2.370/2.370 test di gruppo e 71/71 core, oltre alle altre suite applicative registrate nel rapporto.
