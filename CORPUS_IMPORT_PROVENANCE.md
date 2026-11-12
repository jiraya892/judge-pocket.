# Capitolo 12 — Corpus Comprehensive Rules: importazione con digest fissato

Il Blocco 1 introduce `corpus-integrity.js` e `corpus-importer.js`. Il contenuto è serializzato in modo deterministico (coppie numero/testo, ordinate per numero), quindi verificato tramite SHA-256. L'importazione richiede un digest identico a un pin passato separatamente dall'input. Metadati dichiarati dal file non bastano.

**Nessun pin ufficiale è preinstallato.** I test usano esclusivamente regole sintetiche. Perciò l'app non importa automaticamente testi delle Comprehensive Rules e non dichiara una fonte autenticata. Un digest corrispondente a un pin dimostra integrità rispetto a quel pin, non che il pin sia stato pubblicato da Wizards. L'attendibilità del pin richiede una procedura indipendente di revisione della fonte e della versione.

Il formato di importazione è `{entries:[{id,text},...]}`, con un manifest `{publisher:'Wizards of the Coast',document:'Comprehensive Rules',edition:'YYYY-MM-DD',sha256:'...',trust:'reviewed-pin'}` e un elenco di pin attendibili passato separatamente. Un futuro passaggio deve introdurre un registro di pin controllato e un processo di estrazione del documento ufficiale, senza permettere che il file importato fornisca anche la propria prova di autenticità.

Limitazione: il caricamento diretto legacy `JudgeLocalRulesSource.load` resta disponibile per i test e per corpus locali non autenticati; la verifica di provenienza deve avvenire tramite `JudgeCorpusImporter.importCorpus`.