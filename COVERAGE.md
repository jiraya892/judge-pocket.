# Stato di copertura delle regole — Judge Pocket

Data: 11 novembre 2026. **Implementazione parziale**; non è una dichiarazione di conformità integrale a Magic.

| Categoria | Stato | Limitazioni |
|---|---|---|
| Carte / testo Oracle | Parziale | Ricerca Scryfall e parser di pochi pattern, non un linguaggio completo |
| Oggetti e zone (regole 109, 400) | Parziale | Oggetti, identità dopo cambio zona, pedine; mancano vari eventi collegati alle zone |
| Giocatori, vita, danni | Parziale | Variazioni numeriche semplici, mancano prevention, infect, protection e altri modificatori |
| Effetti di sostituzione (614, 616) | Parziale | Raddoppi di pedine, raddoppi/incrementi dei segnalini, scelta dell'ordine se cambia il risultato |
| Abilità innescate (603) | Parziale | Alcuni ETB e inneschi aggiuntivi; risoluzione non automatica |
| Pila / priorità (117, 405, 608) | Parziale | Oggetti sulla pila, passaggi di priorità e segnalazione della risoluzione manuale |
| Azioni basate sullo stato (704) | Parziale | Vita zero, veleno, pesca da biblioteca vuota se segnalata, costituzione/danno letale, indistruttibile esplicito, planeswalker, annullamento segnalini +1/+1/-1/-1 |
| Regola delle leggende (704) | Parziale | Rilevazione conflitti e scelta esplicita del permanente da conservare |
| Bersagli (115) | Parziale | Identità e presenza nella zona, non tutte le condizioni di legalità |
| Abilità attivate / costi (602, 601) | Da implementare | Nessun parser dei costi né pagamento |
| Effetti continui e layer (611–613) | Da implementare | Ancora assenti dipendenze, timestamp e modifica completa caratteristiche |
| Regole di combattimento (506–511) | Da implementare | Nessun simulatore completo dei danni da combattimento |
| Turno, passi, inizio/fine turno | Da implementare | Modello del turno e gestione completa delle abilità temporizzate assenti |
| Copie, faccia nascosta, trasformazioni | Da implementare | Supporto non generico |
| Commander, multiplayer e varianti | Da implementare | Nessun supporto completo |
| Riconoscimento fotografico | Da implementare | Foto solo riferimento, niente visione automatica delle carte |

## Regola di qualità

Un risultato deve avere:
1. testo Oracle riconosciuto da una meccanica realmente supportata;
2. condizioni e controllori validati;
3. simulazione con scelte esplicite per ordini alternativi;
4. regressioni superate;
5. segnalazione **«non determinato»** quando mancano dati o regole.

I test attuali coprono 15 scenari di base, **non** l'intero regolamento.

## Prossimi moduli prioritari

1. Modello esatto di evento e transizione con logging e gestione completa dei cambi di zona.
2. Parser AST delle abilità/costi, condizioni, bersagli e scelte (non solo regex).
3. Pila e risoluzione generica in ordine corretto, APNAP e trigger ritardati.
4. Effetti continui, layer, dipendenze e timestamp.
5. Combattimento e danni, controllo di SBA completo.
6. Rulings indicizzati e ricerca contestuale, con citazioni e verifiche.
7. Riconoscimento di più carte da fotografia e richiesta delle sole informazioni di partita indispensabili.

Fonte normativa: https://magic.wizards.com/en/rules (Comprehensive Rules). Aggiornare parser e test alle revisioni ufficiali.
