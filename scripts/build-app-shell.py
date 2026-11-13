"""Refresh service-worker app-shell inventory from the actual entry pages."""
import json
import re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
assets=['./','./index.html','./context.html','./manifest.webmanifest','./version.json','./icons/icon-192.png','./icons/icon-512.png','./data/oracle/index.json']
for page in ['index.html','context.html']:
    for path in re.findall(r'<script src="(\./[^"]+)"',(root/page).read_text()):
        if path not in assets:
            assets.append(path)
for name in ['worker.min.js','tesseract-core-lstm.wasm.js','tesseract-core-lstm.wasm','eng.traineddata.gz']:
    assets.append('./vendor/ocr/'+name)
for asset in assets:
    assert asset=='./' or (root/asset).is_file(),asset
p=root/'sw.js'
s=p.read_text()
s,count=re.subn(r'const ASSETS=.*?;\n','const ASSETS='+json.dumps(assets,separators=(',',':'))+';\n',s,count=1)
assert count==1
p.write_text(s)
print(f'App shell: {len(assets)} assets, all present')
