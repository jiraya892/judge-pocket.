"""Browser integration. Run while serving the checkout on 127.0.0.1:8000.
Uses real Oracle database records; replaces network transport only in the first test.
The separate question-cycle tests deliberately simulate verified engine outputs.
"""
import gzip
import glob
import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
cards = {}
for path in glob.glob(str(root / 'oracle-cards*.jsonl.gz')):
    with gzip.open(path, 'rt') as stream:
        for line in stream:
            card = json.loads(line)
            if card.get('name') in ['Ashaya, Soul of the Wild', 'Blood Moon']:
                cards[card['name']] = card
assert len(cards) == 2
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'), headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    def route_scryfall(route):
        from urllib.parse import urlparse, parse_qs
        query = parse_qs(urlparse(route.request.url).query)
        name = query.get('exact', [''])[0]
        data = cards.get(name) or {'data': []}
        route.fulfill(json=data)
    page.route('https://api.scryfall.com/**', route_scryfall)

    def begin():
        page.goto('http://127.0.0.1:8000/context.html')
        page.locator('#card1').fill('Ashaya, Soul of the Wild')
        page.locator('#card2').fill('Blood Moon')
        page.locator('#begin').click()
        assert page.locator('#question').inner_text() == 'Che cosa sta succedendo?'

    begin()
    page.get_by_role('button', name='Le carte sono già sul campo di battaglia', exact=True).click()
    page.wait_for_function("document.getElementById('status').textContent.includes('Fare altre domande')")
    assert page.locator('#step').is_hidden()
    assert 'non verifica ancora completamente' in page.locator('#status').inner_text()
    assert not errors, errors
    print('PASS real browser: Oracle -> planner -> real engine -> explicit unsupported; no irrelevant questions')

    begin()
    # This checks UI integration, not Magic-rule correctness.
    page.evaluate("""() => {
        JudgeCoordinator.evaluate = state => ({supported:true,status:'verified',warnings:[],results:state.objects.map(o => ({
            id:o.id,name:o.name,status:'verified',controller:o.controller
        }))});
    }""")
    page.get_by_role('button', name='Le carte sono già sul campo di battaglia', exact=True).click()
    page.get_by_role('button', name='Sì, considera soltanto queste carte', exact=True).click()
    page.wait_for_function("document.getElementById('question').textContent === 'Chi controlla Ashaya, Soul of the Wild?'")
    page.get_by_role('button', name='Giocatore A', exact=True).click()
    page.wait_for_function("document.getElementById('question').textContent === 'Chi controlla Blood Moon?'")
    page.locator('#reviewAnswers').click()
    page.locator('#answerReview button').click()
    page.wait_for_function("document.getElementById('question').textContent === 'Chi controlla Ashaya, Soul of the Wild?'")
    page.get_by_role('button', name='Giocatore B', exact=True).click()
    page.wait_for_function("document.getElementById('question').textContent === 'Chi controlla Blood Moon?'")
    page.get_by_role('button', name='Giocatore A', exact=True).click()
    page.wait_for_function("!document.getElementById('copyDiagnostic').hidden")
    assert page.locator('#step').is_hidden()
    assert 'Interazione non ancora supportata' in page.locator('#status').inner_text()
    assert not errors, errors
    print('PASS simulated verified engine: targeted questions, answer revision, no repeat, source gate retained')

    begin()
    page.evaluate("""() => { JudgeGuidedBridge.evaluate = () => new Promise(resolve => setTimeout(() => resolve({status:'question',key:'answers.stale',question:'STALE',options:[]}),300)); }""")
    page.get_by_role('button', name='Le carte sono già sul campo di battaglia', exact=True).click()
    page.locator('#restart').click()
    page.wait_for_timeout(400)
    assert page.locator('#start').is_visible()
    assert page.locator('#step').is_hidden()
    assert not errors, errors
    print('PASS stale asynchronous engine response cannot overwrite a restarted interview')
    browser.close()
