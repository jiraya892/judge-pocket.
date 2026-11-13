# Interprete generale di situazioni

Questo servizio traduce italiano/inglese in una **proposta strutturata**, mai in un ruling. Il modello propone identità delle carte e fatti; il browser verifica le identità con Oracle e richiede conferma della ricostruzione. Le domande necessarie e i risultati restano responsabilità del pianificatore e del motore deterministico.

## Stato effettivo

Implementati protocollo condiviso JSON Schema, prompt, adattatore per server locale compatibile OpenAI/llama.cpp, API locale e integrazione opzionale con la PWA. Il percorso economico con grammatica esistente continua a funzionare senza IA; le descrizioni non ricostruite passano all'interprete se configurato. I nomi già ambigui vengono chiariti direttamente.

**Il modello autorizzato è stato scaricato, verificato tramite SHA-256 e avviato localmente con llama.cpp b7620 su CPU.** I test ordinari usano risposte scritte manualmente e verificano il protocollo; le prove opt-in con inferenza reale sono separate in `test-reports/ai-interpreter/real-model.json` e `real-browser.json`. Il corpus linguistico è piccolo ed è stato usato per migliorare il prompt: non è una misura indipendente di accuratezza generale. La configurazione pubblica rimane `enabled: false`; nessun servizio a pagamento o endpoint pubblico è attivato.

Le citazioni devono provenire dal testo originale e coprirlo; il protocollo rifiuta campi di ruling, riferimenti inesistenti e alcune omissioni numeriche/negazioni evidenti. Questi controlli non dimostrano equivalenza semantica: la conferma dell'utente è obbligatoria. Fatti riconosciuti che il motore guidato non applica ancora (es. danni già segnati, segnalini positivi, proprietario distinto dal controllore, ordine della pila) producono un limite esplicito, non vengono scartati per ottenere una risposta. Le zone diverse dal campo richiedono un percorso supportato. Un'assenza dichiarata di altri effetti non sostituisce la conferma del contesto prevista dal motore.

La fase resta sconosciuta se non detta. Tutte le fasi e sottofasi già codificate sono rappresentabili; non viene chiesta una fase solo perché manca. L'interpretazione non aggiunge supporto alle meccaniche del motore. Il controllo di autenticazione delle fonti rimane attivo.

## Avvio di sviluppo, dopo autorizzazione del modello

Prerequisiti: Python 3.10+, un runtime llama.cpp già installato e un modello GGUF autorizzato e verificato. Il manifest `model-candidate.json` fissa i pesi autorizzati; `test-reports/ai-interpreter/runtime.json` documenta file, checksum e runtime usati. Non si avvia alcun download automaticamente.

Esempio per un runtime compatibile:

```sh
llama-server --model /percorso/al/modello.gguf --alias judge-interpreter --host 127.0.0.1 --port 8080 --ctx-size 8192 --parallel 1 --jinja
python3 interpreter/server.py --port 8766 --timeout 80 --allowed-origin http://127.0.0.1:8000
python3 -m http.server 8000 --bind 127.0.0.1
```

Per una prova solo locale, configurare `data/ai/config.json` con `enabled: true` ed `endpoint: "http://127.0.0.1:8766/api/interpreter/scene"` e `timeoutMs: 90000`. I test browser fanno questa configurazione tramite intercettazione HTTP senza modificare il file distribuito. Non pubblicare questa configurazione: `127.0.0.1` su un telefono indica il telefono, non il server cloud.

L'API accetta solo richieste limitate e un'inferenza alla volta; timeout e output troncati falliscono esplicitamente. Non registra descrizioni o prompt. Il backend del modello è vincolato al loopback; non è configurabile dal testo dell'utente. L'endpoint health verifica il servizio, **non** la disponibilità del modello.

Questo server è per sviluppo locale: non è un servizio pubblico pronto. Per usarlo dalla beta mobile occorrono hosting proprio autorizzato, HTTPS, autenticazione e limiti per utente. GitHub Pages serve file statici e non esegue il modello. I costi/hosting e la pubblicazione richiedono una decisione separata.

## Verifica

