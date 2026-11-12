#!/usr/bin/env node
'use strict';
const https=require('node:https'),fs=require('node:fs'),crypto=require('node:crypto');
const landing='https://magic.wizards.com/en/rules';
const max=20_000_000;
function fetchText(url,contentType){
 return new Promise((resolve,reject)=>{
  const u=new URL(url);
  if(u.protocol!=='https:'||!['magic.wizards.com','media.wizards.com'].includes(u.hostname)||u.username||u.password||u.hash) return reject(Error('URL not allowed'));
  const req=https.get(u,{headers:{'User-Agent':'JudgePocket-RulesAudit/1.0','Accept':'text/plain,text/html;q=0.9'},timeout:20000},res=>{
   if(res.statusCode!==200){res.resume();return reject(Error('HTTP '+res.statusCode))}
   if(res.headers.location){res.resume();return reject(Error('Redirect forbidden'))}
   const type=String(res.headers['content-type']||'').toLowerCase();
   if(contentType&&!type.startsWith(contentType)){res.resume();return reject(Error('Unexpected content type '+type))}
   const length=Number(res.headers['content-length']);if(length>max){res.resume();return reject(Error('Content too large'))}
   let size=0;const chunks=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>max){req.destroy(Error('Content too large'));return}chunks.push(chunk)});
   res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
  });
  req.on('timeout',()=>req.destroy(Error('Timeout')));req.on('error',reject);
 });
}
async function main(){
 const report={status:'unsupported',authenticated:false,officialDigestVerified:false,importable:false,sourceIdentityVerified:false,landing,expectedEdition:'2026-11-06'};
 try{
  const html=await fetchText(landing,'text/html');
  const links=[...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1].replace(/&amp;/g,'&'));
  const urls=[...new Set(links.filter(x=>!x.includes('@')&&/^https:\/\/media\.wizards\.com\/[^?#]+\.txt(?:\?[^#]*)?$/i.test(x)))];
  if(urls.length!==1)throw Error('Expected one official TXT link, found '+urls.length);
  report.url=urls[0];
  const txt=await fetchText(urls[0],'text/plain');
  const date=txt.slice(0,2500).match(/effective as of\s+(\w+)\s+(\d{1,2}),?\s+(20\d{2})/i);
  if(!date)throw Error('Edition missing');
  const month=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(date[1].toLowerCase())+1;
  const edition=date[3]+'-'+String(month).padStart(2,'0')+'-'+date[2].padStart(2,'0');
  report.edition=edition;if(edition!==report.expectedEdition)throw Error('Edition mismatch: '+edition);
  if(!/Magic:\s*The Gathering Comprehensive Rules/i.test(txt.slice(0,2500)))throw Error('Header missing');
  const ids=new Set();let started=false;let glossary=false;let credits=false;
  for(const raw of txt.split(/\r?\n/)){const line=raw.trim();if(!started){if(/^100\.1\.\s/.test(line))started=true;else continue}
   if(/^Glossary$/.test(line)){glossary=true;continue}
   if(glossary){if(/^Credits$/.test(line))credits=true;continue}
   const m=/^([1-9]\d{2}\.\d{1,3}[a-z]?)\.?\s+/.exec(line);
   if(m){if(ids.has(m[1]))throw Error('Duplicate rule '+m[1]);ids.add(m[1])}
  }
  report.ruleCount=ids.size;report.hasGlossary=glossary;report.hasCredits=credits;
  report.missingRules=['100.1','101.1','613.1','614.1','615.1','704.1','903.1'].filter(x=>!ids.has(x));
  report.localTextSha256=crypto.createHash('sha256').update(txt,'utf8').digest('hex');
  if(ids.size<1000||!glossary||!credits||report.missingRules.length)throw Error('Structural coverage incomplete');
  report.status='review-required';
 }catch(e){report.reason=String(e.message||e).slice(0,250)}
 fs.mkdirSync('test-reports/official',{recursive:true});
 fs.writeFileSync('test-reports/official/diagnostic.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 if(report.status!=='review-required')process.exitCode=1;
}
main();
