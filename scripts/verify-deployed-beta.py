"""Verify the HTTPS deployment produced by the Pages job, never a guessed URL."""
import argparse
import json
import time
import urllib.request
import urllib.parse

parser=argparse.ArgumentParser()
parser.add_argument('--url',required=True)
parser.add_argument('--commit',required=True)
args=parser.parse_args()
base=args.url.rstrip('/')+'/beta/'
parts=urllib.parse.urlsplit(base)
if parts.scheme!='https' or not parts.hostname or parts.username or parts.password:
    raise SystemExit('Invalid public HTTPS deployment URL')
for attempt in range(30):
    try:
        with urllib.request.urlopen(base+'BUILDINFO.json',timeout=10) as response:info=json.load(response)
        if info.get('source_commit')==args.commit:
            break
    except (OSError,ValueError):
        pass
    time.sleep(2)
else:
    raise SystemExit('Deployment did not expose the expected commit')
with urllib.request.urlopen(base+'context.html',timeout=20) as response:html=response.read().decode()
assert 'quattro carte' in html,'Published UI does not expose the four-card beta'
with urllib.request.urlopen(base+'data/oracle/index.json',timeout=20) as response:cards=json.load(response)
assert cards['count']>=38000
print('Verified HTTPS beta:',base)
print('Verified deployment commit:',info['source_commit'])
print('Verified Oracle records:',cards['count'])
