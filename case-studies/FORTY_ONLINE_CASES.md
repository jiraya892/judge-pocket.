# Quaranta scenari aggiuntivi da fonti online

## Metodo e fonti

Questi sono **40 scenari di studio distinti**, costruiti dai testi Oracle recuperati online da Scryfall e dai ruling delle carte pertinenti. Non sono 40 video Instagram né 40 discussioni riprodotte letteralmente. La ricerca iniziale nelle segnalazioni pubbliche di XMage ha restituito 196 risultati, molti relativi a problemi software e non utilizzabili come verdetti: non li contiamo come casi implementati. Non sono stati acquisiti nuovi reel in questo gruppo.

Sono stati confrontati **45 record Oracle online** con il database locale: nessuna differenza nei campi usati (testo, colori, tipo, forza e costituzione). I ruling recuperati per gli Archetype spiegano anche i divieti e il caso di due effetti opposti; quello di Swiftblade Vindicator conferma il danno normale al giocatore quando il bloccante muore nella prima sottofase. Le risposte HTTP sono identificate con SHA-256 e data di acquisizione in [forty-online-sources.json](forty-online-sources.json).

Il catalogo riproducibile contiene carte, evento, controllori quando rilevanti, scelte di assegnazione, risultato atteso e URL delle fonti: [forty-online-cases.json](forty-online-cases.json). Le aspettative sono esplicite, separate dal motore; il test non le genera dai suoi risultati.

La risposta degli altri giocatori non è usata come risultato atteso. Ogni caso indica `ruleBasis`: i paragrafi delle CR confrontati con il calcolo. Il testo consultato è una copia delle CR del **17 aprile 2026**, fissata a un commit pubblico, con estratti e hash in [forty-cr-review.json](forty-cr-review.json). L’accesso diretto a `magic.wizards.com` è stato negato dal proxy di rete (HTTP 403): questa copia non è autenticata contro l’ultima pubblicazione Wizards, e non sostituisce il controllo di provenienza dell’app.

## Ambito

- Combattimento contro un giocatore: un attaccante e un bloccante avversario, nessun segnalino o danno precedente, nessuna risposta, altro effetto o eliminazione durante la sequenza. Le condizioni sono confermate nel percorso guidato. Sono ammessi fino a quattro carte e gli effetti continui riconosciuti.
- La domanda sulla possibilità di bloccare considera il bloccante stappato e le restrizioni riconosciute: non simula tutte le possibili dichiarazioni di blocco in una partita.
- Le magie collettive riconosciute infliggono danno fisso a tutte le creature o a tutte quelle senza volare. Si risolvono sulla pila reale, senza risposte, con creature il cui testo sia completamente riconosciuto.
- Il danno al giocatore è un totale separato; non viene simulata la sua eliminazione. `lifeChanges` nel combattimento registra i guadagni di vita, non un saldo complessivo dopo il danno al giocatore.
- Le carte nel cimitero hanno zero danni segnati perché il cambio di zona crea un nuovo oggetto; il danno precedente è descritto nella sequenza di eventi.
- I calcoli completi entro questo ambito restano presentati come `partial` per il controllo preesistente di autenticazione delle fonti, senza essere promossi a ruling certificati. Un ramo del calcolo che sia esso stesso parziale o non supportato impedisce il confronto e non elimina domande.

## Cambiamenti generali

Nessun accoppiamento è codificato nel motore. Il riconoscimento interpreta il testo completo: parole chiave, protezione dai colori, divieto di blocco, conferimento e divieto di acquisire la stessa abilità, e istruzioni di danno collettivo. I testi non riconosciuti restano esclusi.

Il pianificatore enumera tutte le assegnazioni legali di travolgere (anche assegnare tutto al bloccante), conserva il danno fra le sottofasi e chiede le scelte che cambiano l’esito. Un budget condiviso di 512 valutazioni e un massimo di 32 alternative per scelta impediscono esplosioni combinatorie. Il controllore di una fonte viene chiesto soltanto se cambia gli esiti verificati; correggere quel controllore o aggiungere una carta invalida le vecchie assegnazioni di danno.

