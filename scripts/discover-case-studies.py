"""Find candidate rule families in supplied Oracle/ruling data, not popularity.
Produces a research catalogue; a high score is not evidence of an interaction.
"""
import collections
import gzip
import hashlib
import json
import re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
patterns={
 'targeting':r'\b(?:hexproof|shroud|protection from)\b',
 'damage-vs-toughness':r'\bindestructible\b|target creature gets -\d+/-\d+',
 'zone-replacement':r'(?:put into (?:a|your|their) graveyard|would die).*instead|exile it instead',
 'counter-replacement':r'counters?.*(?:instead|twice that many|plus one)',
 'continuous-ability-loss':r'lose all abilities|loses all abilities|in addition to their other types',
}
compiled={k:re.compile(v,re.I|re.S)for k,v in patterns.items()}
cards={};sources=[]
for path in sorted(root.glob('oracle-cards-part-*.jsonl.gz')):
 sources.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 with gzip.open(path,'rt')as stream:
  for line in stream:
   c=json.loads(line);text='\n'.join([c.get('oracle_text','')]+[f.get('oracle_text','')for f in c.get('card_faces',[])])
   families=[k for k,p in compiled.items()if p.search(text)]
   if families:cards[c['oracle_id']]={'name':c['name'],'oracle_id':c['oracle_id'],'oracle_text':text,'url':c.get('scryfall_uri'),'families':families,'ruling_count':0,'relevant_rulings':[]}
counts=collections.Counter()
for path in sorted(root.glob('rulings-*.jsonl.gz')):
 with gzip.open(path,'rt')as stream:
  for line in stream:
   r=json.loads(line);card=cards.get(r.get('oracle_id'))
   if not card:continue
   card['ruling_count']+=1
   if any(k in r.get('comment','').lower()for k in ['target','instead','toughness','indestructible','protection','order','trigger']):
    if len(card['relevant_rulings'])<3:card['relevant_rulings'].append({k:r.get(k)for k in ['published_at','source','comment']})
for card in cards.values():
 for family in card['families']:counts[family]+=1
catalog={
 'source':'supplied Oracle and rulings snapshot',
 'method':'Mechanism-based candidates, ranked by relevant ruling count and Oracle complexity; not a popularity/confusion measurement.',
 'source_files':sources,
 'families':{family:{'candidate_count':counts[family],'examples':sorted([c for c in cards.values()if family in c['families']],key=lambda c:(-len(c['relevant_rulings']),-c['ruling_count'],len(c['oracle_text']),c['name']))[:12]}for family in compiled}
}
(root/'case-studies'/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
for family,n in counts.items():print(family,n)
