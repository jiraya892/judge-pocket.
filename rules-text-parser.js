/* Chapter 12: parse only extracted plain text; official provenance is verified separately. */
(function(root){'use strict';
const allowed=/^https:\/\/(?:magic\.wizards\.com|media\.wizards\.com)\//i;
const rule=/^([1-9]\d{2}(?:\.\d{1,3}[a-z]?)?)\.?\s+(.+)$/i;
function source(url){if(typeof url!=='string'||!allowed.test(url))return {supported:false,reason:'URL non ufficiale o non HTTPS'};try{const u=new URL(url);if(!['magic.wizards.com','media.wizards.com'].includes(u.hostname.toLowerCase())||u.username||u.password||u.port||!u.pathname.match(/\.(?:pdf|docx|txt)$/i))return {supported:false,reason:'Documento non consentito'};return {supported:true,url:u.href,host:u.hostname}}catch(e){return {supported:false,reason:'URL non valido'}}}
function parse(text,options={}){
 if(typeof text!=='string'||text.length>20000000||text.length<30)return {supported:false,reason:'Testo assente o troppo grande'};
 const head=text.slice(0,2500);
 if(!/Magic:\s*The Gathering Comprehensive Rules/i.test(head))return {supported:false,reason:'Intestazione Comprehensive Rules assente'};
 const date=head.match(/(?:effective as of)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})/i);
 if(!date)return {supported:false,reason:'Data di efficacia non riconosciuta'};
 const month=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(date[1].toLowerCase())+1;
 const edition=date[3]+'-'+String(month).padStart(2,'0')+'-'+date[2].padStart(2,'0');
 const d=new Date(edition+'T00:00:00Z');if(!month||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==edition)return {supported:false,reason:'Data impossibile'};
 if(options.expectedEdition&&options.expectedEdition!==edition)return {supported:false,reason:'Versione diversa da quella richiesta'};
 const lines=text.replace(/\r\n?/g,'\n').split('\n'),entries=[],seen=new Set();let active=null;
 const flush=()=>{if(active){active.text=active.text.trim();if(active.text)entries.push(active);active=null}};
 for(const raw of lines){const line=raw.trim();if(!line)continue;const m=rule.exec(line);if(m){if(seen.has(m[1]))return {supported:false,reason:'Numero di regola duplicato'};flush();seen.add(m[1]);active={id:m[1],text:m[2]};}else if(active&& !/^(?:Glossary|Credits|Index)$/i.test(line)){active.text+=' '+line}}
 flush();if(entries.length<(options.minRules??100))return {supported:false,reason:'Estrazione incompleta'};
 return {supported:true,edition,entries,ruleCount:entries.length,provenance:'unverified-extracted-text'};
}
root.JudgeRulesTextParser={source,parse};
})(typeof window!=='undefined'?window:globalThis);
