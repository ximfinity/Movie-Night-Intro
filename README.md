# Movie Night Intro

A Windows desktop app for building an animated pre-show playlist — video clips, local
music tracks, and animated text announcement slides — capped off with an animated
countdown timer overlay so everyone knows when the movie starts.

Built with Electron + React + TypeScript, with [GSAP](https://gsap.com) powering the
transitions and animations.

## Features

- **Playlist editor** — mix video clips and slideshows in any order; drag to reorder.
- **Slideshows** — a slideshow item holds one or more **slides that rotate**
  automatically: each slide is either a **text slide** (fixed title, a theme, an entrance
  animation, and an optional background image or GIF) or a full-bleed **image/GIF
  slide**. A text slide's body text can hold several variations — one is picked at
  random each time the slide is shown, while the title stays fixed. One **music or
  pop-up video** selector covers the whole rotating group: an audio track plays quietly
  underneath, or a video plays with its picture too, in a small corner box (like a
  pop-up video) while the slides rotate. Use the ⧉ button on any slide to duplicate it in
  place and copy it for reuse — a **+ Paste** button then appears in any other
  slideshow's slide list.
- **Video clips** — play local video files at their native length; the show
  auto-advances when each clip ends. Starting a video immediately cuts any playing
  background music or pop-up video so they never talk over each other.
- **Countdown overlay** — a ring/flip-clock/pulsing countdown that stays on screen in a
  corner of your choice for the whole show, then flashes a "let's go" message — it plays
  over whatever video clip or slide is currently showing rather than taking its own turn
  in the playlist. Counts down either to a **target start time** (recommended — stays
  accurate no matter how many times you stop and restart the show) or a fixed duration
  from whenever the show is started.
- **Media library** — bulk-import a batch of video clips or music tracks at once, then
  reuse them: add any library video to the show with one click, or assign a library
  music track (or image) to a slide from a dropdown instead of re-opening a file picker
  each time.
- **Clean modern transitions** — crossfade, slide, zoom, or hard cut between items.
- **Fullscreen show mode** — press **Start Show** to go fullscreen. `Esc` exits,
  `Space` pauses, `←`/`→` skip between items — for a hands-off automatic show with a
  manual override if you need it.

## Music note

Spotify's API only allows playback through Spotify's own embedded widget — it requires
a Premium account, a live internet connection, and doesn't allow custom-styled/synced
playback. So this app plays **local audio files** instead (mp3, m4a, wav, ogg, aac,
flac) that you import ahead of time — fully offline, fully in your control on show
night.

## Getting started (development)

```bash
npm install
npm run dev
```

This launches the app with hot reload. A project is a folder on disk containing a
`project.json` file plus a `media/` subfolder — when you import a video, image, or
audio file, it's copied into that folder so the project stays self-contained and
portable (e.g. on a USB stick).

## Building a Windows installer

```bash
npm run build:win
```

This produces an NSIS installer under `dist/` (e.g.
`Movie Night Intro-1.0.0-setup.exe`) that installs the app like any normal Windows
program, with a desktop shortcut, no dev tools required on the show machine.

## Project structure

```
src/
  main/       Electron main process — file dialogs, media import, project save/load
  preload/    Context-bridge API exposed to the renderer as window.api
  renderer/   React UI: Home screen, playlist editor, fullscreen show player
  shared/     Types and helpers shared between main and renderer
```

## Typical workflow

1. **New Project** → choose (or create) a folder to hold this project's `project.json`
   and media.
2. Click **Countdown Overlay** at the top of the sidebar to set its duration, style, and
   screen position (or turn it off).
3. Optionally bulk-import a batch of clips/tracks in the **Media Library** section, then
   add library videos to the show or assign library music/images to slides.
4. Add **Video Clips** and **Text Slides** to build the playlist — drag to reorder. Open a
   slideshow's settings to add more rotating slides, mark a slide as an image instead of
   text, add random body-text variations, or set its shared music/pop-up video.
5. Click a playlist item to edit its settings in the right-hand panel (text, theme,
   background image, music, transition, etc.).
6. **Save** (or `Ctrl+S`), then **Start Show** to go fullscreen and run it automatically.
