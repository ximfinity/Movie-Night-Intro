# Marketing asset generators

Regenerate the itch.io assets in `docs/itch/` from the real app. This needs Node with Playwright
(Chromium), Python with Pillow, and the DejaVu fonts. On Linux, run under a 1920×1080 display:

```bash
npm run build
Xvfb :98 -screen 0 1920x1080x24 &
DISPLAY=:98 PW=/path/to/node_modules/playwright node tools/marketing/capture.mjs /tmp/mni-shots
python3 tools/marketing/compose.py /tmp/mni-shots docs/itch       # cover, banner, stills, how-it-works
python3 tools/marketing/gif.py /tmp/mni-shots/frames docs/itch/gifs  # GIFs, each kept under 3 MB
```

`capture.mjs` builds a demo PTA show with the New Show wizard in a temporary folder, adds a
film-leader "trailer" it records itself, and screenshots the editor, the show, the hold screen,
the curtains-up intro and the phone remote. It changes nothing outside that temporary folder,
apart from the app's normal settings (the phone remote is switched on).
