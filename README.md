# Movie Night Intro

A Windows desktop app for building an animated pre-show playlist — video clips, local
music tracks, and animated text announcement slides — with a countdown overlay so
everyone knows when the movie starts, and a hand-off into the feature itself: a "starting
shortly" hold screen, an "Our Feature Presentation" curtain card, the movie, and a
"Thanks for coming" card. Run it all from your phone.

Built with Electron + React + TypeScript, with [GSAP](https://gsap.com) powering the
transitions and animations.

## Features

### Start fast: the New Show wizard

- **✨ New Show** on the home screen: pick a theme night (**Classic, Halloween, Christmas,
  Kids' night, Birthday, PTA / school**), type the movie title and showtime, tick the
  sections you want, and get a complete, ready-to-run pre-show. **Every slide already has
  silly lines written**, in the theme's colors, with the countdown set to your showtime.
- Sections include a welcome, house rules, snacks and **Tonight's Feature** (now showing,
  a **Fun Facts** slide, enjoy the show). PTA nights add a **concessions price list**,
  **sponsors & volunteer thank-yous**, a **fundraiser/raffle** group with a **QR code slide**
  made from your donation link, and **upcoming events & safety** (exits, restrooms, kids
  stay with a grown-up).
- The wizard also fills in the AI prompt with tonight's movie, so one copy-and-paste adds
  movie-specific jokes and real trivia (Fun Facts slides ask the AI for true facts, not
  jokes).
- Any built-in group can be added to an existing show from **📚 Template → ✨ Built-in**.

### Building the show

- **Playlist editor** — mix video clips and slide groups in any order; drag to reorder.
  New items are added right after the one you have selected.
- **Slide groups** — a group holds one or more **slides that rotate** automatically, and
  can be given a name. Each slide is either a **text slide** (fixed title, a theme, an
  entrance animation, and an optional background image or GIF) or a full-bleed
  **image/GIF slide**. A text slide's subtitle can hold several **variations**; the show
  rotates through all of them before repeating any, so the same line never shows twice in
  a row. Or show **all lines at once as a list** — menus, sponsor lists, schedules; a line
  like `Popcorn | $2` becomes a dotted price column.
- **Live preview** — the selected slide plays beside its settings, rendered exactly as
  the fullscreen show will draw it, re-rolling a new variation each time it replays
  (🎲 **Shuffle** to see another right away).
- **Fast styling** — pick from **20 color schemes** shown as real swatches, or 🎲
  **Random each time**. New slides copy the look (theme, animation, duration) of the last
  slide in the group, and **Use this look for all slides** restyles a whole group at once.
- **Compact slide list** — slides collapse to one-line rows; click one to edit it and drag
  ⠿ to reorder (mouse or keyboard). ⧉ duplicates a slide and copies it for pasting into
  another group.
- **Music or pop-up video per group** — an audio track plays quietly under the rotating
  slides, or a video plays in a resizable corner box (100%–600%), optionally repeating the
  slides until the video ends. Switching to another file keeps your volume/size settings.

### AI subtitles from any chat (no API key)

- **✨ Quick build & AI** on a slide group: paste a list of titles to create a slide for
  each, then **📋 Copy prompt** — a ready-made prompt you paste into ChatGPT, Claude,
  Gemini or Copilot. Paste the chat's reply back and the app reads it (ignoring chatter,
  bullets and numbering), shows every line for review, and adds them in one step.
