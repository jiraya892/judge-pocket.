"""Real speech smoke, deliberately unavailable until the actual model is verified.
The public JFK sample is part of the pinned upstream whisper.cpp source.
This does not claim an Instagram reel was accessed or understood.
"""
import json
import tempfile
from pathlib import Path
from intake import HOME, IntakeError, normalize, transcribe
if __name__=='__main__':
 sample=HOME/'whisper.cpp/samples/jfk.wav'
 if not sample.is_file():raise SystemExit('Pinned upstream speech sample is missing')
 try:
  with tempfile.TemporaryDirectory(prefix='judge-asr-smoke-')as folder:
   folder=Path(folder);audio=folder/'audio.wav';duration=normalize(sample,audio)
   segments,language=transcribe(audio,folder,'en');text=' '.join(s['text']for s in segments).lower()
   if 'country'not in text or 'americans'not in text or len(text.split())<15:raise IntakeError('Real speech recognition did not recover the expected sample content')
   print(json.dumps({'status':'passed','test':'actual speech recognition, not Instagram','language':language,'duration_seconds':duration,'segments':len(segments)}))
 except IntakeError as error:raise SystemExit('Speech smoke blocked: '+str(error))
