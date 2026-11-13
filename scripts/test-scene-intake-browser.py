"""Real natural-text UI, Oracle snapshot and rules engine.
SpeechRecognition delivery/error events are simulated; no microphone/audio accuracy claim.
"""
import os,shutil
from playwright.sync_api import sync_playwright,expect
origin=os.environ.get('JUDGE_TEST_ORIGIN','http://127.0.0.1:8000')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=None if os.environ.get('CI') else shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://api.scryfall.com/**',lambda route:route.abort())
 def begin(text):
  page.goto(origin+'/context.html');page.locator('#sceneText').fill(text);page.locator('#sceneAnalyse').click()
 def confirm():
  expect(page.locator('#question')).not_to_contain_text('fase')
  page.locator('#choices').get_by_role('button',name='Sì, considera soltanto queste carte',exact=True).click()
  page.wait_for_function("document.querySelector('#result').dataset.status==='partial'")
 begin('Blood Moon è sul campo. Ho castato Ashaya. Cosa succede quando entra in campo?')
 expect(page.locator('#scenePreview select')).to_be_visible()
 page.locator('#scenePreview select').select_option('Ashaya, Soul of the Wild')
 confirm()
 expect(page.locator('#status')).to_have_text('Ashaya, Soul of the Wild entra sul campo di battaglia e poi va nel cimitero.')
 assert page.locator('#card1').input_value()=='' and page.locator('#card2').input_value()==''
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 print('PASS text -> genuine card-name clarification -> ETB and SBA without manual card fields or phase question',flush=True)
 page.locator('#editScene').click()
 expect(page.locator('#sceneText')).to_have_value('Blood Moon è sul campo. Ho castato Ashaya. Cosa succede quando entra in campo?')
 print('PASS description can be revised from the result without losing original words',flush=True)
 begin('Siamo nella sottofase di pesca. Blood Moon è sul campo. Ashaya, Soul of the Wild entra in campo. Cosa succede?')
 confirm();expect(page.locator('#status')).to_contain_text('entra sul campo di battaglia e poi va nel cimitero')
 assert 'sottofase di pesca' in page.locator('#sceneSourceText').text_content()
 print('PASS a stated but irrelevant draw step is preserved and does not become another question',flush=True)
 begin("All'inizio del mio mantenimento. Controllo Nyx-Fleece Ram e Grizzly Bears. Cosa succede?")
 confirm();expect(page.locator('#status')).to_contain_text('Guadagni 1 punto vita')
 print('PASS natural upkeep timing and controllers -> actual trigger, stack and life gain',flush=True)
 page.goto(origin+'/context.html')
 page.evaluate("()=>{window.__calls=0;const original=JudgeGuidedBridge.evaluate;JudgeGuidedBridge.evaluate=(...args)=>{window.__calls++;return original(...args)}}")
 page.locator('#sceneText').fill('Ho in campo Ashaya, Soul of the Wild e Blood Moon. Ci sono già due danni segnati su Ashaya.')
 page.locator('#sceneAnalyse').click();expect(page.locator('#scenePreview')).to_contain_text('Da chiarire')
 assert page.evaluate('window.__calls')==0
 expect(page.locator('#step')).to_be_hidden()
 print('PASS unparsed damage facts prevent any engine call; no discarded clause becomes a ruling',flush=True)
 page.goto(origin+'/context.html')
 page.evaluate("""()=>{const names=JudgeCardData.names;JudgeCardData.names=()=>new Promise(resolve=>{window.__releaseCatalogue=()=>names().then(value=>{resolve(value);return new Promise(done=>setTimeout(done,0))})});window.__sceneStarts=0;const original=JudgeContextSession.start;JudgeContextSession.start=(...args)=>{window.__sceneStarts++;return original(...args)}}""")
 page.locator('#sceneText').fill("All'inizio del mio mantenimento. Controllo Nyx-Fleece Ram e Grizzly Bears. Cosa succede?")
 page.locator('#sceneAnalyse').click()
 page.locator('#card1').fill('Blood Moon');page.locator('#card2').fill('Ashaya, Soul of the Wild');page.locator('#begin').click()
 page.evaluate('()=>window.__releaseCatalogue()')
 assert page.evaluate('window.__sceneStarts')==0
 expect(page.locator('#question')).to_have_text('Che cosa sta succedendo?')
 print('PASS a delayed description cannot overwrite a switch to manual interaction',flush=True)
 assert not errors,errors
 page.close()
 page=browser.new_page(viewport={'width':390,'height':844},has_touch=True)
 page.route('https://api.scryfall.com/**',lambda route:route.abort())
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""window.SpeechRecognition=class {
 constructor(){window.__speech=this;} start(){this.started=true;} stop(){this.onend?.();} abort(){this.aborted=true;}
 };""")
 page.goto(origin+'/context.html');page.locator('#sceneSpeech').click()
 assert page.locator('#sceneText').get_attribute('readonly') is not None
 assert page.locator('#sceneAnalyse').is_disabled()
 assert page.evaluate('window.__speech.continuous === true')
 transcript='Blood Moon è sul campo. Ashaya, Soul of the Wild entra in campo. Cosa succede?'
 page.evaluate("text=>window.__speech.onresult({results:[[{transcript:text}]]})",transcript)
 page.locator('#sceneSpeech').click()
 expect(page.locator('#sceneText')).to_have_value(transcript)
 assert page.locator('#sceneText').get_attribute('readonly') is None
 page.evaluate("window.__speech.onresult({results:[[{transcript:'late stale result'}]]})")
 expect(page.locator('#sceneText')).to_have_value(transcript)
 page.locator('#sceneAnalyse').click();confirm()
 expect(page.locator('#status')).to_contain_text('entra sul campo di battaglia e poi va nel cimitero')
 print('PASS simulated in-app speech delivery -> editable text -> real engine; late speech result ignored',flush=True)
 page.goto(origin+'/context.html');page.locator('#sceneSpeech').click();page.evaluate("window.__speech.onerror({error:'not-allowed'})")
 expect(page.locator('#sceneSpeechInfo')).to_contain_text('negato')
 assert page.locator('#sceneText').get_attribute('readonly') is None
 assert not page.locator('#sceneAnalyse').is_disabled()
 page.locator('#sceneText').fill(transcript);page.locator('#sceneAnalyse').click();confirm()
 print('PASS simulated microphone denial leaves typing and actual analysis available',flush=True)
 assert not errors,errors
 browser.close()
