# Capitolo 15 — Blocco 1: diagnostica browser end-to-end

Aggiunta `rules-live-check.html`: apre una pagina di diagnostica nel browser PWA, con un pulsante che tenta davvero di scaricare la pagina https://magic.wizards.com/en/rules e il TXT Wizards collegato, quindi esegue parsing, controlli di copertura e digest locale tramite la pipeline del Capitolo 14. Non effettua importazioni e non promuove i risultati a verdetti.

Il browser mostra un rapporto sintetico con versione, numero di regole, digest locale oppure errore (anche possibile CORS). L'esecuzione è **manuale**: non abbiamo ancora un risultato verificato di questo download nel browser reale. Il tentativo di download diretto nell'ambiente di sviluppo è fallito per risoluzione DNS, quindi non è stato dichiarato un collaudo live riuscito. La pagina Wizards pubblica il TXT con versione 6 novembre 2026.

40 nuovi test automatici 15A–15D verificano i rapporti conservativi, non l'accesso reale alla rete. Per il prossimo blocco: acquisire un risultato live documentato e, se CORS impedisce l'accesso, progettare un job controllato lato GitHub Actions con verifica URL, limiti di dimensione, confronto delle versioni e approvazione esplicita prima della distribuzione.
