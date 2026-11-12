(function(){
const k=window.JudgeLayers,out=document.getElementById('layerTestResults');let passed=0,failed=0;
function test(name,fn){const p=document.createElement('p');try{fn();passed++;p.className='ok';p.textContent='✓ '+name}catch(e){failed++;p.className='fail';p.textContent='✕ '+name+' — '+e.message}out.append(p)}
function ok(x){if(!x)throw Error('Asserzione fallita')}
const base={types:['creature'],power:2,toughness:2};
test('Layer 4 aggiunge tipo',()=>{const r=k.evaluate(base,[{layer:'4',kind:'addType',value:'artifact',timestamp:1}]);ok(r.supported&&r.state.types.includes('artifact'))});
test('Layer 7b prima di 7c indipendentemente dall’ordine input',()=>{const r=k.evaluate(base,[{layer:'7c',kind:'modifyPT',power:1,toughness:1,timestamp:1},{layer:'7b',kind:'setPT',power:4,toughness:4,timestamp:2}]);ok(r.supported&&r.state.power===5&&r.state.toughness===5)});
test('Timestamp determina ordine nel medesimo layer',()=>{const r=k.evaluate(base,[{layer:'7b',kind:'setPT',power:5,toughness:5,timestamp:20},{layer:'7b',kind:'setPT',power:3,toughness:3,timestamp:10}]);ok(r.supported&&r.state.power===5)});
test('Layer 6 rimuove abilità',()=>{const r=k.evaluate({...base,abilities:['flying']},[{layer:'6',kind:'removeAbility',value:'flying',timestamp:1}]);ok(r.supported&&!r.state.abilities.length)});
test('Dipendenze non simulate',()=>{ok(!k.evaluate(base,[{layer:'4',kind:'addType',value:'land',timestamp:1,dependency:true}]).supported)});
test('Blood Moon e Ashaya non producono falso verdetto',()=>{ok(!k.evaluate(base,[{layer:'4',kind:'nonbasicMountain',timestamp:1},{layer:'4',kind:'addForest',timestamp:2}]).supported)});
document.getElementById('layerTestSummary').textContent=passed+' test superati, '+failed+' falliti.';
})();