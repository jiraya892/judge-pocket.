"""Opt-in real local LLM -> browser review -> actual rules engine.
Requires authorized weights and an already-running model on loopback 8080.
Not part of CI; never downloads weights or activates public hosting.
"""
import json,os,shutil,sys,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'interpreter'))
from preview import create_preview
files,api=create_preview(port=0);origin='http://127.0.0.1:'+str(files.server_port)
for server in [files,api]:threading.Thread(target=server.serve_forever,daemon=True).start()
rows=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=None if os.environ.get('CI') else shutil.which('chromium'),args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':390,'height':844},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://api.scryfall.com/**',lambda route:route.abort())
  for label,text,status in [
    ('four-card-entry','Sul tavolo vedo Blood Moon, Grizzly Bears e Craw Wurm. Adesso arriva Ashaya, Soul of the Wild: che fine fa?','entra sul campo di battaglia e poi va nel cimitero'),
    ('target','Il mio avversario lancia Lightning Bolt sul mio Slippery Bogle. Riesce a bersagliarlo?','non può bersagliare')]:
   page.goto(origin+'/context.html');page.evaluate("()=>{window.__starts=0;const start=JudgeContextSession.start;JudgeContextSession.start=(c)=>{window.__starts++;return start(c)}}")
   page.locator('#sceneText').fill(text);start=time.monotonic();page.locator('#sceneAnalyse').click()
   confirm=page.get_by_role('button',name='Conferma la situazione ricostruita',exact=True)
   expect(confirm).to_be_enabled(timeout=95000);assert page.evaluate('window.__starts')==0
   latency=round(time.monotonic()-start,3);card_count=page.locator('#scenePreview select').count();assert card_count==(4 if label=='four-card-entry' else 2);confirm.click()
   page.locator('#choices').get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
   expect(page.locator('#status')).to_contain_text(status,timeout=15000)
   expect(page.locator('#result')).to_have_attribute('data-status','partial')
   assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   row={'case':label,'cards':card_count,'real_model':True,'real_oracle':True,'real_engine':True,'requires_confirmation':True,'source_gate_preserved':True,'elapsed_to_preview_seconds':latency,'result':page.locator('#status').text_content()};rows.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
  browser.close()
finally:
 for server in [files,api]:server.shutdown();server.server_close()
 (ROOT/'test-reports/ai-interpreter/real-browser.json').write_text(json.dumps({'cases':rows,'limitations':['Chromium touch viewport, not real Android/iOS hardware.','Model runs on the cloud CPU, not in the phone.','No public deployment.']},ensure_ascii=False,indent=2)+'\n')
