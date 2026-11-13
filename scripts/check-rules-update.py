"""Monitor Wizards' dated TXT; save a candidate and rule-by-rule differences.
This never imports a corpus, authenticates a publisher digest, or edits engine code.
"""
import argparse
import datetime as dt
import hashlib
import html
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

LANDING = 'https://magic.wizards.com/en/rules'
MAX_BYTES = 20_000_000
ANCHORS = {'100.1', '101.1', '613.1', '614.1', '615.1', '704.1', '903.1'}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirect refused: rediscovery from the official landing page is required')

def download(url, mime, limit=MAX_BYTES):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in {'magic.wizards.com', 'media.wizards.com'} or parsed.username or parsed.password or parsed.port not in {None, 443} or parsed.fragment:
        raise ValueError('Unexpected source URL')
    request = urllib.request.Request(url, headers={'User-Agent': 'JudgePocket-RulesMonitor/1.0', 'Accept': mime})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
        if response.status != 200 or response.headers.get_content_type() != mime:
            raise ValueError('Unexpected response status or content type')
        raw = response.read(limit + 1)
        if len(raw) > limit:
            raise ValueError('Source too large')
        return raw

def discover(page):
    links = {html.unescape(x) for x in re.findall(r'href\s*=\s*["\']([^"\']+)["\']', page, re.I)}
    candidates = [u for u in links if re.fullmatch(r'https://media\.wizards\.com/[^?#@]+\.txt(?:\?[^#]*)?', u, re.I)]
    if len(candidates) != 1:
        raise ValueError('Official TXT link missing or ambiguous')
    return candidates[0]

def parse_document(raw, minimum=1000):
    text = raw.decode('utf-8-sig').replace('\r\n', '\n').replace('\r', '\n')
    if not re.search(r'Magic:\s*The Gathering Comprehensive Rules', text[:2500], re.I):
        raise ValueError('Missing Comprehensive Rules header')
    match = re.search(r'effective as of\s+(\w+ \d{1,2},? 20\d{2})', text[:2500], re.I)
    if not match:
        raise ValueError('Missing effective date')
    edition = dt.datetime.strptime(match[1].replace(',', ''), '%B %d %Y').date().isoformat()
    rules = {}; active = None; started = False; glossary = False; credits = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not started:
            if re.match(r'^100\.1\.\s', line): started = True
            else: continue
        if line == 'Glossary': glossary = True; continue
        if glossary:
            if line == 'Credits': credits = True
            continue
        found = re.match(r'^([1-9]\d{2}\.\d{1,3}[a-z]?)\.?\s+(.+)$', line)
        if found:
            active = found[1]
            if active in rules: raise ValueError('Duplicate rule ' + active)
            rules[active] = found[2]
        elif line and active and not re.match(r'^[1-9]\d{2}\.\s', line):
            rules[active] += ' ' + line
    if len(rules) < minimum or not ANCHORS.issubset(rules) or not glossary or not credits:
        raise ValueError('Incomplete document')
    return {'edition': edition, 'rules': rules, 'document_sha256': hashlib.sha256(raw).hexdigest()}

def difference(previous, current):
    old = previous.get('rules', {}) if previous else {}; new = current['rules']
    return {'added': sorted(new.keys() - old.keys()), 'removed': sorted(old.keys() - new.keys()),
            'changed': sorted(k for k in old.keys() & new.keys() if old[k] != new[k])}

def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp'); temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    os.replace(temporary, path)

def run(output, fetch=download, local_document=None):
    previous_path = output / 'candidate.json'
    previous = None
    try:
        previous = json.loads(previous_path.read_text()) if previous_path.exists() else None
        if local_document:
            raw = local_document.read_bytes(); source = None; transport = 'local-input-not-official-acquisition'
        else:
            source = discover(fetch(LANDING, 'text/html', 2_000_000).decode('utf-8'))
            raw = fetch(source, 'text/plain'); transport = 'official-https-origin-checked'
        candidate = parse_document(raw)
        if previous and candidate['edition'] < previous['edition']:
            raise ValueError('Edition rollback refused')
        changes = difference(previous, candidate)
        candidate.update({'source_url': source, 'transport': transport, 'authenticated': False, 'importable': False})
        report = {'status': 'candidate', 'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(),
                  'edition': candidate['edition'], 'previous_edition': previous.get('edition') if previous else None,
                  'document_sha256': candidate['document_sha256'], 'rule_count': len(candidate['rules']),
                  'changes': changes, 'first_observation': previous is None,
                  'requires_engine_review': previous is None or any(changes.values()),
                  'engine_capabilities_changed': False, 'authenticated': False, 'importable': False,
                  'source_url': source, 'transport': transport}
        # One candidate includes its complete rules and digest; no half-written active corpus.
        atomic_json(previous_path, candidate); atomic_json(output / 'report.json', report)
        return report
    except Exception as error:
        atomic_json(output / 'report.json', {'status': 'unavailable', 'reason': str(error)[:400],
                    'last_candidate_preserved': previous is not None, 'authenticated': False, 'importable': False})
        raise

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('.cache/rules-monitor'))
    parser.add_argument('--local-document', type=Path, help='Parser/diff validation only; never labels input as official acquisition')
    args = parser.parse_args()
    try:
        report = run(args.output, local_document=args.local_document)
        print(json.dumps({k: v for k, v in report.items() if k != 'changes'}, indent=2))
        print('Rule changes:', {key: len(value) for key, value in report['changes'].items()})
    except Exception as error:
        print('Rules check failed:', error, file=sys.stderr); sys.exit(1)
