"""Exercise the actual published four-card beta, without Scryfall fallback."""
import argparse
import json
import os
import shutil
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--url',required=True)
args=parser.parse_args()
url=args.url.rstrip('/')+'/beta/'
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
  text=page.locator('#resultDetails').inner_text()
  assert 'Grizzly Bears' in text and 'Craw Wurm' in text and '2/2' in text
  assert not errors,errors
  print('PASS published HTTPS beta: four cards, local database, actual engine and rule references')
 except Exception:
  diagnostic={'url':url,'errors':errors}
  try:diagnostic['status']=page.locator('#status').inner_text(timeout=1000)
  except Exception:pass
  message=json.dumps(diagnostic,ensure_ascii=False).replace('%','%25').replace('\n','%0A').replace('\r','%0D')
  print('::error title=Published beta verification::'+message)
  raise
 finally:
  browser.close()
