# Reel e audio come fonti di casi di studio

## Stato reale

Il creator è stato indicato dall'utente come `rippullrepeat` su Instagram.
Non è stato ancora verificato il profilo corretto né analizzato alcun suo video.
Le richieste al sito Instagram sono bloccate dal proxy dell'ambiente (CONNECT
403). Non è stato tentato alcun accesso con credenziali o aggiramento del login.

Sono stati preparati e provati:

- yt-dlp `2026.10.26` in un ambiente Python isolato;
- Whisper.cpp `v1.7.6`, commit upstream
  `a8d002cfd879315632a579e73f0148d06959de36`, compilato CPU con due thread;
- FFmpeg per estrarre audio mono PCM a 16 kHz;
- 10 test Python del flusso e dei controlli, incluso FFmpeg reale;
- 3 test del collegamento tra uno scenario revisionato e il motore reale.

**La trascrizione vocale reale non è ancora verificata.** Il modello multilingue
`tiny` (~75 MiB) non è presente: il download è stato effettivamente tentato ed è
stato bloccato dalla rete con CONNECT 403. Il test vocale `smoke.py` si ferma in
modo esplicito finché il modello manca; non produce un PASS simulato.

Il modello viene accettato solo se il checksum SHA-1 coincide con quello
pubblicato nella tabella del repository upstream alla versione bloccata:
`bd577a113a864445d4c299885e0cb97d4ba92b5f`. TLS resta verificato e i redirect
non HTTPS sono rifiutati. Il digest non viene modificato per far passare un file.
Nessun modello è stato aggiunto alla PWA e nessuna API commerciale è attivata.

## Intervento necessario del proprietario

La bozza dell'ambiente è stata aggiornata esclusivamente nella sezione rete,
conservando `api.scryfall.com` e i preset esistenti. Aggiunte proposte:

- `instagram.com`, `www.instagram.com`;
- `*.cdninstagram.com`, `*.fbcdn.net` per media di Instagram;
- `huggingface.co`, `cdn-lfs.huggingface.co`, `cdn-lfs-us-1.hf.co`,
  `cas-bridge.xethub.hf.co` per il modello e i relativi download.

Il salvataggio della bozza non applica da solo queste regole alla macchina.
L'utente deve aprire le impostazioni dell'ambiente collegato alla chat, rivedere e
salvare la bozza, quindi pubblicare l'ambiente attraverso l'interfaccia prevista.
Questo non pubblica una nuova versione dell'app su GitHub Pages e non modifica
main. Non è stata attivata una rete senza restrizioni.

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

## Dal parlato al test

`case-draft.json` contiene solo candidati. I nomi trovati per corrispondenza esatta
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
