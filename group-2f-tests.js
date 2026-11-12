(function(root){'use strict';
function run(){const tests=[],check=(name,ok)=>tests.push({name,pass:!!ok});
const state=[{id:'x',value:0}];
const handlers={affected:()=>['x'],apply:(e,s)=>s.map(o=>({...o,value:e.value??o.value}))};
const order=effects=>root.JudgeDependencies.order(effects,state,handlers);
const e=(id,timestamp,dependency=[],value=0)=>({id,timestamp,dependency,value});
const simultaneous=order([e('a',5,[],1),e('b',5,[],2)]);
check('equal timestamps deterministic stable order',simultaneous.supported&&simultaneous.order.map(x=>x._id).join(',')==='a,b');
const reverse=order([e('late',1,['early'],9),e('early',10,[],3)]);
check('dependency overrides earlier timestamp',reverse.supported&&reverse.order.map(x=>x._id).join(',')==='early,late');
const cycle=order([e('a',5,['b'],1),e('b',7,['a'],2)]);
check('cycle ignores internal dependency and follows timestamp',cycle.supported&&cycle.order.map(x=>x._id).join(',')==='a,b');
const external=order([e('dependent',1,['a'],8),e('a',2,['b'],1),e('b',3,['a','outside'],2),e('outside',10,[],4)]);
check('cycle waits for external dependency',external.supported&&external.order[0]._id==='outside'&&external.order[external.order.length-1]._id==='dependent');
const twoCycles=order([e('a',1,['b'],1),e('b',2,['a'],2),e('c',3,['d','a'],3),e('d',4,['c'],4)]);
check('independent SCC dependency respected',twoCycles.supported&&twoCycles.order.map(x=>x._id).join(',')==='a,b,c,d');
const absent=order([e('a',1,['missing'])]);
check('unknown dependency fails closed',!absent.supported);
const changing=root.JudgeDependencies.order([e('grant',1,[],1),e('remove',2,[],2)],state,{
 affected:(effect,s)=>effect.id==='grant'&&s[0].value===2?[]:['x'],
 apply:handlers.apply
});
check('applicability change creates dependency',changing.supported&&changing.order[0]._id==='remove');
const unknown=root.JudgeDependencies.order([e('a',1),e('b',2)],state,{affected:()=>undefined,apply:handlers.apply});
check('unknown applicability fails closed',!unknown.supported);
check('original state immutable',state[0].value===0);
const duplicate=order([e('same',1),e('same',2)]);
check('duplicate effects rejected',!duplicate.supported);
return {passed:tests.filter(t=>t.pass).length,total:tests.length,tests};
}root.JudgeGroup2FTests={run};
})(typeof window!=='undefined'?window:globalThis);