# Reel e audio come fonti di casi di studio

## Stato reale

Il creator è stato indicato dall'utente come `rippullrepeat` su Instagram.
Nell'ambiente aggiornato il profilo pubblico risponde HTTP 200 e i metadati
riportano `RipPullRepeat (@rippullrepeat)`. **Nessun suo reel è stato acquisito,
ascoltato o trascritto.** La pagina iniziale non espone un elenco di reel;
yt-dlp non riesce a indicizzarla. Una richiesta all'endpoint pubblico del profilo
restituisce HTTP 404, senza recuperare video. Questi risultati non dimostrano
che il profilo sia vuoto o che sia necessariamente richiesto il login.

Il controllo anonimo con Chromium si ferma su `ERR_CERT_AUTHORITY_INVALID`:
la CA dell'ambiente presente nel trust di sistema non è nel database NSS del
browser. La proposta di aggiungerla è stata respinta dall'approvazione automatica
perché modifica in modo persistente i certificati attendibili senza consenso
esplicito. Il trust non è stato modificato; TLS non è stato disattivato.
Non è stato tentato alcun accesso con credenziali o aggiramento del login.

Sono stati preparati e provati:

- yt-dlp `2026.10.26` in un ambiente Python isolato;
- Whisper.cpp `v1.7.6`, commit upstream
  `a8d002cfd879315632a579e73f0148d06959de36`, compilato CPU con due thread;
- FFmpeg per estrarre audio mono PCM a 16 kHz;
- 10 test Python del flusso e dei controlli, incluso FFmpeg reale;
- 13 test del filtro per ruling, con testi di esempio in italiano e inglese;
- 3 test del collegamento tra uno scenario revisionato e il motore reale.

**La trascrizione vocale reale non è ancora verificata.** Il modello multilingue
`tiny` (~75 MiB) non è presente: Hugging Face ora è raggiungibile, ma il download
redirige a `us.aws.cdn.hf.co`, bloccato dalla rete con CONNECT 403. Il test vocale `smoke.py` si ferma in
modo esplicito finché il modello manca; non produce un PASS simulato.

Il modello viene accettato solo se il checksum SHA-1 coincide con quello
pubblicato nella tabella del repository upstream alla versione bloccata:
`bd577a113a864445d4c299885e0cb97d4ba92b5f`. TLS resta verificato e i redirect
non HTTPS sono rifiutati. Il digest non viene modificato per far passare un file.
Nessun modello è stato aggiunto alla PWA e nessuna API commerciale è attivata.

## Intervento necessario del proprietario

Le precedenti aggiunte per Instagram e Hugging Face risultano applicate e la rete
ristretta risulta `enforced`. Resta **soltanto `us.aws.cdn.hf.co`**, identificato
nel redirect reale, aggiunto alla nuova bozza conservando tutte le altre regole.
La lettura successiva conferma il dominio nella bozza, ma non nell'ambiente attivo.
Non occorre riapplicare le vecchie modifiche.

L'utente deve rivedere e salvare questa singola aggiunta nelle impostazioni
dell'ambiente. Il salvataggio della bozza da parte dell'assistente non applica
da solo la nuova regola alla macchina. L'assistente non pubblica ambiente o app.
Non è stata attivata una rete senza restrizioni e main non è modificato.

Se l'interfaccia è Codex web, la pagina di gestione ambienti è normalmente
<https://chatgpt.com/codex/settings/environments>. Su interfacce diverse il percorso
può cambiare: una schermata dell'utente permette di indicare il comando corretto,
senza inventare nomi di pulsanti non osservati.

Dopo l'applicazione occorre rileggere lo stato effettivo dell'ambiente e riprovare
le richieste. Non si deve presumere che l'accesso Instagram o il download siano
riusciti soltanto perché la bozza risulta salvata. Se emerge un dominio CDN
aggiuntivo, va identificato dalla risposta effettiva prima di proporlo.

## Cosa esegue l'assistente dopo lo sblocco

I comandi sono per l'assistente/sviluppatore: il proprietario non deve usare un
terminale sul telefono. Le installazioni sono ripetibili e fuori dal checkout:

```sh
python3 scripts/media/setup.py --model
/workspace/.cache/judge-media/venv/bin/python scripts/media/intake.py doctor
/workspace/.cache/judge-media/venv/bin/python scripts/media/smoke.py
```

Il test vocale usa il vero audio pubblico JFK incluso nel repository upstream;
richiede il recupero di parole note della registrazione. È una prova del
trascrittore, non dell'accesso a Instagram o dell'accuratezza sui nomi Magic.

Per cercare un primo gruppo di reel pubblici, senza scaricarli:

```sh
/workspace/.cache/judge-media/venv/bin/python scripts/media/intake.py list-public --profile rippullrepeat --limit 5
```

La lista è limitata e non pretende di essere un indice completo dell'account.
L'assenza di una lista accessibile non viene descritta come assenza di video.
Un link esatto a un reel resta utile per una prima prova indipendente dalla lista.

