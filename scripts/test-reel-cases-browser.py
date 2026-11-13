"""Real mobile UI, local Oracle database and real rules modules; no mocked rulings."""
import os
import shutil
from playwright.sync_api import sync_playwright

origin = os.environ.get('JUDGE_TEST_ORIGIN', 'http://127.0.0.1:8000')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=None if os.environ.get('CI') else shutil.which('chromium'),
                                headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def begin(first, second, event):
        page.goto(origin + '/context.html')
        page.locator('#card1').fill(first)
        page.locator('#card2').fill(second)
        page.locator('#begin').click()
        page.get_by_role('button', name=event, exact=True).click()

    def confirm():
        page.get_by_role('button', name='Sì, considera soltanto queste carte', exact=True).click()

    def details():
        page.wait_for_function("document.getElementById('resultDetails').textContent.includes('Regole applicate')")
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
        return page.locator('#resultDetails').inner_text()

    begin('Dr. Beverly Crusher', 'Exemplar of Light', 'Un giocatore guadagna punti vita')
    confirm()
    for _ in range(2):
        page.get_by_role('button', name='Lo stesso giocatore', exact=True).click()
    text = details()
    assert text.count('si innesca 2 volte') == 2
    assert 'Conteggio degli inneschi, prima della risoluzione' in text
    assert 'Situazione finale' not in text
    assert 'non è un verdetto' in page.locator('#status').inner_text()
    page.screenshot(path='/tmp/judge-reel-trigger.png', full_page=True)
    print('PASS UI: actual life-gain triggers, no irrelevant cap-history question')

    begin('Dr. Beverly Crusher', 'Exemplar of Light', 'Una carta riceve segnalini +1/+1')
    page.locator('#choices').get_by_role('button', name='Exemplar of Light', exact=True).click()
    confirm()
    page.get_by_role('button', name='No, non ancora', exact=True).click()
    text = details()
    assert text.count('si innesca 1 volta') == 1
    assert 'si innesca 2 volte' not in text
    print('PASS UI: recipient retained, once-per-turn history requested and used')

    begin('Dr. Beverly Crusher', 'Resplendent Angel', 'Inizia la sottofase finale')
    confirm()
    assert 'Resplendent Angel' in page.locator('#question').inner_text()
    page.get_by_role('button', name='Lo stesso giocatore', exact=True).click()
    page.get_by_role('button', name='5 o più punti vita', exact=True).click()
    assert details().count('si innesca 1 volta') == 1
    print('PASS UI: end-step threshold, irrelevant doctor controller omitted')

    begin('Ridgetop Raptor', 'Darksteel Myr', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Ridgetop Raptor', exact=True).click()
    confirm()
    text = details()
    assert '4 danni segnati' in text
    assert 'subisce 0 danni' in text
    assert 'CR 510.1c' in text
    page.screenshot(path='/tmp/judge-reel-combat.png', full_page=True)
    print('PASS UI: double strike marks both steps, indestructible blocker survives')

    begin('Ridgetop Raptor', 'Grizzly Bears', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Ridgetop Raptor', exact=True).click()
    confirm()
    text = details()
    assert 'resta bloccata' in text and 'Nel cimitero' in text
    assert 'subisce 0 danni' in text
    print('PASS UI: first-step death does not unblock the attacker')

    begin('Mr. Spock, Science Officer', 'Brainstorm', 'Un effetto fa pescare carte')
    confirm()
    page.get_by_role('button', name='Lo stesso giocatore', exact=True).click()
    text = details()
    assert '6 pescate singole' in text
    assert 'Istruzioni di pescata, senza risoluzione completa' in text
    assert 'carte effettivamente pescate' in text
    page.screenshot(path='/tmp/judge-reel-draw.png', full_page=True)
    print('PASS UI: actual draw replacements, unchanged put-back instruction and explicit boundary')

    begin('Charging Badger', 'Darksteel Myr', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Charging Badger', exact=True).click()
    page.wait_for_function("document.getElementById('status').textContent.includes('Travolgere')")
    assert page.locator('#resultDetails').inner_text() == ''
    assert 'non ancora supportata' in page.locator('#status').inner_text()
    assert not errors, errors
    print('PASS UI: unsupported trample assignment is explicit and recoverable')
    browser.close()
