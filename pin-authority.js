/* Chapter 13: independently provisioned pins, never accepted from imported content. */
(function(root){'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
function createAuthority(pins){
 const approved=Object.create(null);
 if(!Array.isArray(pins))return {supported:false,reason:'Registro di fiducia non valido'};
 for(const p of pins){if(!p||typeof p.edition!=='string'||typeof p.sha256!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(p.edition)||!/^[0-9a-f]{64}$/i.test(p.sha256)||p.reviewedBy!=='independent-maintainer'||p.publisher!=='Wizards of the Coast'||p.document!=='Comprehensive Rules')return {supported:false,reason:'Pin non approvato'};if(own(approved,p.edition))return {supported:false,reason:'Edizione duplicata'};approved[p.edition]={edition:p.edition,sha256:p.sha256.toLowerCase(),publisher:p.publisher,document:p.document,trust:'reviewed-pin'}}
 return {supported:true,lookup(edition){const p=approved[edition];return p?{...p}:null},count:Object.keys(approved).length};
}
function authorize(authority,manifest){if(!authority?.supported||typeof authority.lookup!=='function'||!manifest)return {supported:false,reason:'Autorità indipendente assente'};const pin=authority.lookup(manifest.edition);if(!pin||pin.sha256!==manifest.sha256?.toLowerCase()||pin.publisher!==manifest.publisher||pin.document!==manifest.document)return {supported:false,reason:'Nessun pin indipendente corrispondente'};return {supported:true,pin}}
root.JudgePinAuthority={createAuthority,authorize};
})(typeof window!=='undefined'?window:globalThis);
