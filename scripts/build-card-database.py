"""Build deterministic, compact browser shards from supplied Oracle archives.
No network, packages or model downloads. Existing archives remain unchanged.
"""
import gzip
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = root / 'data' / 'oracle'
out.mkdir(parents=True, exist_ok=True)
fields = ['id', 'oracle_id', 'name', 'type_line', 'oracle_text', 'power', 'toughness', 'mana_cost', 'colors', 'color_identity', 'rulings_uri', 'scryfall_uri', 'keywords', 'layout']
face_fields = ['name', 'type_line', 'oracle_text', 'power', 'toughness', 'mana_cost', 'colors']
records = {}
sources = []
for path in sorted(root.glob('oracle-cards-part-*.jsonl.gz')):
    sources.append({'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    with gzip.open(path, 'rt') as stream:
        for line in stream:
            card = json.loads(line)
            name = card.get('name')
            if not name:
                continue
            slim = {k: card[k] for k in fields if k in card}
            if card.get('card_faces'):
                slim['card_faces'] = [{k: f[k] for k in face_fields if k in f} for f in card['card_faces']]
            records[name] = slim
assert records, 'No Oracle data found'
buckets = {f'{i:02x}': [] for i in range(64)}
index = []
for name, card in sorted(records.items()):
    shard = f'{hashlib.sha256(name.encode()).digest()[0] % 64:02x}'
    buckets[shard].append(card)
    index.append([name, shard])
manifest = {}
for shard, cards in buckets.items():
    raw = json.dumps(cards, ensure_ascii=False, separators=(',', ':')).encode()
    packed = gzip.compress(raw, mtime=0)
    (out / f'{shard}.json.gz').write_bytes(packed)
    manifest[shard] = {'sha256': hashlib.sha256(packed).hexdigest(), 'bytes': len(packed), 'records': len(cards)}
ruling_buckets={key: [] for key in buckets}
for path in sorted(root.glob('rulings-*.jsonl.gz')):
    sources.append({'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    with gzip.open(path,'rt') as stream:
        for line in stream:
            ruling=json.loads(line)
            oracle_id=ruling.get('oracle_id','')
            if not oracle_id:
                continue
            shard=f'{int(oracle_id[:2],16)%64:02x}'
            ruling_buckets[shard].append({k:ruling[k] for k in ['oracle_id','source','published_at','comment'] if k in ruling})
ruling_manifest={}
for shard,rulings in ruling_buckets.items():
    rulings.sort(key=lambda r:(r['oracle_id'],r.get('published_at',''),r.get('comment','')))
    packed=gzip.compress(json.dumps(rulings,ensure_ascii=False,separators=(',',':')).encode(),mtime=0)
    (out/f'rulings-{shard}.json.gz').write_bytes(packed)
    ruling_manifest[shard]={'sha256':hashlib.sha256(packed).hexdigest(),'bytes':len(packed),'records':len(rulings)}
(out / 'index.json').write_text(json.dumps({'version': 1, 'source': 'supplied-scryfall-snapshot', 'sources': sources, 'count': len(index), 'cards': index, 'shards': manifest, 'rulingShards': ruling_manifest}, ensure_ascii=False, separators=(',', ':')))
print(f'{len(records)} Oracle cards; {len(buckets)} compressed shards; {sum(p.stat().st_size for p in out.iterdir())} bytes total')
