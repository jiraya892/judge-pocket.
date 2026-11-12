# Capitolo 13 — Blocco 3: barriera nel percorso guidato

`guided-trust-gate.js` viene invocato da `context-ui.js` prima della visualizzazione e della copia della diagnostica. Senza fonte ufficiale autenticata nella build, i risultati guidati non sono mostrati come `verified`, il verdetto è azzerato e compare `OFFICIAL_SOURCE_UNVERIFIED`.

Il registro ufficiale nella build è vuoto: i risultati parziali non diventano verdetti. La UI usa `textContent` per evitare l'esecuzione di markup da dati esterni.

Limiti: il controllo è applicato alla UI guidata, non a ogni API sperimentale interna; un client ostile può ignorare la UI. Non è stato inventato alcun digest o testo ufficiale.
