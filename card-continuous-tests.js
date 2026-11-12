(function(root){
const moon={_instanceId:'m',type_line:'Enchantment',oracle_text:'Nonbasic lands are Mountains.'};
const forest={_instanceId:'f',type_line:'Legendary Creature — Elemental',oracle_text:"Ashaya's power and toughness are each equal to the number of lands you control.\nNontoken creatures you control are Forest lands in addition to their other types.",power:'*',toughness:'*'};
function check(cards,id,expected){const r=root.JudgeCardContinuous.run(cards,id);if(!r.supported||r.entering.toughness!==expected)throw Error('Expected toughness '+expected+': '+JSON.stringify(r))}
check([moon,forest],'f',0);
check([forest,moon],'f',0);
check([forest],'f',1);
const unsupported=root.JudgeCardContinuous.run([moon,{...forest,oracle_text:forest.oracle_text+'\nCreatures you control get +2/+2.'}],'f');
if(unsupported.supported)throw Error('Unsupported continuous modifier accepted');
root.JudgeCardContinuousTestResult='4 integration checks passed';
})(window);