## Catalogo

| ID | Carte | Domanda verificata | Risultato atteso principale |
|---|---|---|---|
| web40-01 | Colossal Dreadmaw + Darksteel Myr | Travolgere supera un bloccante indistruttibile | Danni al giocatore: 5 |
| web40-02 | Colossal Dreadmaw + Cho-Manno, Revolutionary | La prevenzione non aumenta il danno letale da assegnare | Danni al giocatore: 4 |
| web40-03 | Charging Monstrosaur + Silver Knight | Protezione dal rosso e attacco improvviso contro travolgere | Danni al giocatore: 3 |
| web40-04 | Moldering Karok + Silver Knight | Protezione dal rosso non previene una fonte nero-verde | Danni al giocatore: 1 |
| web40-05 | Fleetfoot Dancer + Silver Knight | Legame vitale guadagna solo il danno non prevenuto | Danni al giocatore: 2 |
| web40-06 | Swiftblade Vindicator + Darksteel Myr | Doppio attacco considera il danno gia segnato per travolgere | Danni al giocatore: 1 |
| web40-07 | Swiftblade Vindicator + Wall of Light | Doppio attacco non supera una costituzione piu alta | Danni al giocatore: 0 |
| web40-08 | Charging Monstrosaur + Sedge Scorpion | Travolgere e danno simultaneo con tocco letale del bloccante | Danni al giocatore: 4 |
| web40-09 | Colossal Dreadmaw + Vampire of the Dire Moon | Tocco letale e legame vitale del bloccante non fermano travolgere | Danni al giocatore: 5 |
| web40-10 | Charging Badger + Wall of Wood | Forza insufficiente non produce eccesso da travolgere | Danni al giocatore: 0 |
| web40-11 | Scaled Wurm + Darksteel Myr | Danno in eccesso senza travolgere non raggiunge il giocatore | Danni al giocatore: 0 |
| web40-12 | Fleetfoot Dancer + Cho-Manno, Revolutionary | Prevenzione e legame vitale non fanno guadagnare vita sul danno evitato | Danni al giocatore: 2 |
| web40-13 | Daggerback Basilisk + Darksteel Gargoyle + Archetype of Aggression | Tocco letale rende sufficiente un danno anche contro indistruttibile | Danni al giocatore: 1 |
| web40-14 | Colossal Dreadmaw + Darksteel Myr + Archetype of Aggression | Non puo avere travolgere prevale sulla parola chiave stampata | Danni al giocatore: 0 |
| web40-15 | Colossal Dreadmaw + Darksteel Myr + Archetype of Aggression + Archetype of Aggression | Due effetti opposti: non puo prevale anche sul conferimento | Danni al giocatore: 0 |
| web40-16 | Grizzly Bears + Runeclaw Bear + Archetype of Courage | Attacco improvviso conferito evita il danno di ritorno | Danni al giocatore: 0 |
| web40-17 | Youthful Knight + Grizzly Bears + Archetype of Courage | Rimozione di attacco improvviso stampato e conferimento al bloccante | Danni al giocatore: 0 |
| web40-18 | Memnite + Craw Wurm + Archetype of Finality | Tocco letale conferito distrugge una creatura piu grande | Danni al giocatore: 0 |
| web40-19 | Sedge Scorpion + Craw Wurm + Archetype of Finality | Perdere tocco letale cambia la sopravvivenza del bloccante | Danni al giocatore: 0 |
| web40-20 | Grizzly Bears + Giant Spider + Archetype of Imagination | Raggiungere blocca anche volare conferito | Blocco consentito |
| web40-21 | Wind Drake + Grizzly Bears + Archetype of Imagination | Perdere volare rende legale un blocco prima impossibile | Blocco consentito |
| web40-22 | Craw Wurm + Deadly Insect + Archetype of Endurance | Velo e antimalocchio non impediscono di bloccare | Blocco consentito |
| web40-23 | Slippery Bogle + Yavimaya Barbarian | Protezione da uno dei colori della fonte multicolore previene tutto | Danni al giocatore: 0 |
| web40-24 | Goblin Outlander + Silver Knight | La protezione dell attaccante impedisce il blocco | Blocco impedito |
| web40-25 | Ihsan's Shade + Darksteel Myr | Un artefatto incolore non e una fonte bianca | Blocco consentito |
| web40-26 | Coast Watcher + Giant Spider | Protezione impedisce il blocco anche a chi ha raggiungere | Blocco impedito |
| web40-27 | Grizzly Bears + Wall of Light | Difensore impedisce di attaccare ma permette di bloccare | Blocco consentito |
| web40-28 | Goblin Piker + Wall of Air | Una creatura volante puo bloccare una creatura terrestre | Blocco consentito |
| web40-29 | Phantom Warrior + Giant Spider | Raggiungere non supera non puo essere bloccato | Blocco impedito |
| web40-30 | Charging Monstrosaur + Phantom Warrior | Non puo essere bloccato non impedisce di bloccare altre creature | Blocco consentito |
| web40-31 | Boggart Brute + Wall of Wood | Minaccia richiede almeno due bloccanti | Blocco impedito |
| web40-32 | Pyroclasm + Gladecover Scout | Antimalocchio non ferma danni senza bersaglio | Creature: cimitero |
| web40-33 | Pyroclasm + Pincher Beetles | Velo non ferma danni senza bersaglio | Creature: cimitero |
| web40-34 | Pyroclasm + Silver Knight | Protezione dal rosso previene Pyroclasm senza richiedere bersagli | Creature: campo |
| web40-35 | Pyroclasm + Black Knight | Protezione dal bianco non previene una magia rossa | Creature: cimitero |
| web40-36 | Pyroclasm + Darksteel Myr | Indistruttibile conserva i danni segnati | Creature: campo |
| web40-37 | Pyroclasm + Vampire of the Dire Moon + Craw Wurm | Ricevere danno non attiva legame vitale o tocco letale della vittima | Creature: cimitero, campo |
| web40-38 | Pyroclasm + Cho-Manno, Revolutionary | Prevenire il danno e diverso da sopravvivere grazie a indistruttibile | Creature: campo |
| web40-39 | Tremor + Deadly Recluse + Wind Drake | Raggiungere non equivale ad avere volare | Creature: campo, campo |
| web40-40 | Pyroclasm + Grizzly Bears + Child of Night | Le azioni basate sullo stato seguono la risoluzione del danno collettivo | Creature: cimitero, cimitero |

