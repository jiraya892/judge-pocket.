/* Group 4C: strict intervening-if predicates (CR 603.4). */
(function(root){'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const ops=new Set(['eq','ne','gt','gte','lt','lte','in']),roots=new Set(['event','before','after','source','controller']);
function valid(expr,depth=0){
 if(expr==null)return true;
 if(depth>24||typeof expr!=='object'||Array.isArray(expr))return false;
 const keys=Object.keys(expr);
 if(keys.length===1&&own(expr,'not'))return expr.not!=null&&valid(expr.not,depth+1);
 if(keys.length===1&&(own(expr,'all')||own(expr,'any'))){const xs=expr.all??expr.any;return Array.isArray(xs)&&xs.length>0&&xs.every(x=>x!=null&&valid(x,depth+1));}
 if(keys.length!==3||!['path','op','value'].every(k=>keys.includes(k))||!ops.has(expr.op)||typeof expr.path!=='string')return false;
 const parts=expr.path.split('.');
 if(!roots.has(parts[0])||parts.some(x=>!x||['__proto__','prototype','constructor'].includes(x)))return false;
 if(['gt','gte','lt','lte'].includes(expr.op)&&(typeof expr.value!=='number'||!Number.isFinite(expr.value)))return false;
 if(expr.op==='in'&&(!Array.isArray(expr.value)||!expr.value.length))return false;
 return true;
}
function read(ctx,path){let v=ctx;for(const p of path.split('.')){if(v===null||typeof v!=='object'||!own(v,p))return {found:false};v=v[p];}return {found:true,value:v};}
function evaluate(expr,ctx){
 if(expr==null)return true;
 if(own(expr,'all')){let unknown=false;for(const x of expr.all){const r=evaluate(x,ctx);if(r===false)return false;if(r===null)unknown=true;}return unknown?null:true;}
 if(own(expr,'any')){let unknown=false;for(const x of expr.any){const r=evaluate(x,ctx);if(r===true)return true;if(r===null)unknown=true;}return unknown?null:false;}
 if(own(expr,'not')){const r=evaluate(expr.not,ctx);return r===null?null:!r;}
 const found=read(ctx,expr.path);if(!found.found)return null;
 const v=found.value,w=expr.value;
 switch(expr.op){
 case 'eq':return v===w;case 'ne':return v!==w;
 case 'gt':return typeof v==='number'&&Number.isFinite(v)&&v>w;
 case 'gte':return typeof v==='number'&&Number.isFinite(v)&&v>=w;
 case 'lt':return typeof v==='number'&&Number.isFinite(v)&&v<w;
 case 'lte':return typeof v==='number'&&Number.isFinite(v)&&v<=w;
 case 'in':return w.includes(v);
 }return null;
}
function test(expr,ctx){return valid(expr)&&evaluate(expr,ctx)===true;}
function resolution(trigger,state){
 if(!trigger||!state||!Array.isArray(state.objects)||!trigger.context)return {supported:false,reason:'Contesto risoluzione non valido'};
 if(!valid(trigger.interveningIf))return {supported:false,reason:'Condizione non valida'};
 const source=state.objects.find(x=>x.id===trigger.source)||null;
 return {supported:true,resolves:test(trigger.interveningIf,{...trigger.context,after:state,source,controller:trigger.controller}),conditionChecked:trigger.interveningIf!=null};
}
root.JudgeTriggerConditions={valid,test,resolution};
})(typeof window!=='undefined'?window:globalThis);