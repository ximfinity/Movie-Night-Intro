# Third-party notices

Movie Night Intro's own code is released under the [MIT License](LICENSE). The app also
includes the open-source and freely licensed software below, each under its own license. The
MIT License does **not** change those licenses: if you reuse this code, follow each library's
terms as well.

## Not under an open-source license: GSAP

| Library | Used for | License |
|---|---|---|
| [GSAP](https://gsap.com) 3 | Slide, transition and countdown animations | [GSAP Standard "No Charge" License](https://gsap.com/standard-license) |

GSAP is free to use, including commercially, but it is proprietary software owned by Webflow,
not open source. Its license prohibits, among other things, using GSAP in tools that let
people build visual animations without code where that competes with Webflow's own animation
tools. If you build something different from this code, check that license, or replace GSAP
(for example with the browser's built-in Web Animations API).

## MIT License

| Library | Used for |
|---|---|
| [Electron](https://www.electronjs.org) | The desktop app shell |
| [React](https://react.dev) and React DOM | The user interface |
| [dnd kit](https://dndkit.com) (`@dnd-kit/core`, `sortable`, `utilities`) | Drag-and-drop reordering |
| [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) (`@anthropic-ai/sdk`) | The optional Claude connection |
| [`@electron-toolkit/preload`, `@electron-toolkit/utils`](https://github.com/alex8088/electron-toolkit) | Electron helpers |
| [node-qrcode](https://github.com/soldair/node-qrcode) (`qrcode`) | QR codes for the phone remote and donation slides |
| [pngjs](https://github.com/pngjs/pngjs) | Writing QR code and meme images |
| [uuid](https://github.com/uuidjs/uuid) | Unique IDs |

Each package's full license text is in its folder under `node_modules/` after `npm install`.

## Chromium and Node.js

Electron includes Chromium, Node.js and their dependencies. Their licenses ship with every copy
of the app, in `LICENSES.chromium.html` and `LICENSE.electron.txt` next to
`movie-night-intro.exe`.

## Names and trademarks

Movie titles, studios and streaming services mentioned in the app's starter trivia questions and
help text (for example Netflix and Disney+) belong to their owners. They're mentioned only to
describe or refer to them, with no endorsement implied.
