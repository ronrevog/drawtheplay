import subprocess,pathlib,imageio_ffmpeg
from faster_whisper import WhisperModel
ff=imageio_ffmpeg.get_ffmpeg_exe();m=WhisperModel('small',device='cpu',compute_type='int8')
for n in [0,1,2,3]:
 start=23 if n!=3 else 9
 subprocess.run([ff,'-y','-i',f'trailer/work/audio{n}.wav','-ss',str(start),'trailer/work/tail.wav'],capture_output=True)
 segs,_=m.transcribe('trailer/work/tail.wav',language='en',word_timestamps=True,initial_prompt='Playcall Football. Play now on PlayCallFootball.com.')
 print('SOURCE',n,flush=True)
 for s in segs:
  print([(round(w.start+start,2),round(w.end+start,2),w.word) for w in s.words],flush=True)
