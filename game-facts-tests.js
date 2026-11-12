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
 check('extra cards blocked',facts.validate({...ctx,board:'additional'}).code==='ADDITIONAL_PERMANENTS');
 check('present needs order',interview.next({cards:['A','B'],event:'present',controllers:['A','B'],board:'complete'}).key==='order');
 return {passed:tests.filter(t=>t.pass).length,total:tests.length,tests};}
root.JudgeGameFactsTests={run};
})(typeof window!=='undefined'?window:globalThis);
