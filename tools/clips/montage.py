"""Cut a montage raw video from existing raw recordings, then compose with clips.py.
Spec key "montage": [[clip_id, start_s, source_s, output_s], ...]  (output_s < source_s speeds the shot up).
Usage: python3 montage.py specs/22-....json   (then: python3 clips.py compose specs/22-....json)"""
import json, subprocess, sys
from pathlib import Path
here = Path(__file__).parent
for sp in sys.argv[1:]:
    spec = json.loads(Path(sp).read_text()); segs = spec['montage']
    cmd = ['ffmpeg', '-v', 'error', '-y']; fc = []
    for i, (n, ss, src, out) in enumerate(segs):
        cmd += ['-ss', str(ss), '-t', str(src), '-i', str(here / 'out' / f'{n}.raw.mp4')]
        fc.append(f'[{i}:v]setpts=(PTS-STARTPTS)*{out / src:.5f},fps=30,trim=duration={out},setpts=PTS-STARTPTS[v{i}]')
    fc.append(''.join(f'[v{i}]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=1:a=0[o]')
    subprocess.run([*cmd, '-filter_complex', ';'.join(fc), '-map', '[o]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16',
                    '-pix_fmt', 'yuv420p', str(here / 'out' / f"{spec['id']}.raw.mp4")], check=True)
    spec['duration'] = round(sum(s[3] for s in segs), 1)
    spec['captions'][-1]['t'] = round(spec['duration'] - 1.8, 1)
    Path(sp).write_text(json.dumps(spec, indent=1)); print(spec['id'], spec['duration'])
