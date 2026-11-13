"""Actual local OCR on generated English title images; not real card photographs."""
import base64,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=None if os.environ.get('CI') else shutil.which('chromium'),headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))

 # Pin snapshot regressions; source-update transports have their own tests.
 page.route('https://api.scryfall.com/**',lambda route:route.abort())

 for title in ['Blood Moon','Ashaya, Soul of the Wild']:
  data=page.evaluate("title=>{const c=document.createElement('canvas');c.width=1500;c.height=600;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,1500,600);x.fillStyle='black';x.font='66px serif';x.fillText(title,70,140);return c.toDataURL('image/png').split(',')[1]}",title)
  Path('/tmp/'+title.split(',')[0].replace(' ','-')+'.png').write_bytes(base64.b64decode(data))
 page.goto('http://127.0.0.1:8000/context.html');page.locator('#card1').fill('Blood');page.locator('#suggest1').get_by_role('option',name='Blood Moon',exact=True).wait_for();print('PASS autocomplete Blood -> Blood Moon',flush=True)
 page.locator('#card2').fill('Ashaia');page.locator('#suggest2').get_by_role('option',name='Ashaya, Soul of the Wild',exact=True).wait_for();print('PASS typo Ashaia -> Ashaya',flush=True)
 page.locator('#card1').fill('');page.locator('#card2').fill('');page.get_by_text('Fotografa una carta',exact=True).click();page.locator('#cardPhoto').set_input_files('/tmp/Blood-Moon.png');page.wait_for_function("document.getElementById('card1').value==='Blood Moon'",timeout=120000);print('PASS real local WASM OCR: title image -> editable Blood Moon input',flush=True)
 page.locator('#cardPhoto').set_input_files('/tmp/Ashaya.png');page.wait_for_function("document.getElementById('card2').value==='Ashaya, Soul of the Wild'",timeout=120000);print('PASS second real OCR image fills second field and preserves first',flush=True)
 assert not errors,errors
 page.screenshot(path='/tmp/search-photo-success.png',full_page=True);b.close()
