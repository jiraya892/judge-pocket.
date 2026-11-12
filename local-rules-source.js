/* Chapter 11: local rule text must be supplied and independently curated.
   No production corpus is bundled yet: fail closed rather than fabricate a rule. */
(function(root){'use strict';
const valid=/^[1-9]\d{2}(?:\.\d{1,3}[a-z]?)?$/i;
let corpus=null;
function load(data){
 if(!data||typeof data!=='object'||data.source!=='Wizards of the Coast Comprehensive Rules'||typeof data.edition!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(data.edition)||!Array.isArray(data.entries)||!data.entries.length)return {supported:false,reason:'Corpus ufficiale locale non disponibile o metadati incompleti'};
 const rules=Object.create(null);
 for(const row of data.entries){if(!row||typeof row.id!=='string'||!valid.test(row.id)||typeof row.text!=='string'||!row.text.trim()||Object.prototype.hasOwnProperty.call(rules,row.id))return {supported:false,reason:'Regola duplicata o non valida'};rules[row.id]=row.text.trim()}
 corpus={source:data.source,edition:data.edition,rules};return {supported:true,edition:data.edition,count:data.entries.length};
}
function clear(){corpus=null;return {supported:true}}
function lookup(id){if(!corpus||typeof id!=='string'||!valid.test(id)||!Object.prototype.hasOwnProperty.call(corpus.rules,id))return {supported:false,reason:'Regola non presente nel corpus locale verificabile'};return {supported:true,id,text:corpus.rules[id],edition:corpus.edition,source:corpus.source}}
function verify(record){
 const found=lookup(record?.rule);
 if(!found.supported||typeof record?.excerpt!=='string'||!record.excerpt.trim())return {supported:false,reason:'Citazione non riscontrata nel corpus locale'};
 const normalize=x=>x.normalize('NFKC').replace(/\s+/g,' ').trim();
 if(!normalize(found.text).includes(normalize(record.excerpt)))return {supported:false,reason:'Citazione diversa dal testo locale'};
 return {supported:true,rule:found.id,excerpt:normalize(record.excerpt),source:'Comprehensive Rules',edition:found.edition,verifiedAgainstLocalText:true};
}
function status(){return {available:!!corpus,edition:corpus?.edition||null,count:corpus?Object.keys(corpus.rules).length:0}}
root.JudgeLocalRulesSource={load,clear,lookup,verify,status};
})(typeof window!=='undefined'?window:globalThis);
