# Capitolo 6 — Gruppo 6A

## Ambito
Primo miglioramento generale delle azioni basate sullo stato (Comprehensive Rules 704.5q): una creatura con segnalini +1/+1 e -1/-1 rimuove simultaneamente coppie in numero uguale. Il calcolo della costituzione e della letalità usa il totale dei segnalini prima della rimozione; i cambiamenti vengono registrati in un batch SBA con transizione dello stato. Nessuna eccezione per nomi o coppie di carte.

## Criteri di test
Dieci nuovi casi: cancellazione uguale, eccedenze positive/negative, nessun cambiamento, log, transizione, interazione con costituzione zero e danno letale, conteggi invalidi e immutabilità. La suite complessiva attesa è 462 test di gruppo più 71 core = 533. Confermare il risultato soltanto tramite `test-reports/latest/summary.md` per il commit esatto.

## Limiti
Non implementa tutte le SBA, i cicli a punto fisso, l'intero combattimento o l'interpretazione Oracle; il motore lavora su caratteristiche numeriche esplicite. Nessun cambiamento a `main`.
