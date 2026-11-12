# Capitolo 13 — Blocco 2: registro di fiducia controllato dalla build

`built-in-trust.js` definisce un registro **vuoto e congelato** di impronte approvate. Nessuna impronta ufficiale è stata inventata. `official-import-boundary.js` rifiuta un'importazione che non corrisponde a una voce approvata nella build; non accetta pin creati dal file importato o dal chiamante. I test di regressione dimostrano il comportamento di rifiuto in assenza di pin.

**Limiti:** la build JavaScript distribuita non costituisce da sola una root of trust inattaccabile; chi può modificare i file del sito può sostituire il registro o il codice. Il controllo SHA-256 dimostra integrità rispetto a un pin, non identità crittografica dell'editore. Il registro non autentica ancora nessuna versione delle Comprehensive Rules.

Le API sperimentali dei blocchi precedenti restano accessibili, ma non devono essere usate per dichiarare un corpus ufficiale o produrre verdetti verificati. L'integrazione end-to-end dei controlli nel percorso Judge resta un'attività successiva.
