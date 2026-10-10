"""Estimate visible complexion from roster headshots, never ethnicity.
Requires Pillow, numpy and opencv-python. Cached photos stay outside Git.
Ambiguous/no-face photos are reported as unresolved, not guessed from names.
"""
import concurrent.futures
import io
import json
from pathlib import Path
import threading
import urllib.request
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT/'cache'/'appearance'
LOCAL = threading.local()

def estimate(player):
    path = CACHE/(player['id']+'.png')
    try:
        if not player.get('photo'):
            return player['id'], None, 'no-photo'
        if path.exists():
            im = Image.open(path).convert('RGBA')
        else:
            url = player['photo'].replace('/upload/', '/upload/w_256,c_limit/')
            request = urllib.request.Request(url, headers={'User-Agent':'DrawThePlay-local-artwork/1.0'})
            with urllib.request.urlopen(request, timeout=15) as response:
                payload = response.read(5_000_001)
            if len(payload)>5_000_000:
                raise ValueError('oversize')
            im = Image.open(io.BytesIO(payload)).convert('RGBA')
            im.thumbnail((300,300))
            im.save(path)
        if not hasattr(LOCAL,'detector'):
            LOCAL.detector = cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_default.xml')
            LOCAL.alternate = cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_alt2.xml')
        a = np.array(im)
        gray=cv2.cvtColor(a[:,:,:3],cv2.COLOR_RGB2GRAY)
        faces = LOCAL.detector.detectMultiScale(gray,1.1,4,minSize=(28,28))
        if len(faces)!=1:
            faces = LOCAL.alternate.detectMultiScale(cv2.equalizeHist(gray),1.08,4,minSize=(28,28))
        if len(faces)!=1:
            return player['id'], None, 'face-unresolved'
        x,y,w,h = map(int,faces[0])
        # Cheek zones avoid hair, eyes, facial hair, shirt and background.
        samples=[]
        for l,r in [(0.15,0.36),(0.64,0.85)]:
            patch=a[y+int(h*.48):y+int(h*.70),x+int(w*l):x+int(w*r)]
            rgb=patch[:,:,:3]; ycc=cv2.cvtColor(rgb,cv2.COLOR_RGB2YCrCb)
            mask=(patch[:,:,3]>240)&(ycc[:,:,1]>130)&(ycc[:,:,1]<185)&(ycc[:,:,2]>70)&(ycc[:,:,2]<140)&(ycc[:,:,0]>25)&(ycc[:,:,0]<245)
            samples.extend(rgb[mask].tolist())
        if len(samples)<15:
            return player['id'], None, 'skin-unresolved'
        color=np.median(samples,axis=0).round().astype(int)
        return player['id'], '#'+''.join(f'{v:02x}' for v in color), 'headshot-estimate'
    except Exception as error:
        return player['id'], None, type(error).__name__

if __name__=='__main__':
    CACHE.mkdir(parents=True,exist_ok=True)
    players=json.loads((ROOT/'public/data/catalog.json').read_text())['players']
    records={}; unresolved=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for i,(pid,color,status) in enumerate(pool.map(estimate,players),1):
            if color:records[pid]=color
            else:unresolved.append({'id':pid,'reason':status})
            if i%200==0:print(f'{i}/{len(players)} headshots checked; {len(records)} matched',flush=True)
    # Visually reviewed visible-color corrections; these are not race labels.
    overrides=ROOT/'scripts/player-appearance-overrides.json'
    if overrides.exists():
        records.update(json.loads(overrides.read_text()))
        unresolved=[item for item in unresolved if item['id'] not in records]
    (ROOT/'src/player-appearance.json').write_text(json.dumps(records,sort_keys=True))
    (CACHE/'report.json').write_text(json.dumps({'matched':len(records),'total':len(players),'unresolved':unresolved},indent=2))
    # Audit a sample spanning the full shade range against the source photos.
    sample=sorted(records,key=lambda k:sum(bytes.fromhex(records[k][1:])))
    sample=[sample[round(i*(len(sample)-1)/23)] for i in range(24)] if sample else []
    sheet=Image.new('RGB',(800,600),'#20242c'); draw=ImageDraw.Draw(sheet)
    names={p['id']:p['name'] for p in players}
    for i,pid in enumerate(sample):
        x=i%8*100;y=i//8*200
        im=Image.open(CACHE/(pid+'.png')).convert('RGBA');im.thumbnail((96,140))
        sheet.paste(im,(x,y),im);draw.rectangle((x,y+142,x+95,y+160),fill=records[pid]);draw.text((x,y+165),names[pid][:15],fill='white')
    sheet.save(CACHE/'review.png')
    print(f'Complete: {len(records)}/{len(players)} matched; {len(unresolved)} unresolved.',flush=True)
