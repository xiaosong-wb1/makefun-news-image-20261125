#!/usr/bin/env bash
# Render the front page to a 1024x1024 PNG and print the layout audit.
#   ./render/build.sh            -> render/out/page.png (2048 supersampled) + audit
set -euo pipefail
cd "$(dirname "$0")/.."
CH="${CHROME:-$HOME/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome}"
mkdir -p render/out

FLAGS=(--headless --no-sandbox --disable-gpu --hide-scrollbars --force-color-profile=srgb
       --font-render-hinting=none --disable-lcd-text --run-all-compositor-stages-before-draw
       --virtual-time-budget=4000)

# A headless chrome needs its own user-data-dir; the default one cannot be created here.
UD=$(mktemp -d)
trap 'rm -rf "$UD"' EXIT

"$CH" "${FLAGS[@]}" --user-data-dir="$UD" --force-device-scale-factor=2 --window-size=1024,1024 \
  --screenshot=render/out/page@2x.png "file://$PWD/render/page.html" 2>/dev/null

"$CH" "${FLAGS[@]}" --user-data-dir="$UD" --dump-dom "file://$PWD/render/page.html" 2>/dev/null \
  | python3 -c 'import re,sys,html,json; s=sys.stdin.read(); m=re.search(r"<pre id=\"audit\"[^>]*>(.*?)</pre>", s, re.S); print(json.dumps(json.loads(html.unescape(m.group(1))), indent=1) if m else "NO AUDIT")'

python3 - <<'PY'
from PIL import Image
im = Image.open('render/out/page@2x.png')
print('render:', im.size, im.mode)
PY
