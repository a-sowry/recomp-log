#!/usr/bin/env bash
# Downloads the fonts the app and the captions use, so recordings look the same on every machine.
# They are saved in tools/clips/.fonts (not committed).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .fonts && cd .fonts
[ -f package.json ] || echo '{"name":"clip-fonts","private":true}' > package.json
npm i --silent @fontsource/barlow-condensed @fontsource/barlow @fontsource/playfair-display @fontsource/nunito @fontsource/inter
echo "fonts ready in $(pwd)/node_modules/@fontsource"
