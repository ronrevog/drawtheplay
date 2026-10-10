"""Restore local-only player artwork from a supplied Football Pro 96 ZIP.

Requires Pillow. Reads data files only; never runs the installer.
Output stays in the sibling reference-analysis folder, outside Git/builds.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import zipfile
from PIL import Image

REQUIRED = {'QBBULIT', 'QBFADE', 'QBPSET', 'QBRUN', 'QBHAND', 'RBRNWB',
            'SKCTHM', 'FCATCH', 'LMDIVE', 'LMT3PT', 'LMT4PT', 'CTSNP', 'QBCHK', 'LMPUSH', 'EZSPIKE', 'RCSTAND', 'LMSTAND', 'SKRUN', 'L2BSIDL', 'SKDIVE', 'QBSCHK', 'DBREADY'}

def u32(data, offset):
    return struct.unpack_from('<I', data, offset)[0]

def decode_sprite(data):
    width, height = data[:2]
    expected = width * height
    if not expected or expected > 65536:
        raise ValueError('Invalid sprite dimensions')
    output = bytearray()
    pos = 5
    while pos < len(data):
        flags = data[pos]
        pos += 1
        for bit in range(8):
            if pos == len(data):
                break
            if flags & (128 >> bit):
                token = struct.unpack_from('<H', data, pos)[0]
                pos += 2
                distance, length = (token >> 4) + 1, (token & 15) + 3
                if distance > len(output):
                    raise ValueError('Invalid sprite back-reference')
                for _ in range(length):
                    output.append(output[-distance])
            else:
                output.append(data[pos])
                pos += 1
            if len(output) > expected:
                raise ValueError('Sprite expands beyond dimensions')
    if len(output) != expected:
        raise ValueError('Incomplete sprite')
    return width, height, output

def restore(archive, destination):
    with zipfile.ZipFile(archive) as source:
        for name in ('FBPRO96/ANIM.DAT', 'FBPRO96/FILE.DAT'):
            if source.getinfo(name).file_size > 16 * 1024 * 1024:
                raise ValueError('Unexpected data file size')
        data = source.read('FBPRO96/ANIM.DAT')
        resources = source.read('FBPRO96/FILE.DAT')
    palette_start = resources.index(b'PAL:')
    if resources[palette_start+8:palette_start+12] != b'VGA:':
        raise ValueError('Expected VGA palette')
    palette = resources[palette_start+16:palette_start+784]
    colors = [tuple(min(255, v*4) for v in palette[i*3:i*3+3]) +
              (0 if i in (0, 223) else 255,) for i in range(256)]
    original_colors = colors.copy()
    # Explicit material channels: jersey/helmet, pants, trim, exposed skin.
    # Encoded pixels carry (role, shade, 1) so no RGB heuristic can recolor skin.
    for role, ramps in [(1,[range(64,70),range(57,63)]),
                        (2,[range(33,47),range(73,78)]),(3,[range(80,96)]),(4,[range(48,56)]),
                        (5,[range(96,104),range(104,112)]),(6,[range(112,120)]),
                        (7,[range(120,124),range(124,128)]),(8,[range(128,136)])]:
        for ramp in ramps:
            peak = max(max(colors[i][:3]) for i in ramp) or 1
            for i in ramp:
                colors[i] = (role, round(max(colors[i][:3])/peak*255), 1, 255)
    count = struct.unpack_from('<H', data)[0]
    if not 0 < count < 256:
        raise ValueError('Invalid animation count')
    entries = [(data[2+i*14:11+i*14].split(b'\0')[0].decode('ascii'),
                u32(data, 12+i*14)) for i in range(count)]
    animations, images = [], []
    for index, (name, start) in enumerate(entries):
        if name not in REQUIRED:
            continue
        end = entries[index+1][1] if index+1 < count else len(data)
        frames, directions = data[start:start+2]
        table = start + 2 + u32(data, start+2)
        if table != start+6+frames*directions*4:
            raise ValueError('Unexpected animation layout')
        sprite_count = u32(data, table)//4
        offsets = [table+u32(data, table+i*4) for i in range(sprite_count)] + [end]
        sprites = []
        for left, right in zip(offsets, offsets[1:]):
            if not table < left < right <= len(data):
                raise ValueError('Invalid sprite bounds')
            width, height, pixels = decode_sprite(data[left:right])
            image = Image.new('RGBA', (width, height))
            image.putdata([colors[value] for value in pixels])
            sprites.append({'image': len(images), 'width': width, 'height': height})
            images.append(image)
        references = []
        for i in range(frames*directions):
            flags, sprite, x, y = struct.unpack_from('<BBbb', data, start+6+i*4)
            if sprite >= len(sprites):
                raise ValueError('Invalid sprite index')
            references.append(dict(flags=flags, sprite=sprite, x=x, y=y))
        animations.append(dict(name=name, frames=frames, directions=directions, paired=name=='L2BSIDL',
                               references=references, sprites=sprites))
    if {a['name'] for a in animations} != REQUIRED:
        raise ValueError('Required animations missing')
    # Original laced football in FILE.DAT's game gadget SHP, frame 17.
    # SHP uses a 16-bit header rather than ANIM.DAT's byte dimensions.
    shape = 2032518
    if resources[shape:shape+4] != b'SHP:':
        raise ValueError('Unsupported FILE.DAT football resource layout')
    table = shape + 8
    left, right = [table + u32(resources, table+i*4) for i in (17, 18)]
    sprite = resources[left:right]
    compression, width, height = struct.unpack_from('<HHH', sprite)
    if compression != 1 or not (0 < width < 256 and 0 < height < 256):
        raise ValueError('Unexpected football dimensions or encoding')
    _, _, pixels = decode_sprite(bytes([width, height, 0, 0, 0])+sprite[11:])
    ball_image = Image.new('RGBA', (width, height))
    ball_image.putdata([original_colors[value] for value in pixels])
    ball_image = ball_image.crop(ball_image.getbbox())
    football = dict(image=len(images), width=ball_image.width, height=ball_image.height)
    images.append(ball_image)
    cell = math.ceil(max(max(im.size) for im in images)/16)*16
    columns = 32
    atlas = Image.new('RGBA', (columns*cell, math.ceil(len(images)/columns)*cell))
    for i, image in enumerate(images):
        atlas.paste(image, ((i%columns)*cell, (i//columns)*cell))
    destination.mkdir(parents=True, exist_ok=True)
    atlas.save(destination/'fps-sprite-atlas.png')
    pack = dict(cell=cell, columns=columns, animations=animations, football=football, materialChannels=2,
                sourceSha256=hashlib.sha256(data).hexdigest())
    (destination/'fps-decoded.json').write_text(json.dumps(pack, separators=(',', ':')))
    print(f'Restored {len(animations)} animations, {len(images)} sprites: {destination}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2]/'reference-analysis')
    args = parser.parse_args()
    restore(args.archive, args.output)