## Verifica

Eseguire dalla radice:

```sh
node case-study-forty.test.cjs
node combat-planning.test.cjs
python3 scripts/test-forty-cases-browser.py
```

Il test dei 40 casi carica i moduli effettivi di `context.html` e il database Oracle compresso locale; non sostituisce il valutatore con risultati simulati. Il trasporto della ricerca Oracle è adattato al database locale nel test Node. Il browser usa il vero caricamento locale delle carte e il percorso dell’interfaccia. La suite aggiuntiva verifica domande necessarie e superflue, scelte invalide, limiti computazionali e rifiuto dei rami parziali.

Risultati delle regressioni e impronte dei sorgenti: [results.json](../test-reports/forty-online/results.json). I controlli nel browser usano Chromium con viewport mobile; non sono prove su dispositivi Android/iOS reali. GitHub Actions è configurato per eseguirli al prossimo push: questo lavoro non pubblica né invia commit al repository remoto.

Ultima esecuzione: 40/40 scenari, 14/14 controlli del pianificatore del combattimento, 7 nuovi percorsi Chromium; regressioni complete 2.370/2.370 di gruppo e 71/71 core. Totale asserzioni applicative Node: 2707. Altri 5 controlli registrano limiti noti non supportati e non fanno parte dei 40 casi implementati.
