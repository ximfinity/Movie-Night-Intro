# Movie Night Intro

A Windows desktop app for building an animated pre-show playlist — video clips, local
music tracks, and animated text announcement slides — capped off with an animated
countdown timer overlay so everyone knows when the movie starts.

Built with Electron + React + TypeScript, with [GSAP](https://gsap.com) powering the
transitions and animations.

## Features

### Building the show

- **Playlist editor** — mix video clips and slide groups in any order; drag to reorder.
  New items are added right after the one you have selected.
- **Slide groups** — a group holds one or more **slides that rotate** automatically, and
  can be given a name. Each slide is either a **text slide** (fixed title, a theme, an
  entrance animation, and an optional background image or GIF) or a full-bleed
  **image/GIF slide**. A text slide's subtitle can hold several **variations**; the show
  rotates through all of them before repeating any, so the same line never shows twice in
  a row.
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

### Reuse

- **Template library** — **📚 Save as template** on any slide group stores it, with its
  images and music, in a library shared by all your projects; **📚 Template** under the
  playlist inserts one into the current project.
- **Save As…** copies the whole project (with its media) to another folder — handy for
  starting next month's show from this one.
- **Media library** — bulk-import clips, tracks or images once and reuse them anywhere.

### Running the show

- **Countdown overlay** — a ring/flip-clock/pulsing countdown in a corner of your choice,
  over whatever is playing. Count down to a **target start time** (recommended — stays
  accurate across restarts, and a just-after-midnight time counts down correctly) or a
  fixed duration. **Loop the playlist until showtime** restarts the playlist if it ends
  before the target time.
- **Fullscreen show mode** — **Start Show** goes fullscreen. `Esc` exits, `Space` pauses,
  `←`/`→` skip between items. Select an item first and **Start From Selected** resumes
  from there instead of the top.
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
  main/       Electron main process — dialogs, media import, crash-safe saves, templates
  preload/    Context-bridge API exposed to the renderer as window.api
  renderer/   React UI: Home screen, playlist editor, fullscreen show player
  shared/     Types and pure logic shared by main and renderer (project format and
              migrations, show sequencing, countdown math, AI prompt/reply handling),
              with unit tests alongside (*.test.ts)
```

## Typical workflow

1. **New Project** → choose (or create) a folder to hold this project's `project.json`
   and media. (Or **Open Project**, then **Save As…** to start from last month's show.)
2. Click **Countdown Overlay** at the top of the sidebar to set the start time, style
   and position.
3. Add a **📝 Slide Group**, open **✨ Quick build & AI**, paste your titles, copy the
   prompt into your favorite AI chat and paste its reply back. Pick a theme swatch and
   click **Use this look for all slides**.
4. Add **🎬 Video Clips** (or a **📚 Template**), and give each slide group music or a
   pop-up video. Drag to reorder.
5. **Save** (or `Ctrl+S`), then **Start Show** to go fullscreen and run it automatically.