- Each slide also has **📋 Copy AI prompt** (just that title, listing lines it already has
  so the AI doesn't repeat them) and **📥 Paste AI reply**, which also accepts any plain
  list of lines.
- The event description ("Halloween night, showing Hocus Pocus"), tone and number of
  lines per title are saved with the project. Lines longer than 60 characters (roughly
  one line on screen) are flagged.

### Your own AI, built in (optional)

- **✨ AI** in the editor connects your own AI account: **Claude (Anthropic)**, **OpenAI
  (ChatGPT)**, **Google Gemini**, or any **OpenAI-compatible** server: Ollama or LM Studio
  running on this PC (free, offline) or services like OpenRouter. Paste your API key,
  pick models (**Load models** lists what your account can use), **Test connection**, and
  click **Use**.
- Then **✨ Write them with …** in Quick build & AI, and **✨ Write more** on any slide, get
  lines and trivia in one click. Everything the AI writes is shown for review first.
- Keys stay on the PC, encrypted by Windows, never in project files, and are sent only to
  the provider you chose; usage is billed to your own account. Without an AI connected,
  the copy-and-paste prompts keep working with any chat.

### Meme slides

- **+ Meme** in a slide group makes a classic top/bottom-caption meme and adds it as an
  image slide (rendered at 1920×1080 into the project's images).
- Picture: from your library, a new import, or **🎨 drawn by your AI** from a description
  (OpenAI, Gemini, or a compatible server with an image model).
- Captions: type them, click one of the built-in ideas, or **✨ Suggest captions** from your
  AI based on the group's slides and your event.

### Reuse

- **Template library** — **📚 Save as template** on any slide group stores it, with its
  images and music, in a library shared by all your projects; **📚 Template** under the
  playlist inserts one into the current project.
- **Save As…** copies the whole project (with its media) to another folder — handy for
  starting next month's show from this one.
- **Media library** — bulk-import clips, tracks or images once and reuse them anywhere.

### The feature presentation

Click **Feature Presentation** at the top of the sidebar:

- **The movie**: a file on this PC (linked where it is, never copied), played **in the app**
  (seamless, with **.srt/.vtt subtitles** and **resume after a crash**) or in **your own
  video player** (VLC etc., for formats the app can't decode — it also falls back to this
  automatically). Or a **Netflix / Disney+ link**, opened in your browser at showtime.
- **At showtime** the item playing finishes, then the **hold screen** ("The movie will be
  starting shortly") comes up with the title, poster, looping music and a slide group
  rotating behind it. Then either **start automatically** after a hold time you choose, or
  **wait for the go button** (`Enter` or the phone remote). `Enter` also wraps up the
  pre-show early.
- **Into the movie**: an animated **"Our Feature Presentation"** curtain card, a fade to
  black, or your own intro clip. **After the movie**, a "Thanks for coming!" card.
- If a showing is interrupted, the Feature Presentation panel (and the remote) offers
  **⏯ Resume the movie** where it stopped.

### Phone remote

**📱 Remote** in the editor turns on a small web page the app serves on your Wi-Fi.
**Scan the QR code** it shows with your phone's camera and you're connected (it carries the
PIN, so there's nothing to type), or open the address it shows on any phone on the same
network and enter the 4-digit PIN. No app to install. From the phone: start the pre-show, **wrap up / start the movie**, pause, skip,
change the volume, move the countdown (±5 min, "start in 2 / 5 / 10 min"), and during a
built-in movie pause, seek, change the volume and toggle subtitles.

The first time, Windows asks whether the app may use the network: allow it on **private
networks**, and set your event's Wi-Fi to _Private_ in Windows settings. Guest and school
networks often block phones from reaching other devices, so a dedicated router for the
event is the reliable choice. Repeated wrong PINs lock out for a minute; **New PIN**
signs every phone out.

### Running the show

- **Countdown overlay** — a ring/flip-clock/pulsing countdown in a corner of your choice,
  over whatever is playing. Count down to a **target start time** (recommended — stays
  accurate across restarts, and a just-after-midnight time counts down correctly) or a
  fixed duration. **Loop the playlist until showtime** restarts the playlist if it ends
  before the target time.
- **Fullscreen show mode** — **Start Show** goes fullscreen. Select an item first and
  **Start From Selected** resumes from there instead of the top. Keys: `Space` pause ·
  `←`/`→` skip (10 s in the movie) · `↑`/`↓` volume · `Enter` wrap up / start the
  movie · `M` start the movie now · `C` subtitles · `Esc` exit (press twice during the
  movie).
- **Resilient playback** — a video that can't be played (missing, or a format Chromium
  can't decode) is skipped instead of freezing the show; music never cuts out between two
  slide groups; one broken item is skipped rather than blanking the screen.

### Keeping your work safe

- **Undo / redo** everything (`Ctrl+Z` / `Ctrl+Y`, or the ↶ ↷ buttons).
- Saves are crash-safe and keep the previous version as `project.json.bak`. If a save
  fails, you're told and the project stays marked unsaved.
- Closing the window with unsaved changes asks whether to save first.
- **New Project** on a folder that already has a project offers to open it instead of
  overwriting it; opening a damaged file explains what's wrong.
- **Missing-file warning** — opening a project flags any media it uses that can't be
  found on disk.

## Music note

Spotify's API only allows playback through Spotify's own embedded widget — it requires
a Premium account, a live internet connection, and doesn't allow custom-styled/synced
playback. So this app plays **local audio files** instead (mp3, m4a, wav, ogg, aac,
flac) that you import ahead of time — fully offline, fully in your control on show
night.

## Getting started (development)

```bash
npm install
npm run dev      # app with hot reload
npm test         # unit tests (Vitest)
npm run lint
npm run typecheck
```

A project is a folder on disk containing a `project.json` file plus a `media/`
subfolder — when you import a video, image, or audio file, it's copied into that folder
so the project stays self-contained and portable (e.g. on a USB stick). Templates live
in the app's user-data folder (`%APPDATA%\movie-night-intro\templates` on Windows).

## Building a Windows installer

```bash
npm run build:win
```

This produces an NSIS installer under `dist/` (`movie-night-intro-<version>-setup.exe`)
that installs the app like any normal Windows program, with a desktop shortcut, no dev
tools required on the show machine. CI (`.github/workflows/build-windows.yml`) lints,
tests and builds on every push, and publishes a GitHub Release for `v*` tags or a manual
run with **publish_release** checked.

## Project structure

```
src/
  main/       Electron main process — dialogs, media import, crash-safe saves, templates,
              bring-your-own AI (ai/: Claude via the Anthropic SDK, OpenAI, Gemini,
              OpenAI-compatible),
              movie hand-off and resume points, the phone remote's web server (remote.ts,
              remotePage.html), QR-code slides
  preload/    Context-bridge API exposed to the renderer as window.api
  renderer/   React UI: Home screen, playlist editor, fullscreen show player
  shared/     Types and pure logic shared by main and renderer (project format and
              migrations, show sequencing, showtime math, AI prompt/reply handling,
              built-in theme nights, subtitles, the remote protocol), with unit tests
              alongside (*.test.ts)
```

## Typical workflow

1. **✨ New Show** → pick a theme night, type the movie and showtime, choose sections, and
   pick a folder for the project. (Or **+ Blank project**, or **Open Project** then
   **Save As…** to start from last month's show.)
2. In **Tonight's Feature**, click **✨ Quick build & AI → Copy prompt**, paste it into your
   favorite AI chat and paste its reply back for movie-specific jokes and trivia.
3. Click **Feature Presentation** to choose the movie file or streaming link, and whether
   it starts automatically at showtime or waits for your go button.
4. Add **🎬 Video Clips**, music or a pop-up video per group; drag to reorder.
5. Turn on **📱 Remote**, open it on your phone, then **Save** and **Start Show** (from
   the PC or the phone).
