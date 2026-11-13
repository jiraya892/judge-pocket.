# Interprete generale di situazioni

Questo servizio traduce italiano/inglese in una **proposta strutturata**, mai in un ruling. Il modello propone identità delle carte e fatti; il browser verifica le identità con Oracle e richiede conferma della ricostruzione. Le domande necessarie e i risultati restano responsabilità del pianificatore e del motore deterministico.

## Stato effettivo

Implementati protocollo condiviso JSON Schema, prompt, adattatore per server locale compatibile OpenAI/llama.cpp, API locale e integrazione opzionale con la PWA. Il percorso economico con grammatica esistente continua a funzionare senza IA; le descrizioni non ricostruite passano all'interprete se configurato. I nomi già ambigui vengono chiariti direttamente.

**Non sono installati né scaricati pesi; non è stata eseguita inferenza reale.** I test usano risposte del modello scritte manualmente. Verificano validazione, trasporto e integrazione con il motore reale, non l'accuratezza linguistica. La configurazione pubblica rimane `enabled: false`; nessun servizio a pagamento o endpoint pubblico è attivato.

Le citazioni devono provenire dal testo originale e coprirlo; il protocollo rifiuta campi di ruling, riferimenti inesistenti e alcune omissioni numeriche/negazioni evidenti. Questi controlli non dimostrano equivalenza semantica: la conferma dell'utente è obbligatoria. Fatti riconosciuti che il motore guidato non applica ancora (es. danni già segnati, segnalini positivi, proprietario distinto dal controllore, ordine della pila) producono un limite esplicito, non vengono scartati per ottenere una risposta. Le zone diverse dal campo richiedono un percorso supportato. Un'assenza dichiarata di altri effetti non sostituisce la conferma del contesto prevista dal motore.

La fase resta sconosciuta se non detta. Tutte le fasi e sottofasi già codificate sono rappresentabili; non viene chiesta una fase solo perché manca. L'interpretazione non aggiunge supporto alle meccaniche del motore. Il controllo di autenticazione delle fonti rimane attivo.

## Avvio di sviluppo, dopo autorizzazione del modello

Prerequisiti: Python 3.10+, un runtime llama.cpp già installato e un modello GGUF autorizzato e verificato. Il manifest `model-candidate.json` documenta il candidato, non avvia download.

Esempio per un runtime compatibile:

```sh
llama-server --model /percorso/al/modello.gguf --alias judge-interpreter --host 127.0.0.1 --port 8080 --ctx-size 8192 --parallel 1 --jinja
python3 interpreter/server.py --port 8766 --allowed-origin http://127.0.0.1:8000
python3 -m http.server 8000 --bind 127.0.0.1
```

Per una prova solo locale, configurare `data/ai/config.json` con `enabled: true` ed `endpoint: "http://127.0.0.1:8766/api/interpreter/scene"`. I test browser fanno questa configurazione tramite intercettazione HTTP senza modificare il file distribuito. Non pubblicare questa configurazione: `127.0.0.1` su un telefono indica il telefono, non il server cloud.

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

Prossimo criterio: dopo autorizzazione al download, avviare il modello e misurare estrazione di parafrasi italiane/inglesi, negazioni, tempi, carte ambigue e omissioni su un corpus separato, riportando anche errori e latenza. Nessuna accuratezza è deducibile dai test con risposte predisposte.
