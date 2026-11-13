# Capitolo 16A/B — stato verificato il 2026-11-13

Ramo: `dev/chapter-16-question-planner`. Base ricevuta:
`fd9262b79137fe55e1ca84da13e219bd5143aa38`.

Il pianificatore è collegato al percorso guidato e dispone di un valutatore
reale per un **perimetro statico ristretto**. La prova Ashaya + Blood Moon usa
Oracle del database fornito e i moduli reali, comprese SBA e ricalcolo dopo
l'uscita della fonte. Questo non equivale a supportare qualunque interazione.

**16A/16B non sono dichiarati conclusi come prodotto capace di emettere verdetti
verificati:** il confine preesistente sulle fonti continua a negare
l'autenticazione delle regole, e la nuova revisione non ha esecuzioni CI remote.
Il risultato mostrato resta `partial`, con il limite spiegato esplicitamente.
Non sono stati modificati main, la configurazione dell'ambiente o il Capitolo
16C. Commit soltanto locali, nessun push o pubblicazione.

## Pianificatore e protocollo guidato

`question-planner.js` richiede `supported: true` e `status: verified` per ogni
scenario necessario, senza avvisi o fatti mancanti. Un risultato parziale non
può eliminare domande. Il confronto canonico non dipende dall'ordine delle chiavi;
le serializzazioni che perderebbero informazioni vengono rifiutate. Risposte
fuori dominio e dati non validi producono `unsupported`; il valutatore non può
mutare gli input del planner. Il limite rimane 512 scenari.

`guided-bridge.js` enumera controllori e permutazioni dell'ordine. Conserva le
risposte parziali e propone solo domande i cui valori cambiano gli esiti, a parità
degli altri fatti. Un ordine parziale non viene completato arbitrariamente dalla
UI. Gli errori del colloquio non lasciano una pagina vuota e le risposte asincrone
obsolete non possono sovrascrivere uno scenario riavviato.

Gli altri permanenti e gli effetti arbitrari hanno un dominio aperto: non vengono
enumerati come se fossero assenti. Il confine dello scenario è una conferma
esplicita dell'utente: soltanto le carte indicate, scoperte e non pedina, nessuna
designata come comandante, senza altri effetti, segnalini o danni. Il planner
calcola alternative sotto questa ipotesi, ma non mostra un risultato prima della
conferma. Una risposta negativa resta un contesto aperto, non una conferma di
assenza. Per ora la UI gestisce al massimo tre carte e due controllori astratti.

## Valutatore reale e limite di affidabilità

`scenario-stabilizer.js`, collegato a `JudgeCoordinator.evaluateScenario`, compone
primitive supportate di `JudgeUnifiedLayer4`, `JudgePTLayers` e
`JudgeLocalSBA.stabilizeBatch`. Non usa né promuove gli esiti parziali del percorso
legacy `JudgeCoordinator.evaluate` / `JudgeUnifiedContinuous`.

Supporta effetti statici riconosciuti che aggiungono tipi di terra alle creature
non pedina controllate dalla fonte, effetti che impostano sottotipi delle terre
non base, P/T numerica o definita dal numero di terre, e morti per costituzione
non positiva. Dopo ogni batch SBA riparte dalle caratteristiche stampate dei
permanenti rimasti, rigenera gli effetti delle fonti ancora presenti e ripete
fino al punto fisso (al massimo N+1 valutazioni).

Il risultato `verified` del valutatore significa completo **nel perimetro
esplicitamente dichiarato**, non autenticazione della fonte normativa. Il bridge
usa questo risultato per pianificare, poi mantiene separato il confine sulle
fonti: l'output presentato è `partial` e non contiene un verdetto definitivo.
I test verificano entrambe le condizioni, senza nascondere un risultato parziale
dietro un cambio di etichetta.

Vengono rifiutati effetti opachi, modificatori non implementati, altre zone/eventi,
fonti già di tipo terra (dipendenze di generazione non verificate in questo
perimetro), pedine, comandanti, assegnazioni, segnalini, danni e altri casi fuori
perimetro. Una SBA diversa da quelle verificate non è ignorata. Il lancio e
l'ingresso di carte restano esplicitamente `unsupported` nella UI guidata.

## Prova obbligatoria: Ashaya + Blood Moon

`chapter-16-real-engine.test.cjs` legge i record da
`oracle-cards-part-*.jsonl.gz`. Sostituisce soltanto il trasporto Scryfall; non
sostituisce riconoscimento, fatti, layer, dipendenze, P/T, SBA o pianificatore.

