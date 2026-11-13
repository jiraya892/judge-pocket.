# Casi ricavati dai reel pubblici — 13 novembre 2026

Ramo: `dev/media-case-intake`, base `4a76135`. Nessuna pubblicazione o modifica a
main. I casi provengono da cinque audio realmente acquisiti e trascritti con
Whisper.cpp tiny. Video, audio e trascrizioni complete restano fuori dal checkout.
URL, hash, intervalli rilevanti, testi Oracle e ruling disponibili sono in
[`reel-source-records.json`](reel-source-records.json).

Il creator fornisce candidati. Le attese sono ricavate separatamente dai testi
Oracle, dai ruling dello snapshot con campo `source: wotc` e dalle regole
implementate, non prendendo l'affermazione del video come oracolo dei test.
L'autenticazione del corpus ufficiale resta incompleta: la presentazione conserva
`partial` e non propone un verdetto certificato. Nessuna firma è stata inventata.

## Campione e selezione

| Reel | Contenuto esaminato | Destinazione |
| --- | --- | --- |
| [DfiiAccBsLh](https://www.instagram.com/reel/DfiiAccBsLh/) | Dr. Beverly Crusher, fine turno, Exemplar of Light | Famiglia inneschi e limiti per turno |
| [DfmsvirxH4l](https://www.instagram.com/reel/DfmsvirxH4l/) | Doppio attacco e bloccante indistruttibile | Combattimento ristretto, reale applicazione del danno e SBA |
| [Dfp_aiYta2D](https://www.instagram.com/reel/Dfp_aiYta2D/) | Mr. Spock, Brainstorm, Thought Reflection | Sostituzioni di singole pescate, conteggio delle istruzioni |
| [DfpLC0aunv0](https://www.instagram.com/reel/DfpLC0aunv0/) | Booster Tutor e proposta di variante Commander | Registrato, Unsupported; la variante non è una regola del Commander ordinario |
| [DfnjODZvN7n](https://www.instagram.com/reel/DfnjODZvN7n/) | Invito a raccontare regole casalinghe | Escluso: non spiega un ruling ufficiale |

Il primo link è stato fornito dall'utente; gli altri sono stati recuperati dal
profilo pubblico incorporabile. Il risultato è limitato ai post resi disponibili
da quell'embed, non all'intero account. La promozione presente nell'indice non è
stata acquisita; la sua classificazione audio non è stata verificata.

Gli errori ASR sono conservati privatamente, con correzioni revisionate contro
Oracle: fra gli esempi, Exemplar of **Light**, Enlightened Confidant e Booster
**Tutor**. Il video sul combattimento non nomina creature specifiche: Ridgetop
Raptor, Fencing Ace e Darksteel Myr sono rappresentanti scelti per i test, non
carte attribuite al creator.

## 1. Cause degli inneschi e limiti per turno

Il motore riconosce il testo completo del modificatore di inneschi da guadagno
vita e distingue l'evento dalla condizione che un'abilità controlla:

- Un singolo guadagno di una quantità positiva di vite, con Dr. Beverly Crusher
  ed Exemplar of Light controllate da quel giocatore: due inneschi della Doctor
  e due dell'abilità di guadagno vita dell'Exemplar. L'abilità dell'Exemplar legata
  ai segnalini non si è ancora innescata in questo istante.
- All'inizio della sottofase finale, Enlightened Confidant controlla se è stata
  guadagnata vita; Resplendent Angel controlla la soglia di cinque vite. Il loro
  evento di innesco è l'inizio della sottofase: il modificatore di guadagno vita
  non lo moltiplica. La condizione viene verificata tramite il motore intervening-if.
- Quando si mettono segnalini sull'Exemplar, il suo innesco di pescata si innesca
  una volta se non si è già innescato in questo turno, altrimenti zero. Non è un
  innesco causato direttamente dal guadagno vita.
- Bloombrute offre una variante Oracle reale con un innesco diretto di guadagno
  vita limitato a una volta per turno: il limite impedisce il secondo innesco.
  Ajani's Pridemate e Dawn of Hope verificano la stessa regola su altri testi.

Il core conserva lo storico per turno, abilità e identità del permanente. Un
nuovo turno o una nuova incarnazione ha uno storico distinto. Uno storico non
determinabile è Unsupported, non “non ancora usato”. Il flusso eventi/pila/SBA
propaga questo storico. Un modificatore di guadagno vita non viene applicato a
inneschi ritardati né a quelli causati dal posizionamento dei segnalini.

**Perimetro della UI:** conteggio all'evento scelto. Non risolve l'intera catena
di inneschi, segnalini, pescate e pedine. L'effetto di un'abilità può restare
opaco quando il suo testo non cambia le condizioni di innesco riconosciute;
non viene presentato come effetto eseguito. I confronti del planner riguardano
soltanto quel conteggio completo, mai un esito parziale di risoluzione.

Le domande riguardano controllori, storico o soglie solo quando cambiano quel
conteggio. Nessun ordine d'ingresso viene chiesto per questi casi. Totali noti
come tre o sette vite vengono confrontati con le soglie senza ripetere la domanda.
Riferimenti: CR 603.1, 603.2, 603.3, 603.4 e testo Oracle del limite.

## 2. Doppio attacco e stato di creatura bloccata

Una sola attaccante, un solo bloccante, caratteristiche numeriche, nessuna
azione fra le sottofasi e nessun danno o segnalino preesistente:

- Ridgetop Raptor contro Darksteel Myr: due danni nella prima sottofase e due
  nella normale. Il Myr resta sul campo con quattro danni segnati; al giocatore
  in difesa non arriva danno.
- Ridgetop Raptor contro Grizzly Bears: il bloccante muore nella prima sottofase;
  l'attaccante resta bloccata e senza travolgere non assegna danno al giocatore
  nella seconda.
- Il danno dei due combattenti è applicato nello stesso gruppo prima delle SBA.
  Attacco improvviso, morte dell'attaccante e prevenzione riconosciuta hanno
  regressioni distinte. Fencing Ace verifica la generalizzazione a un'altra carta.

Vengono usati il vero event pipeline e le vere SBA locali, con keyword e valori
Oracle. La legalità di un blocco con volare viene controllata. Il danno già
segnato rimane fra le sottofasi; non si sottrae dalla forza assegnata nel passo
successivo. Riferimenti: CR 510.1c, 702.4b, 702.12b, 704.5g.

Travolgere richiede scelte di assegnazione ancora non implementate: restituisce
Unsupported. Anche tocco letale, legame vitale e protezione dei combattenti
rimangono esclusi da questo percorso. Non sono trattati come assenti.

## 3. Sostituzioni delle pescate

Il riconoscimento richiede la clausola Oracle completa “If you would draw a card,
draw two cards instead.”: la sola parola “if” non è una prova di sostituzione.

- Mr. Spock, Science Officer e Brainstorm: sei pescate richieste invece di tre;
  l'istruzione di rimettere due carte non cambia.
- Aggiungendo Thought Reflection dello stesso controllore: dodici pescate
  richieste, sempre due carte nell'istruzione successiva.
- Thought Reflection con Divination e un moltiplicatore controllato da un
  avversario verificano che il risultato derivi da testo e controllore.

Il vero motore delle sostituzioni applica ogni effetto una volta all'evento e
alle pescate risultanti; non genera un ciclo ricorsivo. Si confrontano tutti gli
ordini ammessi per i moltiplicatori riconosciuti: nessuna domanda sull'ordine
quando il numero finale è invariato. CR 121.2, 614.1a, 614.5, 616.1.

**Perimetro:** numero di istruzioni di pescata, non carte effettivamente pescate.
Non si assume un grimorio sufficientemente grande o una mano già nota; non si
simulano pescata da grimorio vuoto, scelta delle carte da rimettere o inneschi
successivi. Il normale event pipeline continua a rifiutare un'esecuzione fisica
di `drawCard`. Sostituzioni condizionate come Teferi's Ageless Insight rimangono
Unsupported.

## Verifiche effettive

Prima della modifica il probe reale restituiva `CUSTOM_EVENT_NOT_PARSED` per la
descrizione del guadagno vita e `ORACLE_TEXT_UNSUPPORTED` per Doctor/Confidant sul
campo. Input e risultati baseline sono conservati nella cartella privata di
ricerca, con commit base `4a76135`. Non si dichiara un ruling storico sbagliato:
erano funzionalità non collegate o non riconosciute.

I risultati delle esecuzioni locali sono conservati in
[`local-results.json`](../test-reports/reel-cases/local-results.json) e
[`browser-results.json`](../test-reports/reel-cases/browser-results.json).
Il primo riporta anche gli hash dei sorgenti effettivamente verificati.

| Comando | Esito |
| --- | --- |
| `node case-study-reels.test.cjs` | 50/50; Oracle reali, varianti e controlli negativi del core |
| `node verify-groups-5h.cjs` | 2370/2370, zero errori d'esecuzione |
| `node verify-tests.cjs` | 71/71 |
| `node question-planner.test.cjs` | 27/27 |
| `node chapter-16-guided.test.cjs` | 20/20, protocollo con valutatore simulato |
| `node chapter-16-real-engine.test.cjs` | 39/39, compreso Ashaya/Blood Moon |
| `node beta-engine.test.cjs` | 19/19 |
| `node case-study-targeting.test.cjs` | 16/16 |
| `node card-data.test.cjs` | 10/10 |
| `node scripts/verify-official-provenance.test.cjs` | 6/6 |
| `python3 scripts/media/test_intake.py` | 10/10 |
| `python3 scripts/media/test_ruling_filter.py` | 14/14 |
| `python3 scripts/media/test_instagram_public.py` | 6/6 |
| `node scripts/media/test_probe.cjs` | 3/3 |
| `python3 scripts/test-reel-cases-browser.py` | 7 percorsi reali in Chromium |
| Browser precedenti: chapter-16, beta, targeting | 3 + 7 + 3 percorsi; la suite chapter-16 include prove di protocollo simulate |

Totali separati: **2628 test Node dell'app**, 3 probe di ricerca, 30 test Python,
20 percorsi browser. Rigenerazione database e app shell eseguita: 38.779 carte,
64 shard Oracle, 89 risorse app shell. Il test beta verifica anche installabilità
Chromium e ricaricamento offline con il server effettivamente spento.

Per i browser con server esterno usare `python3 -m http.server 8000 --bind 127.0.0.1`;
il test beta avvia e spegne il proprio server isolato. Il test ASR reale è
`/workspace/.cache/judge-media/venv/bin/python scripts/media/smoke.py`: passato.

GitHub Actions è stato aggiornato per includere le nuove suite, ma **non eseguito
sulle modifiche locali**, che non sono state inviate o pubblicate. WebKit non è
installato; nessuna prova su Android o iOS fisici. Non sono dichiarati un nuovo
deployment, una beta generale completa o un supporto a tutti i video dell'account.
