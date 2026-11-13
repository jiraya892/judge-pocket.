"""Synthetic transport/structure tests; these do not authenticate Wizards data."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('rules_monitor',Path(__file__).with_name('check-rules-update.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
URL='https://media.wizards.com/2026/downloads/MagicCompRules.txt'
def document(date='November 6, 2026'):
    rules={key:'Synthetic test rule.' for key in m.ANCHORS}
    rules.update({f'{chapter}.{n}':'Synthetic test rule.' for chapter in range(200,206) for n in range(1,201)})
    return ('Magic: The Gathering Comprehensive Rules\nThese rules are effective as of '+date+'.\nContents\nGlossary\n100. General\n'+'\n'.join(key+'. '+text for key,text in sorted(rules.items()))+'\nGlossary\nA term\nCredits\nTest fixture\n').encode()
class Updates(unittest.TestCase):
    def test_discover_deduplicates_same_official_link(self):
        self.assertEqual(m.discover(f'<a href="{URL}">TXT</a><a href="{URL}">TXT</a>'),URL)
    def test_no_untrusted_document_host_or_ambiguous_choice(self):
        for page in ['<a href="http://media.wizards.com/a.txt">x</a>','<a href="https://media.wizards.com.evil.test/a.txt">x</a>',f'<a href="{URL}">x</a><a href="https://media.wizards.com/b.txt">y</a>']:
            with self.assertRaises(ValueError):m.discover(page)
    def test_parse_full_structure_ignores_toc(self):
        result=m.parse_document(document());self.assertEqual(result['edition'],'2026-11-06');self.assertEqual(len(result['rules']),1207)
    def test_reject_partial_or_duplicate_document(self):
        for raw in [document().replace(b'903.1. Synthetic test rule.\n',b''),document().replace(b'Credits',b'Not credits'),b'Magic: The Gathering Comprehensive Rules']:
            with self.assertRaises(ValueError):m.parse_document(raw)
        with self.assertRaises(ValueError):m.parse_document(document().replace(b'Glossary\nA term',b'100.1. Duplicate\nGlossary\nA term'))
    def test_date_is_not_hardcoded_and_impossible_dates_fail(self):
        self.assertEqual(m.parse_document(document('January 22, 2027'))['edition'],'2027-01-22')
        with self.assertRaises(ValueError):m.parse_document(document('February 31, 2026'))
    def test_compare_added_removed_changed_rules(self):
        self.assertEqual(m.difference({'rules':{'100.1':'old','101.1':'same','102.1':'gone'}},{'rules':{'100.1':'new','101.1':'same','103.1':'added'}}),{'added':['103.1'],'removed':['102.1'],'changed':['100.1']})
    def test_acquisition_is_candidate_never_engine_import(self):
        with tempfile.TemporaryDirectory() as directory:
            def fetch(url,mime,*args):return f'<a href="{URL}">TXT</a>'.encode() if mime=='text/html' else document()
            report=m.run(Path(directory),fetch);self.assertFalse(report['authenticated']);self.assertFalse(report['importable']);self.assertFalse(report['engine_capabilities_changed']);self.assertTrue(report['requires_engine_review'])
    def test_unchanged_source_needs_no_new_engine_diff_review(self):
        with tempfile.TemporaryDirectory() as directory:
            fetch=lambda url,mime,*args:f'<a href="{URL}">TXT</a>'.encode() if mime=='text/html' else document()
            m.run(Path(directory),fetch);report=m.run(Path(directory),fetch);self.assertFalse(report['requires_engine_review']);self.assertEqual(report['changes'],{'added':[],'removed':[],'changed':[]});self.assertFalse(report['importable'])
    def test_failed_download_preserves_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory);fetch=lambda url,mime,*args:f'<a href="{URL}">TXT</a>'.encode() if mime=='text/html' else document()
            m.run(out,fetch);old=(out/'candidate.json').read_bytes()
            def fail(*args):raise OSError('source blocked')
            with self.assertRaises(OSError):m.run(out,fail)
            self.assertEqual((out/'candidate.json').read_bytes(),old);self.assertEqual(json.loads((out/'report.json').read_text())['status'],'unavailable')
    def test_older_edition_never_overwrites_newer_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory);current=[document()]
            fetch=lambda url,mime,*args:f'<a href="{URL}">TXT</a>'.encode() if mime=='text/html' else current[0]
            m.run(out,fetch);old=(out/'candidate.json').read_bytes();current[0]=document('April 17, 2026')
            with self.assertRaises(ValueError):m.run(out,fetch)
            self.assertEqual((out/'candidate.json').read_bytes(),old)
    def test_local_input_has_no_official_acquisition_claim(self):
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/'fixture.txt';file.write_bytes(document());r=m.run(Path(directory)/'output',local_document=file);self.assertIsNone(r['source_url']);self.assertEqual(r['transport'],'local-input-not-official-acquisition');self.assertFalse(r['importable'])
if __name__=='__main__':unittest.main()
