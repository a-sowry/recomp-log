# Refyne clip pipeline

Records the Refyne demo (fake sample data only) with Playwright and composes 1080x1920 / 30 fps Reels and TikToks with captions and the platform handle.

    ./setup_fonts.sh                      # once
    python3 clips.py build specs/*.json   # both platforms -> out/<id>-instagram.mp4 / -tiktok.mp4
    python3 clips.py build specs/04-tap-for-vitamins.json --platform instagram
    python3 clips.py check specs/*.json   # OCR content gate only

The demo site is built from the repo's own files plus `demo/` (mock backend + sample data), so re-running after an app update re-records the clips.
`rules.json` holds the content gate (banned words, price patterns, caption claims). Every clip is also checked for the bottom-20% safe zone and the 20 s limit.
Specs: `id, look, config?, garden_inbloom?, start_tab?, duration, captions[], steps[]`.
