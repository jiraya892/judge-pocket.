"""Actual Oracle and rule-engine UI checks for targeting case studies."""
import shutil
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=None if os.environ.get('CI') else shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844});errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 def begin(target):
  page.goto(os.environ.get('JUDGE_TEST_ORIGIN','http://127.0.0.1:8000')+'/context.html')
  page.locator('#card1').fill('Shock');page.locator('#card2').fill(target);page.locator('#begin').click()
  page.get_by_role('button',name='Sto lanciando una magia',exact=True).click()
  page.locator('#choices').get_by_role('button',name='Shock',exact=True).click()
  page.get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
 begin('Silver Knight')
 page.wait_for_function("document.getElementById('resultDetails').textContent.includes('CR 702.16b')")
 assert 'non può bersagliare Silver Knight' in page.locator('#status').inner_text()
 page.get_by_text('Stato delle carte dopo l’interazione',exact=True).click()
 assert 'sul campo di battaglia' in page.locator('#resultDetails').inner_text()
 print('PASS real UI: protection blocks the targeting attempt without damage')
 begin('Slippery Bogle')
 page.get_by_role('button',name='Lo stesso giocatore',exact=True).click()
 page.wait_for_function("document.getElementById('resultDetails').textContent.includes('CR 704.5g')")
 assert 'viene distrutta' in page.locator('#resultDetails').inner_text()
 print('PASS real UI: necessary controller question allows your own spell through hexproof')
 begin('Slippery Bogle')
 page.get_by_role('button',name='Un avversario',exact=True).click()
 page.wait_for_function("document.getElementById('resultDetails').textContent.includes('CR 702.11b')")
 assert 'non può bersagliare Slippery Bogle' in page.locator('#status').inner_text()
 assert not errors,errors
 print('PASS real UI: opposing spell is blocked and no false resolution is displayed')
 browser.close()
