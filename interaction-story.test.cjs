'use strict';
// Reducing visible caveats must not promote partial/unsupported engine results.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('interaction-story.js','utf8'),context);
const story=context.window.JudgeInteractionStory;
const outcome={scope:'draw-instructions',sourceName:'Example effect',requestedDraws:6,originalDraws:3,putBackInstructions:2,events:[],rules:['121.2'],results:[]};
let n=0;function check(name,fn){fn();n++;console.log('PASS '+name)}
check('a forged verified verdict cannot become a computed story',()=>{const r=story.build({status:'verified',verdict:'invented',diagnostic:{calculationVerified:true,computedOutcome:outcome}});assert.equal(r.status,'unsupported');assert.equal(r.verdict,undefined)});
check('an unverified calculation is not rendered as a result',()=>{const r=story.build({status:'partial',diagnostic:{calculationVerified:false,computedOutcome:outcome}});assert.equal(r.status,'unsupported')});
check('a scoped count remains partial and distinguishes requested from actual draws',()=>{const r=story.build({status:'partial',diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:outcome}});assert.equal(r.status,'partial');assert.match(r.lead,/6 pescate/);assert.match(r.note,/grimorio/);assert.equal(r.verdict,undefined)});
check('presentation does not mutate engine evidence or calculation',()=>{const input={status:'partial',diagnostic:{calculationVerified:true,sourceAuthenticationVerified:false,computedOutcome:outcome}};const before=JSON.stringify(input);story.build(input);assert.equal(JSON.stringify(input),before);assert.equal(input.diagnostic.sourceAuthenticationVerified,false)});
check('a dead attacker is not described as still fighting its blocker',()=>{const combat={scope:'single-blocked-combat',attackerId:'a',blockerId:'b',rules:[],results:[{id:'a',name:'Attacker',zone:'graveyard'},{id:'b',name:'Blocker',zone:'graveyard'}]};const r=story.build({status:'partial',diagnostic:{calculationVerified:true,computedOutcome:combat}});assert.match(r.paragraphs[0],/Entrambe/);assert.ok(!r.paragraphs.join(' ').includes('continua a bloccare'))});
console.log(n+'/'+n+' explanation boundary checks passed');
