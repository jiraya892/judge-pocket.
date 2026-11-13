"""UI and actual rules engine. HTTP fixtures supply real snapshot Oracle, not rulings.
A deliberately edited Oracle record separately tests fail-closed refresh behavior.
"""
import gzip,json,os,shutil
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
index=json.loads((root/'data/oracle/index.json').read_text())
def card(name):
 shard=dict(index['cards'])[name]
 return next(c for c in json.loads(gzip.decompress((root/f'data/oracle/{shard}.json.gz').read_bytes())) if c['name']==name)
origin=os.environ.get('JUDGE_TEST_ORIGIN','http://127.0.0.1:8000')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=None if os.environ.get('CI') else shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 # This card is intentionally absent from the bundled index in this transport fixture.
 reduced={**index,'cards':[pair for pair in index['cards'] if pair[0]!='Charging Monstrosaur'],'count':index['count']-1}
 page.route('**/data/oracle/index.json',lambda route:route.fulfill(json=reduced))
 def source(route,edited=False):
  url=urlparse(route.request.url)
  if url.path.endswith('autocomplete'):return route.fulfill(json={'data':['Charging Monstrosaur']})
  if url.path.endswith('/named'):
   name=parse_qs(url.query)['exact'][0];value=card(name)
   if edited and name=='Charging Monstrosaur':value['oracle_text']+='\nWhenever this creature attacks, draw a card.'
   return route.fulfill(json=value)
  return route.fulfill(json={'data':[]})
 page.route('https://api.scryfall.com/**',lambda route:source(route))
 page.goto(origin+'/context.html');page.locator('#card1').fill('Charging Mons')
 page.locator('#suggest1').get_by_role('option',name='Charging Monstrosaur',exact=True).click()
 page.locator('#card2').fill('Darksteel Myr');page.locator('#begin').click()
 page.get_by_role('button',name='Una creatura attaccante viene bloccata',exact=True).click()
 page.locator('#choices').get_by_role('button',name='Charging Monstrosaur',exact=True).click()
 page.locator('#choices').get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
 page.locator('#choices').get_by_role('button',name='1 danno al bloccante',exact=True).click()
 page.wait_for_function("document.querySelector('#result').dataset.status === 'partial'")
 assert '4 danni' in page.locator('#status').inner_text()
 print('PASS online name absent from bundled index -> refreshed Oracle -> actual combat calculation',flush=True)
 page.evaluate('navigator.serviceWorker.ready')
 page.wait_for_function('navigator.serviceWorker.controller !== null')
 page.context.set_offline(True);page.reload()
 assert page.evaluate("JudgeCardRefresh.get('Charging Monstrosaur').then(c=>c.name)")=='Charging Monstrosaur'
 page.locator('#card1').fill('Charging Mons')
 page.locator('#suggest1').get_by_role('option',name='Charging Monstrosaur',exact=True).wait_for()
 print('PASS persistent offline card and autocomplete after reload',flush=True)
 assert not errors,errors
 page.close()
 page=browser.new_page(viewport={'width':390,'height':844})
 page.route('https://api.scryfall.com/**',lambda route:source(route,True))
 page.goto(origin+'/context.html');page.locator('#card1').fill('Charging Monstrosaur');page.locator('#card2').fill('Darksteel Myr');page.locator('#begin').click()
 page.get_by_role('button',name='Una creatura attaccante viene bloccata',exact=True).click();page.locator('#choices').get_by_role('button',name='Charging Monstrosaur',exact=True).click()
 page.wait_for_function("document.querySelector('#result').dataset.status === 'unsupported'")
 assert 'non è ancora calcolabile' in page.locator('#status').inner_text()
 print('PASS changed Oracle with an unimplemented trigger rejects a previously supported snapshot result',flush=True)
 browser.close()
