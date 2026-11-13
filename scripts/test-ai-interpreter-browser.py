"""Actual UI -> interpreter HTTP API -> authored model fixture -> real Oracle/rules.
No model weights or real model inference. Chromium touch viewport, not a phone.
"""
import json,os,shutil,sys,threading
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'interpreter'))
from server import create_server
fixture=json.loads((ROOT/'case-studies/ai-interpreter-fixtures.json').read_text())['entry']
class FixtureModel:
 model='authored-test-fixture-not-real-model'
 def generate(self,text,candidates):return fixture['proposal']
origin=os.environ.get('JUDGE_TEST_ORIGIN','http://127.0.0.1:8000')
api=create_server(port=0,model=FixtureModel(),allowed_origins=[origin]);threading.Thread(target=api.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=None if os.environ.get('CI') else shutil.which('chromium'),args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://api.scryfall.com/**',lambda route:route.abort())
  page.route('**/data/ai/config.json',lambda route:route.fulfill(json={'version':1,'enabled':True,'endpoint':'http://127.0.0.1:'+str(api.server_port)+'/api/interpreter/scene','timeoutMs':3000}))
  page.goto(origin+'/context.html')
  page.evaluate("()=>{window.__starts=0;const start=JudgeContextSession.start;JudgeContextSession.start=(context)=>{window.__starts++;return start(context)}}")
  page.locator('#sceneText').fill(fixture['text']);page.locator('#sceneAnalyse').click()
  confirm=page.get_by_role('button',name='Conferma la situazione ricostruita',exact=True);expect(confirm).to_be_enabled()
  assert page.evaluate('window.__starts')==0
  expect(page.locator('#scenePreview')).to_contain_text('Ashaya, Soul of the Wild');expect(page.locator('#scenePreview')).to_contain_text(fixture['text'])
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  print('PASS optional AI HTTP proposal is grounded, readable and never starts the engine before confirmation',flush=True)
  confirm.click();assert page.evaluate('window.__starts')==1
  page.locator('#choices').get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
  expect(page.locator('#status')).to_contain_text('entra sul campo di battaglia e poi va nel cimitero')
  expect(page.locator('#result')).to_have_attribute('data-status','partial')
  print('PASS confirmed proposal reaches actual layer/dependency/entry/SBA engine, with no phase question and source gate preserved',flush=True)
  page.locator('#editScene').click();page.locator('#sceneText').fill(fixture['text']);page.locator('#sceneAnalyse').click();expect(confirm).to_be_visible()
  page.locator('#sceneText').fill('Descrizione cambiata');expect(confirm).to_have_count(0)
  assert page.evaluate('window.__starts')==1
  print('PASS editing the narrative invalidates the AI proposal and its confirmation',flush=True)
  page.locator('#sceneText').fill(fixture['text'])
  page.route('**/api/interpreter/scene',lambda route:route.fulfill(json={'version':1,'requiresConfirmation':True,'proposal':{**fixture['proposal'],'ruling':'invented'}}))
  page.locator('#sceneAnalyse').click();expect(page.locator('#sceneMessage')).to_contain_text('campi mancanti o non previsti')
  expect(confirm).to_have_count(0);assert page.evaluate('window.__starts')==1
  print('PASS model response containing a ruling is rejected before any engine call',flush=True)
  page.unroute('**/api/interpreter/scene')
  delayed=[];page.route('**/api/interpreter/scene',lambda route:delayed.append(route))
  page.locator('#sceneAnalyse').click();page.wait_for_function("document.querySelector('#sceneMessage').textContent==='Interpreto la descrizione…'")
  page.wait_for_timeout(150)
  assert len(delayed)==1
  page.locator('#sceneText').fill('Nuova descrizione')
  try:delayed[0].fulfill(json={'version':1,'requiresConfirmation':True,'proposal':fixture['proposal']})
  except Exception:pass # Browser may already have cancelled the fetch.
  expect(confirm).to_have_count(0);assert page.evaluate('window.__starts')==1
  print('PASS editing during inference cancels stale results',flush=True)
  assert not errors,errors
  browser.close()
finally:api.shutdown();api.server_close()
