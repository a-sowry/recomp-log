# Marketing clips

Makes the vertical clips (1080×1920, 30 fps, silent, caption band on top, app in a phone frame below) by recording
the real app in demo mode. Nothing here uses your login or data: the app runs on generated demo data (`demo.js`)
and every request to anything but the local copy of the app is blocked.

## Set up once

```
pip install -r requirements.txt && python3 -m playwright install chromium   # or set CHROME_PATH to an installed Chrome
./setup_fonts.sh                                                            # the app's and the captions' fonts
sudo apt install ffmpeg tesseract-ocr                                       # or the equivalent on your system
```

## Make a clip

```
python3 clips.py build specs/01-car-build.json
```

Writes `out/01-car-build.mp4` (ready to review and post) and `out/01-car-build.check.json`. The build exits with an
error if the content check finds a banned word on screen.

## A clip is one small file

`specs/*.json` holds the look (`dark`, `pink`, `lilac`), the demo-mode URL options, the captions with their start
times, and the steps (`tap`, `type`, `scroll`, `wait`) with the second each happens. See `demo.js` for every URL option.

## Content rules

`rules.json` lists words that must never appear on screen (Stanley, takeaway chains, people and brands named in
recipe credits). Every clip is read frame by frame and fails if one shows. Add to the list any time.
