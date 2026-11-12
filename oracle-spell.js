/* Narrow Oracle spell compiler. Never infer choices or execute unrecognized text. */
(function(root){'use strict';
function compile(card,context={}){
 const raw=card?.oracle_text;
 if(!raw||typeof raw!=='string'||card.card_faces?.length)return {supported:false,reason:'Testo Oracle singolo non disponibile o carta bifronte'};
 const text=raw.trim().replace(/\s+/g,' ');
 const type=card.type_line||'';
 if(!/\b(Instant|Sorcery)\b/i.test(type))return {supported:false,reason:'Per ora la risoluzione automatica riguarda soltanto istantanei e stregonerie semplici'};
 if(/[\n;]/.test(raw)||/\b(choose|unless|instead|if|when|whenever|until|for each|additional|rather|may|you can|where|X)\b/i.test(text))return {supported:false,reason:'Testo con scelte, condizioni o istruzioni multiple non supportato'};
 let m,kind=null,amount=null,targetKind=null;
 if((m=/^You gain (\d+) life\.$/i.exec(text))){kind='gainLife';amount=Number(m[1]);targetKind='controller'}
 else if((m=/^Target player gains (\d+) life\.$/i.exec(text))){kind='gainLife';amount=Number(m[1]);targetKind='player'}
 else if((m=/^Target player loses (\d+) life\.$/i.exec(text))){kind='loseLife';amount=Number(m[1]);targetKind='player'}
 else if((m=/^(.+?) deals (\d+) damage to target creature\.$/i.exec(text))&&m[1]===card.name){kind='dealDamage';amount=Number(m[2]);targetKind='creature'}
 else if((m=/^(.+?) deals (\d+) damage to any target\.$/i.exec(text))&&m[1]===card.name){kind='dealDamage';amount=Number(m[2]);targetKind='any'}
 else return {supported:false,reason:'Questo testo Oracle non è ancora traducibile in sicurezza'};
 if(!Number.isSafeInteger(amount)||amount<0)return {supported:false,reason:'Quantità non valida'};
 const players=context.players||['A','B'],objects=context.objects||[];
 if(targetKind==='controller'){
  if(!players.includes(context.controller))return {supported:false,reason:'Controllore mancante'};
  return {supported:true,instruction:{type:kind,player:context.controller,amount},text,targetKind};
 }
 if(targetKind==='player'){
  if(!players.includes(context.player))return {supported:false,requiresChoice:true,reason:'Scegli il giocatore bersaglio',targetKind};
  return {supported:true,instruction:{type:kind,player:context.player,amount},text,targetKind};
 }
 const candidate=objects.find(o=>o.id===context.target);
 if(!candidate)return {supported:false,requiresChoice:true,reason:'Scegli il permanente bersaglio',targetKind};
 if(candidate.zone!=='battlefield'||!candidate.types?.includes('creature'))return {supported:false,reason:'Il bersaglio selezionato non è una creatura sul campo'};
 return {supported:true,instruction:{type:kind,target:candidate.id,amount},text,targetKind,warning:targetKind==='any'?'Supportato soltanto il bersaglio creatura; giocatori e planeswalker richiedono ancora un percorso distinto':null};
}
root.JudgeOracleSpell={compile};
})(typeof window!=='undefined'?window:globalThis);
