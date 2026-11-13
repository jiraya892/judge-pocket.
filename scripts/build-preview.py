"""Assemble a reviewable Pages artifact without changing any source checkout.
Keeps main at the root and legacy preview at /preview, beta at /beta.
This script builds files only; deployment requires separate authorization.
"""
import argparse
import json
import shutil
from pathlib import Path

parser=argparse.ArgumentParser()
for name in ['main','legacy','beta','output']:
    parser.add_argument('--'+name,required=True,type=Path)
parser.add_argument('--commit',required=True)
args=parser.parse_args()
sources=[args.main.resolve(),args.legacy.resolve(),args.beta.resolve()]
out=args.output.resolve()
if out.exists():
    raise SystemExit('Refusing to overwrite an existing artifact directory')
for src in sources:
    if not (src/'index.html').is_file() or src==out or src in out.parents or out in src.parents:
        raise SystemExit('Invalid or overlapping source/output paths')
ignore=shutil.ignore_patterns('.git','.github','__pycache__','node_modules')
shutil.copytree(sources[0],out,ignore=ignore)
if (out/'preview').exists() or (out/'beta').exists():
    raise SystemExit('Main source already owns a preview directory; review before replacing it')
shutil.copytree(sources[1],out/'preview',ignore=ignore)
shutil.copytree(sources[2],out/'beta',ignore=shutil.ignore_patterns('.git','.github','__pycache__','node_modules','*.jsonl.gz'))
(out/'beta'/'BUILDINFO.json').write_text(json.dumps({'source_commit':args.commit,'channel':'approved-beta-preview'},indent=2)+'\n')
print('Artifact assembled. No deployment was performed.')
