# Discussioni pubbliche e spiegazioni leggibili

Aggiornamento del 13 novembre 2026, nel ramo `dev/media-case-intake`.
Le discussioni sono fonti di casi da verificare, non autorità sulle regole:

- [Forge #12067](https://github.com/Card-Forge/forge/issues/12067): Zilortha e soglia del danno letale. Il riconoscimento del testo Oracle imposta una regola generale che confronta il danno con la forza. Sei danni non distruggono il 7/3; sette sì. Le attese sono confermate dal testo Oracle e dai quattro ruling dello snapshot, non copiate dalla segnalazione.
- [Forge #8174](https://github.com/Card-Forge/forge/issues/8174): attacco improvviso e doppio attacco quando si blocca. Verificata la variante con un singolo bloccante: se il primo colpo non basta, le due creature possono infliggersi danno nella sottofase normale e morire entrambe. Il caso con più bloccanti resta fuori dal percorso corrente.
- [Forge #8663](https://github.com/Card-Forge/forge/issues/8663): Banefire e Coat with Venom. Il caso completo con X e una magia in risposta è ancora Unsupported. Il test del core conferma che impedire la prevenzione non fa ignorare la costituzione aumentata; non viene presentato come prova end-to-end della risposta in pila.

Le estensioni del combattimento riconoscono anche tocco letale e legame vitale:
indistruttibile impedisce la distruzione da tocco letale; il danno effettivamente
inflitto fa guadagnare vite anche quando il bloccante è indistruttibile. Il danno
prevenuto non dà vite. Il guadagno da legame vitale avviene prima delle SBA,
anche se la fonte muore nello stesso gruppo di danni.

Il core non conserva il segno di tocco letale oltre la successiva verifica delle
SBA. La regola che usa la forza non modifica la costituzione: costituzione zero
continua a mandare la creatura al cimitero; forza zero richiede almeno un danno.
Gli effetti sul danno letale vengono ricalcolati fra i gruppi di SBA se una fonte
lascia il campo. I controllori vengono chiesti soltanto se cambiano l'esito.

Oracle e riferimenti delle fonti: [public-discussion-sources.json](public-discussion-sources.json).
Baseline reali sul commit `01ec206` conservate nella cartella privata di ricerca:
Zilortha, tocco letale e legame vitale risultavano Unsupported prima del blocco.

## Interfaccia

Una spiegazione discorsiva deriva dai risultati strutturati del motore. Non usa
un modello IA o eccezioni per i nomi delle coppie. Mostra prima cosa succede e
perché, poi i riferimenti CR in una sezione apribile. Lo stato tecnico `partial`
e i controlli sulle fonti restano attivi; i dettagli di autenticazione sono nella
sezione tecnica, senza ripetizioni nella spiegazione principale. I limiti reali
dei conteggi di inneschi o pescate restano indicati una volta, alla fine.

Dal risultato si possono aggiungere carte fino al limite di quattro, correggere
risposte già date e ricalcolare. Le informazioni ancora valide vengono conservate;
gli intervalli sulle vite vengono richiesti di nuovo se una carta aggiunta
introduce una nuova soglia. Un dettaglio libero non ancora interpretabile viene
conservato e blocca il vecchio risultato: non viene ignorato.

## Verifiche

Comandi e risultati effettivi in
[results.json](../test-reports/context-and-forums/results.json), con hash dei
sorgenti verificati. Tutte le esecuzioni elencate hanno codice d'uscita zero:

- `node case-study-forums.test.cjs`: 16 controlli;
- `node case-study-reels.test.cjs`: 50 controlli;
- `node interaction-story.test.cjs`: 5 controlli della presentazione e del confine di affidabilità;
- `node verify-groups-5h.cjs`: 2370; `node verify-tests.cjs`: 71;
- planner 27, protocollo guidato 20, integrazione reale 39, beta 19, bersagli 16, dati 10, provenienza 6;
- ricerca: 3 probe e 30 test Python;
- browser: 3 capitolo 16, 7 beta, 3 bersagli, 12 nuovi percorsi: **25**. Le prove di protocollo simulate del capitolo 16 rimangono distinte dai flussi reali.

Totale delle suite Node dell'app: **2649**, esclusi i tre probe. Chromium verifica
anche installabilità e offline; nessun dispositivo fisico Android/iOS è stato
provato. WebKit non disponibile. GitHub Actions aggiornato ma non eseguito su
queste modifiche locali: nessun push, deployment o pubblicazione effettuato.

Il campione video resta quello dei cinque reel realmente trascritti, descritto
in [REEL_CASES.md](REEL_CASES.md); l'embed pubblico non dà accesso verificato a
tutto l'archivio. Nessun altro video viene dichiarato analizzato.
