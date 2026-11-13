"""Exercise the actual published four-card beta, without Scryfall fallback."""
import argparse
import json
import os
import shutil
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--url',required=True)
parser.add_argument('--app-at-root',action='store_true',help='Local CI server serves the app at / rather than /beta/')
args=parser.parse_args()
url=args.url.rstrip('/')+('/' if args.app_at_root else '/beta/')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=None if os.environ.get('CI') else shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 # A broken public shard must not be hidden by a successful online fallback.
 page.route('https://api.scryfall.com/**',lambda route:route.abort())
 try:
  response=page.goto(url+'context.html',wait_until='load',timeout=60000)
  assert response.status==200
  page.locator('#card1').fill('Blood Moon');page.locator('#card2').fill('Ashaya, Soul of the Wild')
  page.locator('#addCard').click();page.locator('#card3').fill('Grizzly Bears')
  page.locator('#addCard').click();page.locator('#card4').fill('Craw Wurm')
  page.locator('#begin').click()
  page.get_by_role('button',name='Le carte sono già sul campo di battaglia',exact=True).click()
  page.get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
  page.wait_for_function("document.getElementById('resultDetails').textContent.includes('CR 704.5f')",timeout=60000)
  assert page.locator('#result').get_attribute('data-status')=='partial'
  assert 'Ashaya, Soul of the Wild va nel cimitero.' in page.locator('#status').inner_text()
  states=page.locator('#resultDetails details').filter(has=page.locator('summary',has_text='Stato delle carte dopo l’interazione'))
  states.locator('summary').click()
  text=states.inner_text()
  assert 'Grizzly Bears: sul campo di battaglia, 2/2' in text
  assert 'Craw Wurm: sul campo di battaglia, 6/4' in text
  assert 'Ashaya, Soul of the Wild: nel cimitero' in text
  assert not errors,errors
  print('PASS '+('local predeploy check' if args.app_at_root else 'published HTTPS beta')+': four cards, local database, actual engine and rule references')
 except Exception as error:
  diagnostic={'url':url,'errors':errors,'reason':str(error)[:1500]}
  try:diagnostic['status']=page.locator('#status').inner_text(timeout=1000)
  except Exception:pass
  message=json.dumps(diagnostic,ensure_ascii=False).replace('%','%25').replace('\n','%0A').replace('\r','%0D')
  print('::error title=Published beta verification::'+message)
  raise
 finally:
  browser.close()
