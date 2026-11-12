/* Chapter 12: structural coverage checks do not authenticate official completeness. */
(function(root){'use strict';
const id=/^([1-9]\d{2})(?:\.(\d{1,3})([a-z]?))?$/i;
function inspect(data,policy){
 if(!data||!Array.isArray(data.entries)||!policy||!Number.isInteger(policy.minRules)||policy.minRules<1)return {supported:false,reason:'Corpus o criteri di copertura non validi'};
 const seen=new Set(),sections=new Set(),duplicates=[],malformed=[],empty=[],subrules=[],missingParents=[];
 for(const entry of data.entries){const key=entry?.id,match=typeof key==='string'?id.exec(key):null;if(!match){malformed.push(String(key));continue}if(seen.has(key))duplicates.push(key);seen.add(key);sections.add(match[1]);if(typeof entry.text!=='string'||!entry.text.trim())empty.push(key);if(match[3])subrules.push({id:key,parent:match[1]+'.'+match[2]})}
 for(const item of subrules)if(!seen.has(item.parent))missingParents.push(item.id);
 const required=Array.isArray(policy.requiredRules)?policy.requiredRules:[];
 const missingRequired=required.filter(x=>typeof x!=='string'||!seen.has(x));
 const expectedSections=Array.isArray(policy.requiredSections)?policy.requiredSections:[];
 const missingSections=expectedSections.filter(x=>typeof x!=='string'||!sections.has(x));
 const blockers=duplicates.length+malformed.length+empty.length+missingParents.length+missingRequired.length+missingSections.length+(seen.size<policy.minRules?1:0);
 return {supported:true,complete:!blockers,coverage:'structural-only',count:seen.size,sections:[...sections].sort(),duplicates,malformed,empty,missingParents,missingRequired,missingSections,belowMinimum:seen.size<policy.minRules};
}
function compare(oldData,newData){if(!oldData||!newData||!Array.isArray(oldData.entries)||!Array.isArray(newData.entries))return {supported:false,reason:'Versioni non confrontabili'};const a=new Map(oldData.entries.map(e=>[e.id,e.text])),b=new Map(newData.entries.map(e=>[e.id,e.text]));return {supported:true,added:[...b.keys()].filter(k=>!a.has(k)),removed:[...a.keys()].filter(k=>!b.has(k)),changed:[...b.keys()].filter(k=>a.has(k)&&a.get(k)!==b.get(k))}}
root.JudgeCorpusCoverage={inspect,compare};
})(typeof window!=='undefined'?window:globalThis);
