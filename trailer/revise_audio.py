import pathlib,subprocess,imageio_ffmpeg,json
ff=imageio_ffmpeg.get_ffmpeg_exe();root=pathlib.Path('E:/REPOS/drawtheplay');sources=sorted(pathlib.Path('E:/REPOS/DRAW_THE_PLAY').glob('*.m4v'))
# Three 13-second music/action sections from supplied clip 1, joined with
# half-second equal-power crossfades. At 37.75s transition into the supplied
# clip 0 ending. Original CTA speech arrives at 41.76s over the logo.
f='[1:a]aresample=48000,atrim=start=0:end=13,asetpts=PTS-STARTPTS,asplit=3[a][b][c];[a][b]acrossfade=d=0.5:c1=qsin:c2=qsin[ab];[ab][c]acrossfade=d=0.5:c1=qsin:c2=qsin[bed];[2:a]aresample=48000,atrim=start=22.83:end=30.08,asetpts=PTS-STARTPTS[outro];[bed][outro]acrossfade=d=0.25:c1=qsin:c2=qsin,apad,atrim=duration=45,afade=t=in:d=0.15,afade=t=out:st=44.85:d=0.15,loudnorm=I=-14:TP=-2:LRA=9[audio]'
out=root/'trailer/Playcall-Football-Trailer-45s-v2.mp4'
r=subprocess.run([ff,'-y','-hide_banner','-i',str(root/'trailer/work/picture.mp4'),'-i',str(sources[1]),'-i',str(sources[0]),'-filter_complex',f,'-map','0:v','-map','[audio]','-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-t','45','-movflags','+faststart',str(out)],capture_output=True,text=True)
if r.returncode:raise RuntimeError(r.stderr)
(root/'trailer/audio-revision-v2.json').write_text(json.dumps({'musicSource':str(sources[1]),'musicRange':[0,13],'repeats':3,'crossfadeSeconds':.5,'outroSource':str(sources[0]),'outroRange':[22.83,30.08],'outroAt':37.75,'voiceAtApproximately':41.76,'syntheticMusicRemoved':True},indent=2))
r=subprocess.run([ff,'-hide_banner','-i',str(out),'-af','volumedetect','-f','null','-'],capture_output=True,text=True)
print('\n'.join(l for l in r.stderr.splitlines() if any(x in l for x in ['Duration:','mean_volume','max_volume','frame='])))
subprocess.run([ff,'-y','-i',str(out),'-ss','40','-vn','-ac','1','-ar','16000',str(root/'trailer/work/revised-outro.wav')],capture_output=True,check=True)
print(out)
