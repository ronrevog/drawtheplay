import subprocess,pathlib,imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
for n,p in enumerate(sorted(pathlib.Path('E:/REPOS/DRAW_THE_PLAY').glob('*.m4v'))):
 r=subprocess.run([ff,'-hide_banner','-i',str(p)],capture_output=True,text=True)
 print(p.name,r.stderr[-2200:])
 subprocess.run([ff,'-y','-i',str(p),'-vf','fps=1/2,scale=384:-1,tile=3x2','-frames:v','1',f'trailer/work/clip{n}.jpg'],capture_output=True)
