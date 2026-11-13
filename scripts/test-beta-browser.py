"""Available-browser beta checks. Emulation is not a real Android/iOS device."""
import json
import shutil
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 profile=tempfile.TemporaryDirectory(prefix='judge-beta-browser-')
 context=p.chromium.launch_persistent_context(profile.name,executable_path=None if os.environ.get('CI') else shutil.which('chromium'),headless=True,args=['--no-sandbox'],viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page=context.pages[0];errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/index.html')
 page.evaluate('navigator.serviceWorker.ready')
 page.reload()
 page.wait_for_function('navigator.serviceWorker.controller !== null')
 cdp=context.new_cdp_session(page);cdp.send('Page.enable')
 manifest=cdp.send('Page.getAppManifest')
 assert not manifest['errors'],manifest['errors']
 data=json.loads(manifest['data']);assert data['display']=='standalone';assert len(data['icons'])==2
 install=cdp.send('Page.getInstallabilityErrors')
 assert not install['installabilityErrors'],install
 print('PASS Chromium installability: manifest, icons, service worker and app shell')
 page.locator('#openGuided').click();page.wait_for_url('**/context.html')
 page.locator('#begin').click();assert page.locator('#inputError').is_visible()
 page.locator('#card1').fill('Blood Moo')
 page.locator('#suggest1').get_by_role('option',name='Blood Moon',exact=True).click()
 page.locator('#card2').fill('Ashaya, Soul')
 page.locator('#suggest2').get_by_role('option',name='Ashaya, Soul of the Wild',exact=True).click()
 page.locator('#addCard').click()
 page.locator('#card3').fill('Grizzly Bear')
 page.locator('#suggest3').get_by_role('option',name='Grizzly Bears',exact=True).click()
 page.locator('#begin').click()
 page.get_by_role('button',name='Le carte sono già sul campo di battaglia',exact=True).click()
 page.get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
 page.wait_for_function("document.getElementById('resultDetails').textContent.includes('CR 704.5f')")
 assert 'Ashaya, Soul of the Wild va nel cimitero' in page.locator('#status').inner_text()
 assert 'Grizzly Bears' in page.locator('#resultDetails').inner_text()
 assert '2/2' in page.locator('#resultDetails').inner_text()
 assert 'CR 613.8' in page.locator('#resultDetails').inner_text()
 assert (page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
 print('PASS mobile viewport: real local search, three cards, engine, SBA, result and rule references')
 page.get_by_text('Blood Moon — Oracle e ruling',exact=True).click()
 details=page.locator('#cardSources details').filter(has=page.get_by_text('Blood Moon — Oracle e ruling',exact=True))
 details.get_by_role('button',name='Mostra i ruling dello snapshot',exact=True).click()
 page.wait_for_function("document.getElementById('cardSources').textContent.includes('wotc:')")
 assert 'Nonbasic lands are Mountains.' in details.inner_text()
 print('PASS supplied Oracle and ruling records displayed without treating them as pair-specific rulings')
 assert page.evaluate('async()=> (await JudgeCardData.info()).count')==38779
 context.set_offline(True)
 page.reload();page.locator('#card1').fill('Blood Moon');page.locator('#card2').fill('Ashaya, Soul of the Wild')
 page.locator('#begin').click();page.get_by_role('button',name='Le carte sono già sul campo di battaglia',exact=True).click()
 page.get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
 page.wait_for_function("document.getElementById('resultDetails').textContent.includes('CR 704.5f')")
 assert page.evaluate("async()=> (await fetch('./uncached-network-probe?now='+Date.now())).status")==503
 if not page.evaluate('navigator.onLine'):
  assert 'Sei offline' in page.locator('#connectionStatus').inner_text()
 print('PASS offline reload: cached app, local Oracle shards and real calculation without network')
 context.set_offline(False)
 page.locator('#restart').click();page.locator('#card1').fill('Lightning Bolt');page.locator('#card2').fill('Darksteel Myr');page.locator('#begin').click()
 page.get_by_role('button',name='Sto lanciando una magia',exact=True).click()
 page.locator('#choices').get_by_role('button',name='Lightning Bolt',exact=True).click()
 page.get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
 page.wait_for_function("document.getElementById('resultDetails').textContent.includes('CR 702.12b')")
 assert 'Darksteel Myr' in page.locator('#resultDetails').inner_text()
 print('PASS real mobile spell flow: Oracle damage, priority, resolution and indestructible')
 page.locator('#restart').click();page.locator('#card1').fill('Soul Warden');page.locator('#card2').fill('Grizzly Bears');page.locator('#begin').click()
 page.get_by_role('button',name='Una carta sta entrando nel campo di battaglia',exact=True).click()
 page.locator('#choices').get_by_role('button',name='Grizzly Bears',exact=True).click()
 page.get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
 page.get_by_role('button',name='Giocatore A',exact=True).click()
 page.wait_for_function("document.getElementById('resultDetails').textContent.includes('CR 603.3')")
 assert 'guadagna 1 punto vita' in page.locator('#resultDetails').inner_text()
 page.screenshot(path='/tmp/judge-pocket-beta-mobile.png',full_page=True)
 print('PASS real mobile entry flow: contextual controller question, triggered ability and stack resolution')
 page.locator('#restart').click();page.locator('#card1').fill('Humility');page.locator('#card2').fill('Opalescence');page.locator('#begin').click()
 page.get_by_role('button',name='Le carte sono già sul campo di battaglia',exact=True).click()
 page.wait_for_function("document.getElementById('status').textContent.includes('non è ancora riconosciuta')")
 assert page.locator('#result').is_visible();assert page.locator('#step').is_hidden()
 page.locator('#restart').click();assert page.locator('#start').is_visible()
 assert not errors,errors
 print('PASS unsupported interaction and recovery: explicit limits, no blank screen or JavaScript errors')
 context.close();profile.cleanup()
 # WebKit provides an additional engine check only when installed. This is not
 # installation on a real iPhone and is deliberately reported separately.
 try:
  webkit=p.webkit.launch(headless=True)
 except Exception as exc:
  print('UNRUN WebKit:',str(exc).splitlines()[0])
 else:
  tab=webkit.new_page(viewport={'width':390,'height':844});tab.goto('http://127.0.0.1:8000/context.html');assert tab.locator('#begin').is_visible();webkit.close();print('PASS WebKit smoke (not a real iOS device)')
