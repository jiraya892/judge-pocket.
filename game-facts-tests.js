/* Regression tests for explicit guided game facts. Open in browser or run in JS harness. */
(function(root){'use strict';
function run(){const interview=root.JudgeContextInterview,facts=root.JudgeGameFacts;const tests=[];const check=(name,pass)=>tests.push({name,pass:!!pass});
 const base={cards:['Card A','Card B'],event:'enter',entering:'1'};
 check('ask controllers',interview.next(base).key==='controllers');
 check('ask board',interview.next({...base,controllers:['A','B']}).key==='board');
 const ctx=interview.next({...base,controllers:['A','B'],board:'complete'}).context;
 check('ready',!!ctx&&ctx.enteringIndex===1);
 const state=facts.build(ctx,[{id:'a'},{id:'b'}]);check('controllers',state.objects[0].controller==='A'&&state.objects[1].controller==='B');check('entry order',state.timestamps.a===1&&state.timestamps.b===2);
 check('missing board blocked',facts.validate({...ctx,board:null}).code==='BOARD_UNKNOWN');
 check('extra cards need completion',facts.validate({...ctx,board:'additional'}).code==='ADDITIONAL_PERMANENTS');
 const extended={...ctx,cards:['A','B','C'],controllers:['A','B','A'],board:'additional',extraComplete:true,enteringIndex:1};
 const extra=facts.build(extended,[{id:'a'},{id:'b'},{id:'c'}]);check('extra card supported',extra.supported&&extra.objects.length===3);check('extra card controller',extra.objects[2].controller==='A');check('entry after other permanents',extra.timestamps.b===3);
 const three={cards:['A','B','C'],event:'present',controllers:['A','B','A'],board:'additional',extraComplete:true};check('three-card chronology asked',interview.next(three).key==='orderChoices');check('chronology second question',interview.next({...three,orderChoices:[2]}).key==='orderChoices');check('chronology ready',interview.next({...three,orderChoices:[2,0]}).context.order.join(',')==='2,0,1');
 check('present needs order',interview.next({cards:['A','B'],event:'present',controllers:['A','B'],board:'complete'}).key==='orderChoices');
 return {passed:tests.filter(t=>t.pass).length,total:tests.length,tests};}
root.JudgeGameFactsTests={run};
})(typeof window!=='undefined'?window:globalThis);
