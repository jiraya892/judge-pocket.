# Casi di studio — ricerca e primo blocco di implementazione

Questi file distinguono candidati, casi provati e meccanismi implementati. Non
sono una raccolta di risposte da cercare tramite i nomi delle carte.

Nuova ricerca e controlli di inserimento carte/fotografia:
[SEARCH_AND_PHOTO.md](SEARCH_AND_PHOTO.md), con cinque limiti del motore
individuati e test OCR reali su immagini sintetiche.

Ultimo blocco: [discussioni pubbliche e interfaccia leggibile](PUBLIC_DISCUSSIONS.md),
con nuovi casi su danno letale, tocco letale e legame vitale, e risultati di verifica.

Il blocco successivo, basato su cinque reel realmente trascritti, è documentato in
[REEL_CASES.md](REEL_CASES.md): conteggi di inneschi, combattimento ristretto e
sostituzioni delle pescate, con perimetri e limiti distinti.

## Ricerca nei dati disponibili

`scripts/discover-case-studies.py` legge gli snapshot Oracle/ruling forniti e
produce `catalog.json`. Il catalogo trova candidati attraverso meccanismi:

| Famiglia | Candidati nello snapshot |
| --- | ---: |
| Bersagli: antimalocchio, velo, protezione | 879 |
| Danno, indistruttibile e riduzione di costituzione | 782 |
| Sostituzioni dei segnalini | 320 |
| Sostituzioni dei cambi di zona | 277 |
| Perdita di abilità e cambi di tipo | 155 |

Le famiglie si sovrappongono. Il conteggio dei ruling e la presenza di condizioni
sono indizi per la priorità, non misure della confusione reale dei giocatori.
Un candidato non è automaticamente un caso verificato o supportato.

## Primo blocco: bersagli e colori della fonte

Testi effettivamente letti: `targeting-source-records.json`, con Oracle ID, testo,
colori e URL del record. Le condizioni sono il perimetro ristretto della beta:
magia semplice con danno fisso a una creatura, costi pagabili e altre condizioni
di lancio soddisfatte, nessun altro effetto/risposta. La legalità del bersaglio
non viene più assunta: viene calcolata prima della risoluzione.

| Caso reale | Risultato precedente riprodotto | Comportamento ora verificato |
| --- | --- | --- |
| Shock → Silver Knight | Unsupported | La protezione dal rosso impedisce di scegliere quel bersaglio; niente danno o cambio zona |
| Shock → White Knight | Unsupported | La protezione dal nero non impedisce una magia rossa; il danno letale viene applicato |
| Shock → Deadly Insect | Unsupported | Velo impedisce di bersagliare, indipendentemente dal controllore |
| Shock → Slippery Bogle | Unsupported | Antimalocchio richiede di distinguere fonte propria/avversaria: la domanda viene posta solo quando rilevante |
| Lightning Bolt → Silver Knight | Unsupported | Si applica la stessa regola generale della protezione, senza eccezione per Shock |

La riproduzione del comportamento precedente usa la grammatica congelata in
`fixtures/creature-traits-before-targeting.js`, presa dalla revisione precedente.
Gli altri moduli restano quelli reali: non è un risultato simulato dell'intero
motore storico. Dopo la modifica si usano Oracle e motore reali, sostituendo solo
il trasporto dei record nel runner Node.

Le attese sono motivate dai testi Oracle/reminder e dai riferimenti CR 702.16b,
702.11b, 702.18a e 608.2b. Lo snapshot ruling non contiene un chiarimento pertinente
per ciascuna di queste carte: non viene inventato. Le fonti restano non
autenticate secondo la politica esistente, e la UI mantiene `partial`.

## Generalizzazione e domande ridondanti

L'implementazione riconosce keyword e colori, non nomi di carte. I test comprendono:

- fonte di un colore protetto, di un colore diverso e fonte dichiarata incolore;
- colori della fonte ignoti, che non vengono convertiti in “incolore”;
- antimalocchio con magia propria oppure avversaria;
- creatura con antimalocchio presente ma non bersagliata: nessuna domanda inutile;
- protezione già sufficiente a impedire il bersaglio: nessuna domanda aggiuntiva
  sul controllore per distinguere antimalocchio;
- forme non implementate, come protezione da tutto o antimalocchio da un colore,
  che restano Unsupported invece di essere interpretate parzialmente.

Prima e doppio attacco sono riconosciuti come keyword senza effetto in questo
percorso di danno non da combattimento. Questo non implementa il combattimento.

`measure-trait-coverage.cjs` misura la sola preparazione delle creature per questo
percorso: **996 → 1150**, ossia **154 record aggiuntivi** nello snapshot di 38.779
nomi. Non significa che tutte le interazioni di quelle carte siano risolte.

## Verifiche e ramo

Lavoro nel ramo `dev/case-study-rules`; l'anteprima pubblicata non è stata modificata
automaticamente durante questo blocco di ricerca.

- `node case-study-targeting.test.cjs`: 16 casi, con baseline, regole reali,
  varianti sintetiche dichiarate e controlli negativi.
- `JUDGE_TEST_ORIGIN=http://127.0.0.1:8010 python3 scripts/test-targeting-cases-browser.py`:
  tre percorsi reali della UI, con server statico in esecuzione su quella porta.
- Restano richieste le suite precedenti: 2370 gruppi, 71 core, planner, 16A/B,
  beta, dati e provenienza. I conteggi non attestano copertura di tutte le CR.

Per il catalogo: `python3 scripts/discover-case-studies.py`.
Per la misura della grammatica: `node scripts/measure-trait-coverage.cjs`.

## Come aggiungere un caso da un video

Bastano URL e minuto, nomi delle carte, cosa sta succedendo e l'affermazione da
controllare. Lo scenario viene ricostruito senza chiedere al proprietario del
progetto di scegliere i moduli tecnici. Si registrano fatti noti e mancanti,
fonti Oracle/CR/ruling, esito prima della correzione, regola generale e varianti
positive/negative. Il creator è una fonte di candidati, non l'autorità normativa.

I successivi blocchi del catalogo (riduzioni P/T contro indistruttibile, esilio
invece di morte, segnalini e sostituzioni) non sono dichiarati implementati da
questo lavoro sui bersagli.
