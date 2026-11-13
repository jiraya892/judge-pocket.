/* Full fixed-damage untargeted creature sweepers, resolved on the real stack.
   Restricted to complete keyword-only creature texts and no responses. */
(function(root){'use strict';
function recognize(card){const m=/^(.+) deals (\d+) damage to each creature( without flying)?\.$/.exec(String(card.oracle_text||'').trim());return m&&m[1]===card.name&&/\b(Instant|Sorcery)\b/.test(card.type_line||'')&&Number.isSafeInteger(Number(m[2]))?{amount:Number(m[2]),groundOnly:!!m[3]}:null;}
function evaluate(spell,objects){
 const fail=reason=>({supported:false,status:'unsupported',reason}),pattern=recognize(spell);
 if(!pattern||!Array.isArray(spell.colors))return fail('Testo o colori della magia non completamente riconosciuti.');
 const affected=objects.filter(o=>!pattern.groundOnly||!o.recognizedCreatureTraits.includes('flying'));
 if(!affected.length)return fail('La risoluzione senza alcun destinatario non è ancora collegata a questo percorso.');
 const source=root.JudgeGuidedBridge.cardObject(spell,objects.length);Object.assign(source,{id:'sweeper-source',zone:'stack',objectIdentity:'sweeper-cast',oracle_text:''});
 const prevent=objects.filter(o=>o.preventsDamage||o.protectionColors?.some(c=>spell.colors.includes(c)));
 let state=root.JudgeTurnPipeline.create({players:[{id:'A',life:20},{id:'B',life:20}],objects:[...objects,source],effects:[],replacements:prevent.map(o=>({id:'sweeper-prevent-'+o.id,operation:'prevent',match:{type:'dealDamage',target:o.id}})),stack:[],pendingTriggers:[],turn:{activePlayer:'A',priorityPlayer:'A'},activePlayer:'A'});
 const instruction=affected.map(o=>({type:'dealDamage',target:o.id,amount:pattern.amount,targetDependency:'none'}));
 let r=root.JudgeTurnPipeline.apply(state,{type:'pushStack',kind:'spell',controller:'A',card:spell.name,cardObjectId:source.id,resolvesTo:'graveyard',description:spell.oracle_text,instruction});
 if(!r.supported)return fail(r.reason);state=r.state;
 for(const player of ['A','B']){r=root.JudgeTurnPipeline.apply(state,{type:'passPriority',player});if(!r.supported)return fail(r.reason);state=r.state;}
 if(state.stack.length||state.pendingTriggers.length||state.objects.find(o=>o.id===source.id)?.zone!=='graveyard')return fail('Risoluzione non completata.');
 const events=[{type:'untargetedDamage',description:spell.name+' non bersaglia: antimalocchio e velo non impediscono il suo effetto.'}];
 for(const object of objects){const after=state.objects.find(o=>o.id===object.id);events.push({type:'sweeperResult',description:object.name+': '+(!affected.some(o=>o.id===object.id)?'non riceve danno perché ha volare.':prevent.some(o=>o.id===object.id)?'il danno viene prevenuto.':after.zone==='graveyard'?'viene distrutta per danno letale.':pattern.amount+' danni segnati; resta sul campo.')});}
 const outcome={lifeChanges:Object.fromEntries(state.players.map(p=>[p.id,p.life-20])),scope:'untargeted-creature-damage',events,results:state.objects.map(o=>({id:o.id,name:o.name,status:'verified',zone:o.zone,types:o.types,subtypes:o.subtypes,power:o.power,toughness:o.toughness,damage:o.damage||0})),rules:['115.1a','608.2c','704.3','704.5g',...(prevent.length?['615.1']:[]),...(prevent.some(o=>o.protectionColors?.some(c=>spell.colors.includes(c)))?['702.16e']:[]),...(objects.some(o=>o.indestructible)?['702.12b']:[])]};
 return {supported:true,status:'verified',outcome};
}
async function guided(context,cards){
 const fail=reason=>({status:'unsupported',reason,diagnostic:{reasonCodes:['SWEEPER_UNSUPPORTED']}}),spell=cards[context.castingIndex],objects=[];
 for(let i=0;i<cards.length;i++)if(i!==context.castingIndex){const p=root.JudgeCreatureTraits.prepare(cards[i],i);if(!p.supported)return fail(p.reason);p.object.controller=p.object.owner='B';objects.push(p.object);}
 const r=evaluate(spell,objects);if(!r.supported)return fail(r.reason);
 if(!context.board)return {status:'question',key:'board',question:'Considero queste creature senza danni o segnalini precedenti e nessuna risposta o altro effetto. Confermi?',options:[{id:'complete',label:'Sì, considera soltanto queste carte'},{id:'additional',label:'No, ci sono altri elementi'}]};
 if(context.board!=='complete')return fail('Gli effetti aggiuntivi devono essere specificati.');
 return {status:'partial',title:'Danno senza bersagli',reason:r.outcome.events.map(e=>e.description).join(' '),outcome:r.outcome,diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:r.outcome,reasonCodes:[]}};
}
root.JudgeSweeperScenario={recognize,evaluate,guided};
})(typeof window!=='undefined'?window:globalThis);