Il riconoscitore è stato corretto per il reminder text (CR 207.2a), i nomi
abbreviati negli autoriferimenti e le espressioni regolari di sottotipi e P/T.
Nessuna eccezione per nomi o coppie specifiche nell'implementazione.

Nelle otto combinazioni di controllori e ordine di ingresso, i test verificano:

1. L'effetto che aggiunge Forest precede quello che imposta Mountain, tramite
   dipendenza e non tramite un ordine codificato per quelle carte.
2. Le abilità da rules text scompaiono; resta l'abilità intrinseca di mana rosso
   (CR 305.7). La definizione P/T non è più attiva; con valori stampati `*/*`
   la base diventa 0/0 (CR 208.5).
3. Le SBA spostano la creatura nel cimitero per costituzione zero (CR 704.5f).
4. L'effetto della fonte scomparsa viene rimosso e il campo viene ricalcolato.
   Una terza creatura generica torna a non essere una terra.
5. Il planner ottiene esiti identici e non chiede controllori o ordine. Chiede
   solo di confermare il confine dello scenario.
6. La UI espone il calcolo come parziale rispetto alle evidenze, senza verdetto
   definitivo: il blocco preesistente sulle fonti non viene aggirato.

Altri test rinominano gli oggetti, escludono proprietà non supportate e fanno
fallire deliberatamente il percorso legacy: il valutatore completo ristretto
continua a funzionare senza usare risultati parziali.

## Comandi e risultati locali

Node.js `v24.22.1`, Python `3.12.14`, Chromium/Playwright. Dalla root del checkout:

| Comando | Risultato |
| --- | --- |
| `node question-planner.test.cjs` | 27/27 PASS |
| `node chapter-16-guided.test.cjs` | 20/20 PASS, valutatore simulato |
| `node chapter-16-real-engine.test.cjs` | 39/39 PASS, motore e Oracle reali |
| `node verify-tests.cjs` | 71 PASS, 0 FAIL |
| `node verify-groups-5h.cjs` | 2370/2370 PASS, 0 errori di esecuzione |
| `node scripts/verify-official-provenance.test.cjs` | 6/6 PASS |
| `python3 scripts/test-chapter-16-browser.py` | 3/3 percorsi PASS |
| `git diff --check` | PASS |

Per il browser, avviare prima `python3 -m http.server 8000 --bind 127.0.0.1`
dalla root. Servono Playwright Python e Chromium già presenti in questo ambiente.
La prova usa una viewport mobile, verifica l'interazione reale, poi separatamente
il protocollo UI con un valutatore simulato e l'invalidazione di risposte obsolete.
Un timeout della prova simulata dopo l'introduzione del nuovo entry point è stato
corretto aggiornando lo stub da `evaluate` a `evaluateScenario`; la prova completa
è stata rieseguita con esito positivo. Non è una prova Android o PWA offline.

Il workflow `chapter-16-tests.yml` ora esegue unitari, integrazione, motore reale,
2370+71 regressioni e provenienza. Non filtra più i file di input, per non perdere
modifiche a moduli o database. La prova browser è locale; Node 22 e il nuovo
workflow sul remoto restano da verificare.

## Dati e controlli GitHub

I quattro archivi Oracle e l'archivio ruling sono presenti. Il percorso di
produzione continua a richiedere i singoli testi a Scryfall; i nuovi test usano
gli archivi locali. Non sono stati trasformati in un database runtime della PWA,
né è stato inventato un processo di aggiornamento automatico.

La pagina pubblica di
<https://github.com/jiraya892/judge-pocket./actions/runs/43293476196/job/131445478695>
riporta `succeeded`, sul precedente commit
`f56276c3a2782ae45b103bb8ca1a55eb09425545`. Non valida queste modifiche. La pagina
richiede «Sign in to view logs»: i log dettagliati non sono stati consultati.
L'API Actions ha ricevuto CONNECT 403 dal proxy; l'URL pubblico di uno step ha
restituito HTTP 404. Nessun token richiesto e nessuna modifica della rete.

Per identificare la revisione locale verificata usare `git rev-parse HEAD`.
La chiusura definitiva richiede le prove CI sulla revisione da pubblicare e una
soluzione verificata del confine sulle fonti, oltre a mantenere esplicito il
perimetro di interazioni supportate. Nessuna dichiarazione di copertura generale
delle Comprehensive Rules o di completamento di 16C.
