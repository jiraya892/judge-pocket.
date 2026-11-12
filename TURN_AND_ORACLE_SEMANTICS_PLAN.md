# Specifica: tempo di gioco e semantica del testo Oracle

Stato: specifica di implementazione, NON funzionalità già operativa.

## Tempo di gioco
Stato strutturato: activePlayer, turnNumber, phase, step, priorityPlayer, stack, consecutivePasses. Fasi: beginning (untap, upkeep, draw), precombat_main, combat (beginning_of_combat, declare_attackers, declare_blockers, combat_damage, end_of_combat), postcombat_main, ending (end, cleanup). Gestire passaggio tra step con azioni basate sullo stato, inneschi, priorità e passaggi consecutivi; non avanzare automaticamente quando è richiesta una scelta. Il passo di untap e normalmente cleanup non concedono priorità, con eccezioni previste dalle regole. Distinguere fase principale pre/post combattimento. Le magie stregoneria richiedono normalmente fase principale del proprio turno, pila vuota e priorità, salvo permessi/divieti.

## Parser semantico
Non usare sola ricerca di parole. Produrre un AST con nodi di target declaration, triggered ability (when/whenever/at), activated ability (cost: effect), conditional (if), intervening-if, replacement (if ... would ... instead), prevention, duration (until/end of turn), modal choices, optional (may), restrictions (only/as long as/unless), and continuous effect. Distinguere il testo di regole dal reminder text, e non inferire legalità del bersaglio dalla mera presenza della parola target. Un'abilità può bersagliare senza che la parola target compaia nel testo Oracle, quando le regole delle keyword lo stabiliscono (es. equip). Richiedere un risultato UNKNOWN per sintassi non supportata.

## Layer
Implementare effetti continui con layer, sublayer, timestamp, dipendenze e ricalcolo delle caratteristiche; conservare l'origine degli effetti e le durate. Non tentare Ashaya + Blood Moon prima di avere queste strutture.

## Regressioni minime
- Innesco 'At the beginning of your upkeep': solo upkeep del controllore corretto, con innesco sulla pila e priorità.
- 'When ... enters': innesco dopo entrata, senza risoluzione immediata.
- 'If' interveniente: controllare sia all'innesco sia alla risoluzione.
- 'If ... would ... instead': sostituzione, non abilità innescata.
- Target vs choose: solo dichiarazioni o regole di bersaglio definiscono i bersagli.
- Deflecting Swat: può bersagliare una magia/abilità sulla pila anche se priva di bersagli; il cambiamento richiede bersagli modificabili e nuovi bersagli legali.
- Magia stregoneria nel proprio main con pila vuota e priorità, contro fase di combattimento.
- Ashaya + Blood Moon con ordine e stato espliciti: UNKNOWN finché i layer non sono supportati.

Fonti normative da verificare prima di implementare: https://magic.wizards.com/en/rules (Comprehensive Rules, in particolare 117, 500–514, 601–603, 611–613 e 115). Verificare testo Oracle/ruling corrente delle carte su Scryfall.
