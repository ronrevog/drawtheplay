import pathlib,subprocess,json,wave
import numpy as np
import imageio_ffmpeg
root=pathlib.Path('E:/REPOS/drawtheplay');work=root/'trailer/work';ff=imageio_ffmpeg.get_ffmpeg_exe();sources=sorted(pathlib.Path('E:/REPOS/DRAW_THE_PLAY').glob('*.m4v'))
# Source index, in-point, duration. All four supplied clips appear in the cut.
shots=[(0,0,1.5),(0,4,1.5),(3,0,1.5),(1,0,2),(1,2,2),(0,8,1.5),(2,1,2),(2,3.5,2),(2,6,1.5),(1,7.5,2.5),(0,12,2.5),(3,9,2),(2,10,2),(2,12,2),(1,20,1.5),(1,22,1.5),(0,9,1),(2,18,1),(0,6,1),(1,25,1),(2,21,1),(3,5.5,1),(2,23,1),(1,26,1),(1,18,1.5)]
# 38 seconds of action followed by 7 seconds of brand resolve.
print('Action duration',sum(s[2] for s in shots),flush=True)
at=0; timeline=[]
for i,(src,start,dur) in enumerate(shots):
 out=work/f'shot{i:02}.mp4'
 vf='scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=24,eq=contrast=1.06:saturation=1.06'
 if i==0:vf+=',fade=t=in:st=0:d=0.35'
 r=subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-ss',str(start),'-i',str(sources[src]),'-t',str(dur),'-vf',vf,'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(out)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
 timeline.append(dict(source=str(sources[src]),sourceIn=start,duration=dur,at=at));at+=dur
 print('Cut',i+1,'/',len(shots),flush=True)
enddur=45-at
# Deterministic branded card, using the existing unmodified transparent logo.
font='C\\:/Windows/Fonts/arialbd.ttf';reg='C\\:/Windows/Fonts/arial.ttf'
fc=f"[0:v][1:v]overlay=(W-w)/2:90,drawtext=fontfile='{font}':text='YOUR TEAM. YOUR CALL.':fontcolor=white:fontsize=42:x=(w-tw)/2:y=465,drawtext=fontfile='{reg}':text='PLAYCALLFOOTBALL.COM':fontcolor=0x62c9ff:fontsize=27:x=(w-tw)/2:y=550,fade=t=in:st=0:d=0.25,fade=t=out:st={enddur-.5}:d=0.5[v]"
r=subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-f','lavfi','-i',f'color=c=0x0b1424:s=1280x720:r=24:d={enddur}','-loop','1','-i',str(root/'public/playcall-football-logo-v4.png'),'-filter_complex',fc.replace('[0:v][1:v]','[1:v]scale=1080:-1[logo];[0:v][logo]'),'-map','[v]','-t',str(enddur),'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(work/'end.mp4')],capture_output=True,text=True)
if r.returncode:raise RuntimeError(r.stderr)
(work/'concat.txt').write_text('\n'.join("file '"+p.name+"'" for p in [*[work/f'shot{i:02}.mp4' for i in range(len(shots))],work/'end.mp4']),encoding='utf-8')
subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(work/'concat.txt'),'-c','copy',str(work/'picture.mp4')],check=True)
# Original 128-BPM trailer percussion: heartbeat opening, bass ostinato,
# accelerating toms/snare, risers and a final sustained impact. No stock music.
sr=48000;n=45*sr;mix=np.zeros(n);rng=np.random.default_rng(52)
def add(at,sound,gain=1):
 start=int(at*sr);length=min(len(sound),n-start)
 if start>=0 and length>0:mix[start:start+length]+=sound[:length]*gain
def kick(at,gain=1):
 t=np.arange(int(sr*.65))/sr;phase=2*np.pi*(46*t+55*.045*(1-np.exp(-t/.045)));add(at,np.sin(phase)*np.exp(-t*8),gain)
def hit(at,gain=1):
 t=np.arange(int(sr*.45))/sr;add(at,(rng.standard_normal(len(t))*.35+np.sin(2*np.pi*140*t)*.4)*np.exp(-t*16),gain)
def boom(at):
 t=np.arange(int(sr*2.8))/sr;add(at,(np.sin(2*np.pi*(35*t+20*.12*(1-np.exp(-t/.12))))*.8+rng.standard_normal(len(t))*.1)*np.exp(-t*1.8),1)
for at0 in [0,1.5,3]:kick(at0,.75);kick(at0+.23,.4)
beat=60/128
for k,at0 in enumerate(np.arange(4.5,at,beat)):
 kick(at0,.65 if k%2==0 else .3)
 if k%2:hit(at0,.48)
 if at0>14:
  t=np.arange(int(sr*.06))/sr;add(at0+beat/2,rng.standard_normal(len(t))*np.exp(-t*80),.08)
 # short minor-key bass pulse
 t=np.arange(int(sr*beat*.8))/sr;freq=[55,55,65.406,49][(k//8)%4];add(at0,np.sin(2*np.pi*freq*t)*np.sin(np.pi*np.arange(len(t))/len(t))**.6,.12)
 if at0>29:hit(at0+beat*.75,.13)
for start in [7.5,18,26,35]:
 t=np.arange(int(sr*2.5))/sr;noise=rng.standard_normal(len(t));noise=np.convolve(noise,np.ones(8)/8,mode='same');add(start,noise*(t/2.5)**2,.28)
for point in [4.5,10,16,23,29,at]:boom(point)
# Low ominous harmonic bed under the pulses.
t=np.arange(n)/sr;mix+=(np.sin(2*np.pi*55*t)+.3*np.sin(2*np.pi*82.406*t))*.035*np.minimum(t/4,1)
mix*=np.minimum(t/.12,1)*np.minimum((45-t)/1.1,1);mix=np.tanh(mix*1.3)*.82
stereo=np.column_stack([mix,mix*.96+np.roll(mix,420)*.04]);pcm=(np.clip(stereo,-.98,.98)*32767).astype('<i2')
with wave.open(str(work/'score.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
output=root/'trailer/Playcall-Football-Trailer-45s.mp4'
subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-i',str(work/'picture.mp4'),'-i',str(work/'score.wav'),'-map','0:v','-map','1:a','-c:v','copy','-af','loudnorm=I=-14:TP=-1.5:LRA=8','-c:a','aac','-b:a','256k','-ar','48000','-t','45','-movflags','+faststart',str(output)],check=True)
(root/'trailer/edit-decisions.json').write_text(json.dumps({'fps':24,'size':[1280,720],'duration':45,'shots':timeline,'endCardAt':at,'music':'Original synthesized percussion score; no source dialogue'},indent=2),encoding='utf-8')
print('DONE',output,flush=True)
