# Capitolo 13 — Blocco 1: attestazioni e fiducia

`pin-authority.js` separa il registro dei digest revisionati dal manifest del documento. Il registro deve essere fornito da un canale indipendente dall'input: **un chiamante che costruisce da sé il registro può ancora simulare una revisione**. Il campo `reviewedBy:'independent-maintainer'` è soltanto una dichiarazione, non un'attestazione crittografica. Non sono stati aggiunti digest o testi ufficiali inventati.

`secure-rules-import.js` usa i pin indipendenti per controllare l'integrità ma dichiara sempre `authenticated:false` e `sourceIdentityVerified:false` finché non esiste una catena di fiducia verificabile. `judgeGate` non autorizza mai un verdetto verificato sulla sola base dell'importazione delle regole.

Questi moduli sono predisposizioni di sicurezza e test, **non una certificazione della provenienza Wizards of the Coast**. Restano da implementare un registro immutabile di pin approvati nella build, l'acquisizione ufficiale verificata e l'integrazione end-to-end della barriera di fiducia nel percorso di ogni verdetto.
