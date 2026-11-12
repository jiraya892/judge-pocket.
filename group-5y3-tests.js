(function(root){'use strict';function run(){
const tests=[],check=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(e){tests.push({name,pass:false,error:String(e)})}};
const base=()=>({players:[{id:'A',life:20},{id:'B',life:20}],objects:[{id:'X',zone:'battlefield',controller:'A',types:['creature']}],stack:[],effects:[]});
const test=(patch,target={id:'X',kind:'object',sourceController:'B'})=>{let s=base();Object.assign(s.objects[0],patch);return root.JudgeTargets.check(s,target)};
check('shroud rejects own target',()=>{let r=test({shroud:true},{id:'X',kind:'object',sourceController:'A'});return r.supported&&!r.legal});
check('shroud rejects opposing target',()=>{let r=test({shroud:true});return r.supported&&!r.legal});
check('hexproof rejects opponent',()=>{let r=test({hexproof:true});return r.supported&&!r.legal});
check('hexproof permits controller',()=>test({hexproof:true},{id:'X',kind:'object',sourceController:'A'}).legal);
check('hexproof requires source controller',()=>{let r=test({hexproof:true},{id:'X',kind:'object'});return !r.supported&&!!r.requiredFacts});
check('hexproof rejects nonexistent source controller',()=>!test({hexproof:true},{id:'X',kind:'object',sourceController:'C'}).supported);
check('unknown protection fails closed',()=>{let r=test({protectionUnknown:true});return !r.supported&&!!r.requiredFacts});
check('shroud choose rejects',()=>{let s=base();s.objects[0].shroud=true;return !root.JudgeTargets.choose(s,[{id:'X',kind:'object',sourceController:'B'}]).supported});
check('hexproof assess marks illegal',()=>{let s=base();s.objects[0].hexproof=true;let r=root.JudgeTargets.assess(s,[{id:'X',kind:'object',sourceController:'B'}]);return r.supported&&r.allIllegal});
check('resolution rejects hexproof target',()=>{let s=base();s.objects[0].hexproof=true;s.stack=[{id:'spell',targets:[{id:'X',kind:'object',sourceController:'B'}],instruction:{type:'tap',target:'X',targetId:'X'}}];return root.JudgeResolution.plan(s,s.stack[0]).step==='allTargetsIllegal'});
return {passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}root.JudgeGroup5Y3Tests={run};})(typeof window!=='undefined'?window:globalThis);