```sh
node scene-ai.test.cjs
python3 scripts/test_ai_interpreter.py
# Con il server dei file sulla porta 8000:
python3 scripts/test-ai-interpreter-browser.py
```

I test esercitano anche Oracle reale, layer/dipendenze/ingresso/SBA, danni e anti-malocchio, proposta da confermare, annullamento di risposte obsolete, origin/Host, richieste concorrenti e output incompleti. I flussi browser usano Chromium con viewport touch, non dispositivi Android/iOS reali.

Per ripetere le prove con inferenza reale, con il modello già avviato:

```sh
python3 scripts/benchmark_ai_interpreter.py
python3 scripts/test-real-ai-browser.py
```

Questi comandi non fanno parte della CI, non scaricano pesi e non usano servizi commerciali. Il primo salva anche proposte respinte e tempi; il secondo usa la vera API locale e avvia una propria anteprima privata su loopback. Le prove iniziali fallite restano nei report `first-inference.json`, `baseline-model.json` e `typed-facts-probe.json`.

Il decoder riceve uno schema con varianti dei fatti: quantità numeriche, zone, fasi e giocatori hanno domini distinti. Questo previene tipi JSON errati ma non garantisce comprensione corretta: una quantità omessa o un evento sbagliato deve ancora essere bloccato o corretto, non ricostruito inventando uno stato. Domanda ed evento vengono controllati anche per evitare di rispondere con una fotografia statica a una domanda sull'ingresso di una carta.

Prossimo criterio: ampliare un corpus indipendente di descrizioni non usate per modificare il prompt e misurare anche errori, ricostruzioni ambigue e latenza. Nessuna accuratezza è deducibile dai soli test con risposte predisposte. L'installazione locale non rende disponibile il modello nella beta GitHub Pages.

## Risultati locali del 13 novembre 2026

Il corpus di sviluppo contiene 16 descrizioni. Il controllo dei campi selezionati passa su 12/16 output grezzi (incluso un tentativo di istruzione estranea respinto) e su 13/16 dopo verifica Oracle, ricostruzione delle fasi esplicite dal testo e conversione della proposta. **Non significa 13 ruling corretti su 16:** è un controllo dell'input e include una richiesta volutamente respinta. Il corpus è stato usato per correggere il prompt, quindi non misura l'accuratezza generale.

Restano tre casi da correggere: un giocatore dell'evento in conflitto con il lanciatore, una domanda classificata come combattimento dopo una magia, e un riferimento corto interpretato come un secondo oggetto. I primi due vengono bloccati prima del calcolo. Per il terzo, nella revisione è disponibile «È la stessa carta già citata»: solo una scelta esplicita dell'utente unisce i riferimenti, senza accorpare automaticamente copie reali. I nomi ambigui mantengono tutte le scelte Oracle e le risposte già date dall'utente vengono conservate.

Sono passati due flussi live in Chromium: descrizione con quattro carte → conferma → ingresso di Ashaya con Blood Moon e SBA; magia avversaria → antimalocchio → impossibilità del bersaglio. Entrambi usano modello, API, Oracle e motore reali; non risposte simulate. Il controllo di autenticazione delle fonti resta attivo.

Con quattro thread CPU, i 16 invii hanno impiegato circa 31–75 secondi, mediana 46; i flussi browser circa 81 e 34 secondi fino all'anteprima. Durante parte del corpus giravano anche regressioni: sono misure nell'ambiente di sviluppo condiviso, non un benchmark isolato di capacità. La RAM residente osservata è nel report runtime e non costituisce un requisito minimo misurato.

Il tempo e gli errori residui impediscono di dichiarare pronto l'interprete per una beta pubblica. Servono prove indipendenti più ampie, miglioramenti della ricostruzione, e hosting HTTPS autorizzato per l'accesso da telefoni. Non è stato pubblicato alcun endpoint.

Per aprire l'anteprima privata dopo avere avviato il modello:

```sh
python3 interpreter/preview.py --port 8001
```

L'anteprima abilita l'IA solo nella risposta HTTP locale della configurazione. Il file distribuito rimane disattivato. Indirizzo locale: `http://127.0.0.1:8001/context.html`; non è un link alla beta accessibile dal telefono.
