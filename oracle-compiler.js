/* Conservative Oracle sentence compiler: only complete, unambiguous English sentences. */
(function(root){
'use strict';
function compile(text,context={}){
 if(typeof text!=='string'||!text.trim())return {supported:false,reason:'Testo Oracle mancante'};
 const s=text.trim().replace(/\.$/,'');
 // Refuse modal, conditional, triggered, targeted or compound effects.
 if(/\b(if|unless|instead|when|whenever|at the beginning|choose|may|target|each|then|until|for each)\b/i.test(s)||/[;\n]/.test(s))
  return {supported:false,reason:'Condizioni, bersagli o più istruzioni richiedono interpretazione completa'};
 const player=context.controller;
 let m;
 if((m=/^(?:you )?gain (\d+) life$/i.exec(s))){
  if(!player)return {supported:false,reason:'Controllore mancante'};
  return {supported:true,effects:[{type:'gainLife',player,amount:Number(m[1])}]};
 }
 if((m=/^(?:you )?lose (\d+) life$/i.exec(s))){
  if(!player)return {supported:false,reason:'Controllore mancante'};
  return {supported:true,effects:[{type:'loseLife',player,amount:Number(m[1])}]};
 }
 if((m=/^tap (?:this permanent|this creature|this artifact)$/i.exec(s))){
  if(!context.source)return {supported:false,reason:'Permanente sorgente mancante'};
  return {supported:true,effects:[{type:'tap',target:context.source}]};
 }
 if((m=/^untap (?:this permanent|this creature|this artifact)$/i.exec(s))){
  if(!context.source)return {supported:false,reason:'Permanente sorgente mancante'};
  return {supported:true,effects:[{type:'untap',target:context.source}]};
 }
 return {supported:false,reason:'Frase Oracle non implementata: nessuna esecuzione automatica'};
}
root.JudgeOracleCompiler={compile};
})(typeof window!=='undefined'?window:globalThis);
