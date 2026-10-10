from faster_whisper import WhisperModel
m=WhisperModel('base',device='cpu',compute_type='int8')
for n in range(4):
 segs,_=m.transcribe(f'trailer/work/audio{n}.wav')
 print('CLIP',n,flush=True)
 for s in segs: print(round(s.start,2),round(s.end,2),s.text,flush=True)
