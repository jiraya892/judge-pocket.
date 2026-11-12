/* Limited, data-driven continuous effect outcome. No named card checks. */
(function(root){
'use strict';
function evaluate(objects,effects){
 const layer=root.JudgeLandLayers.evaluate(objects,effects);
 if(!layer.supported)return layer;
 const result=layer.objects.map((o,i)=>{
  const original=objects[i];
  const abilities=o.abilities;
  let power=original.power??null,toughness=original.toughness??null;
  if(original.ptDefinition){
   const definition=original.ptDefinition;
   const active=abilities.some(a=>a.id===definition.abilityId);
   if(active){
    if(definition.kind!=='landCount')return {supported:false,reason:'Definizione P/T sconosciuta'};
    const n=layer.objects.filter(x=>x.controller===original.controller&&x.types.includes('land')).length;
    power=n;toughness=n;
   }else{power=0;toughness=0}
  }
  return {...o,power,toughness,graveyardBySBA:o.types.includes('creature')&&toughness!==null&&toughness<=0};
 });
 const unsupported=result.find(x=>x.supported===false);
 if(unsupported)return unsupported;
 return {supported:true,objects:result,order:layer.order};
}
root.JudgeContinuousState={evaluate};
})(typeof window!=='undefined'?window:globalThis);