Per acquisire e trascrivere un reel pubblico o un file condiviso:

```sh
/workspace/.cache/judge-media/venv/bin/python scripts/media/intake.py ingest --url 'https://www.instagram.com/reel/CODICE_REALE/' --output /workspace/.cache/judge-media/cases/prova-001 --language auto
/workspace/.cache/judge-media/venv/bin/python scripts/media/intake.py ingest --file /percorso/al/file.mp4 --output /workspace/.cache/judge-media/cases/prova-002 --language auto
```

Le cartelle devono essere nuove e fuori dal repository pubblico. Nessun file
preesistente viene sovrascritto. I limiti sono 100 MiB per il media e circa 15
minuti di audio: non si deve tagliare silenziosamente la fine di un'interazione.
Si mantengono URL senza tracking, hash del file, descrizione disponibile,
trascrizione con tempi e output originale Whisper per la revisione.

## Selezione richiesta: soltanto ruling di Magic

L'utente ha chiesto di ignorare i video che non parlano di ruling MTG.
`scripts/media/ruling_filter.py` usa la trascrizione per un primo screening
conservativo. I metadati possono fornire indizi, ma hashtag e descrizione da soli
non confermano il contenuto del parlato. `relevance.json` registra la decisione
e i segmenti che la motivano:

- `ruling_candidate`: indizi di Magic e regole/interazioni nel parlato; viene
  preparato un `case-draft.json`, ancora da rivedere;
- `excluded`: apertura di bustine o promozione esplicita senza indizi di regole;
  nessuna bozza di caso e nessun test del motore per quel video;
- `needs_review`: evidenza insufficiente o ambigua; nessuna bozza automatica.
  La revisione è compito dell'assistente, senza chiedere all'utente di riassumere.

È un filtro a parole chiave, non un classificatore semanticamente verificato su
reel reali. Può avere falsi positivi e negativi; non dichiara né il tema confermato
né il ruling corretto. Un video che spiega una regola durante un'apertura di
bustine resta candidato. La revisione deve confermare il tema prima di creare
uno scenario da eseguire. I video chiaramente estranei vengono ignorati e le
trascrizioni private restano evidenza della selezione, fuori dal repository.

Verifica locale eseguita, senza modello o download di reel:

```sh
python3 scripts/media/test_ruling_filter.py  # 13 test, OK
python3 scripts/media/test_intake.py         # 10 test, OK
node scripts/media/test_probe.cjs           # 3 controlli, OK, motore reale
```

Questi 26 controlli non provano l'accesso ai reel o la qualità della trascrizione.

## Dal parlato al test

`case-draft.json` viene creato soltanto per i possibili ruling e contiene solo
candidati. I nomi trovati per corrispondenza esatta
restano `confirmed: false`: una parola comune o una trascrizione errata non è
una carta confermata. Se mancano nomi o dettagli, l'assistente li rivede nel
contesto; non vengono inventati o presi per veri dal solo audio.

L'assistente legge trascrizione e tempi, conferma i nomi contro Oracle e costruisce
uno scenario JSON con fatti noti/ignoti. Un file revisionato ha questa forma:

```json
{
  "id": "riferimento-al-caso",
  "reviewed": true,
  "context": {
    "cards": ["Shock", "Silver Knight"],
    "event": "cast",
    "casting": "Shock",
    "castingIndex": 0,
    "board": "complete"
  }
}
```

Questo esempio dimostra lo schema; non dichiara che il creator abbia trattato
quelle carte o che le condizioni siano ricavabili da un reel non ancora visto.
I fatti non presenti nella fonte restano domande o varianti condizionali.

```sh
node scripts/media/probe-reviewed-case.cjs /cartella-privata/reviewed-scenario.json
```

Il comando esegue il motore effettivo sullo snapshot Oracle locale con controllo
SHA-256 degli shard. Restituisce osservazione, domanda o Unsupported, mantenendo
falsa la verifica della conclusione del creator. Il testo della trascrizione non
viene mai eseguito come codice. `reviewed: true` non autentica le fonti e non
promuove partial a verified.

In seguito si formula un risultato atteso con fonti indipendenti Oracle/CR/ruling,
si aggiunge una regressione ripetibile e si implementa la regola generale e le
varianti, senza eccezioni per i nomi delle carte. Il sistema non usa la tesi del
video come unico oracolo dei test.

## Accesso e limiti

L'inizio è solo su contenuti pubblici. Nessuna password, sessione o cookie viene
richiesta in chat, estratta dal browser o salvata nel repository. Un eventuale
account dedicato va considerato soltanto dopo una reale richiesta di login e
una modalità di accesso autorizzata: non garantisce il recupero di tutto l'account.

Instagram può limitare profili e reel anche pubblici. Non è stato verificato il
recupero di un reel reale, né la trascrizione di nomi Magic con tiny. La qualità
va misurata su una prima clip: errori e ambiguità devono restare visibili. Non si
passa automaticamente a modelli più grandi o servizi a pagamento.
