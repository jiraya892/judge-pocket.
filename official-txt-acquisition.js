/* Chapter 14: acquire TXT only from a URL verified on Wizards' rules landing page. */
(function(root){'use strict';
const LANDING='https://magic.wizards.com/en/rules';
function discover(html){
 if(typeof html!=='string'||html.length>2000000)return {supported:false,reason:'Pagina non valida'};
 const links=[...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1].replace(/&amp;/g,'&'));
 const candidates=links.filter(x=>!x.includes('@')&&/^https:\/\/media\.wizards\.com\/[^?#]+\.txt(?:\?[^#]*)?$/i.test(x));
 if(candidates.length!==1)return {supported:false,reason:'Collegamento TXT ufficiale assente o ambiguo'};
 return {supported:true,url:candidates[0],landing:LANDING,discovery:'landing-page-link'};
}
async function acquire(fetcher){
 if(typeof fetcher!=='function')return {supported:false,reason:'Trasporto non disponibile'};
 let page;try{page=await fetcher(LANDING,{redirect:'error',credentials:'omit',cache:'no-store'})}catch(e){return {supported:false,reason:'Pagina ufficiale non raggiungibile'}};
 if(!page||page.ok!==true||page.url!==LANDING)return {supported:false,reason:'Origine pagina non verificata'};
 const html=await page.text();const found=discover(html);if(!found.supported)return found;
 let response;try{response=await fetcher(found.url,{redirect:'error',credentials:'omit',cache:'no-store'})}catch(e){return {supported:false,reason:'Documento non raggiungibile'}};
 if(!response||response.ok!==true||response.url!==found.url)return {supported:false,reason:'Origine documento non verificata'};
 const mime=response.headers?.get?.('content-type')||'';
 if(mime&&!/^text\/plain(?:\s*;|$)/i.test(mime))return {supported:false,reason:'Tipo di documento non valido'};
 const length=Number(response.headers?.get?.('content-length'));if(Number.isFinite(length)&&length>20000000)return {supported:false,reason:'Documento troppo grande'};
 const text=await response.text();if(typeof text!=='string'||text.length>20000000)return {supported:false,reason:'Documento troppo grande'};
 return {supported:true,text,url:found.url,landing:LANDING,authenticated:false,transport:'https-origin-checked',digestVerified:false};
}
root.JudgeOfficialTxtAcquisition={discover,acquire,landing:LANDING};
})(typeof window!=='undefined'?window:globalThis);
