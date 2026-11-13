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
    assert page.locator('#status').inner_text().count('si innesca 2 volte') == 2
    assert 'intera catena' in text
    assert 'Situazione finale' not in text
    assert page.locator('#result').get_attribute('data-status') == 'partial'
    page.screenshot(path='/tmp/judge-reel-trigger.png', full_page=True)
    print('PASS UI: actual life-gain triggers, no irrelevant cap-history question')

    begin('Dr. Beverly Crusher', 'Exemplar of Light', 'Una carta riceve segnalini +1/+1')
    page.locator('#choices').get_by_role('button', name='Exemplar of Light', exact=True).click()
    confirm()
    page.get_by_role('button', name='No, non ancora', exact=True).click()
    text = details()
    assert page.locator('#status').inner_text().count('si innesca 1 volta') == 1
    assert 'si innesca 2 volte' not in page.locator('#status').inner_text()
    print('PASS UI: recipient retained, once-per-turn history requested and used')

    begin('Dr. Beverly Crusher', 'Resplendent Angel', 'Inizia la sottofase finale')
    confirm()
    assert 'Resplendent Angel' in page.locator('#question').inner_text()
    page.get_by_role('button', name='Lo stesso giocatore', exact=True).click()
    page.get_by_role('button', name='5 o più punti vita', exact=True).click()
    details()
    assert page.locator('#status').inner_text().count('si innesca 1 volta') == 1
    print('PASS UI: end-step threshold, irrelevant doctor controller omitted')

    begin('Ridgetop Raptor', 'Darksteel Myr', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Ridgetop Raptor', exact=True).click()
    confirm()
    text = details()
    assert '4 danni segnati' in text
    assert 'non subisce danni' in page.locator('#status').inner_text()
    assert 'CR 510.1c' in text
    page.screenshot(path='/tmp/judge-reel-combat.png', full_page=True)
    print('PASS UI: double strike marks both steps, indestructible blocker survives')

    begin('Ridgetop Raptor', 'Grizzly Bears', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Ridgetop Raptor', exact=True).click()
    confirm()
    text = details()
    assert 'rimane una creatura bloccata' in text and 'muore' in text
    assert 'non subisce danni' in page.locator('#status').inner_text()
    print('PASS UI: first-step death does not unblock the attacker')

    begin('Mr. Spock, Science Officer', 'Brainstorm', 'Un effetto fa pescare carte')
    confirm()
    page.get_by_role('button', name='Lo stesso giocatore', exact=True).click()
    text = details()
    assert '6 pescate' in page.locator('#status').inner_text()
    assert 'contenuto del grimorio' in text
    page.screenshot(path='/tmp/judge-reel-draw.png', full_page=True)
    print('PASS UI: actual draw replacements, unchanged put-back instruction and explicit boundary')

    begin('Charging Badger', 'Darksteel Myr', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Charging Badger', exact=True).click()
    confirm()
    details()
    assert page.locator('#result').get_attribute('data-status') == 'partial'
    assert 'non subisce danni' in page.locator('#status').inner_text()
    begin('Progenitus', 'Darksteel Myr', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Progenitus', exact=True).click()
    page.wait_for_function("document.getElementById('result').getAttribute('data-status') === 'unsupported'")
    assert 'Regole applicate' not in page.locator('#resultDetails').inner_text()
    assert not errors, errors
    print('PASS UI: unique trample assignment works; unrecognized abilities remain recoverable')

    begin('Dr. Beverly Crusher', 'Exemplar of Light', 'Un giocatore guadagna punti vita')
    confirm()
    for _ in range(2):page.get_by_role('button', name='Lo stesso giocatore', exact=True).click()
    details()
    page.locator('#moreContext').click()
    page.locator('#contextCard').fill("Ajani's Pridemate")
    page.locator('#suggestContext').get_by_role('option', name="Ajani's Pridemate", exact=True).click()
    page.locator('#applyContext').click()
    confirm()
    assert "Ajani's Pridemate" in page.locator('#question').inner_text()
    page.get_by_role('button', name='Lo stesso giocatore', exact=True).click()
    details()
    assert page.locator('#status').inner_text().count('si innesca 2 volte') == 3
    assert 'non autenticata' not in page.locator('#resultDetails').inner_text()
    print('PASS UI: add a third card, preserve old answers and ask only its relevant controller')

    page.locator('#moreContext').click()
    page.locator('#contextNote').fill('Ci sono già due danni segnati sulla creatura.')
    page.locator('#applyContext').click()
    page.wait_for_function("document.getElementById('result').dataset.status === 'unsupported'")
    assert 'Ho conservato il dettaglio' in page.locator('#resultDetails').inner_text()
    assert 'si innesca 2 volte' not in page.locator('#status').inner_text()
    page.locator('#moreContext').click()
    assert page.locator('#contextNote').input_value() == 'Ci sono già due danni segnati sulla creatura.'
    print('PASS UI: an unparsed added detail is retained and blocks a stale calculation')

    begin('Dr. Beverly Crusher', 'Exemplar of Light', 'Una carta riceve segnalini +1/+1')
    page.locator('#choices').get_by_role('button', name='Exemplar of Light', exact=True).click()
    confirm()
    page.get_by_role('button', name='No, non ancora', exact=True).click()
    details()
    page.locator('#moreContext').click()
    page.locator('#contextAnswerReview button').filter(has_text='si è già innescata').click()
    page.get_by_role('button', name='Sì, si è già innescata', exact=True).click()
    details()
    assert 'non si innesca nessuna' in page.locator('#status').inner_text()
    assert not errors, errors
    print('PASS UI: edit a previous answer from the result and recompute the limited trigger')

    begin('Craw Wurm', 'Zilortha, Strength Incarnate', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Craw Wurm', exact=True).click()
    confirm()
    text = details()
    assert 'forza 7' in text and '6 danni segnati' in text
    assert 'quindi sopravvive' in text
    print('PASS UI: Oracle power-based lethal damage is explained without card-pair exceptions')

    begin('Child of Night', 'Darksteel Myr', 'Una creatura attaccante viene bloccata')
    page.locator('#choices').get_by_role('button', name='Child of Night', exact=True).click()
    confirm()
    assert 'guadagna 2 punti vita' in details()
    assert not errors, errors
    print('PASS UI: lifelink gain against indestructible is explained in plain language')
    browser.close()
