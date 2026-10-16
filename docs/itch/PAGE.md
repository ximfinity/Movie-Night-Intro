# Build the itch.io page (about 10 minutes)

Page: https://ximfinity.itch.io/movie-night-intro

itch.io has no API for page content, so this is done in the browser. Everything you need is in
this folder (regenerate it with the scripts in `tools/marketing/`):

| File | What it's for |
|---|---|
| `cover.png` | Cover image (630 × 500): shown in search, browse and on the page |
| `banner.png` | Header banner (960 × 240) |
| `gifs/*.gif` | **Animated** clips of the real app, each under 3 MB |
| `features/*.jpg` | 1280 × 720 stills with headlines |
| `how-it-works.png` | 4-step setup graphic |
| `screenshots/*.jpg` | The same stills without headlines (backup) |

---

## Step 1: Basics (Edit game → top of the form)

| Field | Value |
|---|---|
| Title | `Movie Night Intro` |
| Short description or tagline | `The pre-show for your movie night: slides, trivia, a countdown to showtime and a curtains-up intro, run from your phone.` |
| Classification | **Tools** |
| Kind of project | **Downloadable** |
| Release status | **Released** |

## Step 2: Pricing

- Choose **$0 or donate**. Set the suggested donation to **$3.00**.
- Turn on **"Ask for a donation after download"** if it's offered.

## Step 3: Uploads

The release workflow uploads two files (see `RELEASING.md`). Set each one once:

| Channel | File | Tick | Display name |
|---|---|---|---|
| `windows-installer` | `movie-night-intro-X.Y.Z-setup.exe` | **Windows** | `Movie Night Intro installer (recommended)` |
| `windows` | the app folder (downloads as a .zip) | **Windows** | `Portable version (no install; used by the itch app)` |

Leave "This file will be played in the browser" off.

## Step 4: Description

Paste the text between the lines below into the **Description** box. Wherever you see
`[IMAGE: …]`, delete that line and use the editor's **image** button to upload that file there.
GIFs keep animating once they're inserted.

---

[IMAGE: gifs/intro.gif]

**Give your movie night a real pre-show.**

Movie Night Intro turns a laptop and a projector into a little movie theater. While people find
their seats, it plays your welcome slides, house rules, snack prices, sponsor thank-yous and a
trivia round, with a countdown to showtime in the corner. When it's time, the lights go down:
*"The movie will be starting shortly"*, curtains up, **Feature Presentation**, and your movie
starts.

Made for school and PTA movie nights, backyard screenings, birthday parties and family movie
night.

## ✨ A whole show in about a minute

[IMAGE: features/07-wizard-themes.jpg]

Click **New Show**, pick a theme night (**Classic, Halloween, Christmas, Kids' night, Birthday
party or PTA / school**), type the movie and the showtime, and tick the sections you want. You get
a complete pre-show with every slide already written (silly lines included), a trivia round and a
countdown. Change anything you like afterwards.

## 🎞️ Slides, video and music

[IMAGE: gifs/slides.gif]

- **Slide groups** that rotate on their own: text or pictures, 20 color themes, entrance animations,
  and several lines per slide picked at random so it never feels repetitive.
- **Lists that look the part**: price menus, sponsor lists and schedules with dotted price columns.
- **Music or a pop-up video per group**: play a trailer **side by side** with your slides, **stacked**
  above or below them, or in a corner box.
- **Video clips** anywhere in the playlist, plus image and GIF slides, memes, and a **QR code
  slide** made from your donation link.
- A **running-time estimate** tells you how long the pre-show lasts and when to press start.

## 🧠 Trivia night before the movie

[IMAGE: gifs/trivia.gif]

Multiple-choice questions with a countdown bar, then a second slide reveals the answer with a fun
fact. It comes with family-movie starter questions (Halloween and Christmas get their own), or
write your own.

## ⏱️ Countdown to showtime, and the big moment

[IMAGE: features/04-show-hold.jpg]

- A **countdown** in the corner, to a clock time (*"the show starts at 6:30"*) or for a fixed
  length. The playlist can repeat until showtime.
- At showtime: the **hold screen**, then a **curtains-up "Feature Presentation"** intro, and the
  movie starts automatically or when you press go.
- Play the movie in the app (with subtitles, and resume if something goes wrong), in your own
  video player (VLC and friends), or from **Netflix, Disney+ and other streaming services** in your
  browser.
- A **thank-you card** when it's over.

## 📱 Run it from your phone

[IMAGE: features/06-phone.jpg]

Scan a QR code and your phone becomes the remote: skip, pause, change the volume, move the
showtime, and **"Wrap up & start the movie"**. It works over your own Wi-Fi with a PIN; nothing
goes through the internet.

## 🤖 Optional AI helpers

Ask any AI chat for more jokes or trivia questions about tonight's movie: the app writes the
prompt, you paste the reply back. Or connect your own **Claude, ChatGPT, Gemini** or local AI to do
it in one click and to make memes. AI is entirely optional, and your key stays on your PC.

## How it works

[IMAGE: how-it-works.png]

## What you need

- A **Windows 10 or 11** PC (64-bit).
- A **projector or TV** connected as a second screen (or mirrored).
- For the phone remote: a phone on the **same Wi-Fi** as the PC.
- Movies: most **.mp4** files play right in the app; anything else opens in your own video player.

## Install

1. Download the installer and run it.
2. If Windows shows **"Windows protected your PC"**, click **More info → Run anyway**. It appears
   because the installer isn't signed with a paid certificate, not because anything is wrong.
3. Updates install over the old version and keep your shows and settings.

Prefer not to install? Download the **portable version**, unzip it and run
`movie-night-intro.exe`. With the [itch app](https://itch.io/app) it installs and updates itself.

## Privacy

No account, no tracking and no ads. Your shows are saved as plain folders on your PC. The app only
goes online for things you ask for: an AI service you connected, or a streaming link you added.

## Open source

Movie Night Intro is open source under the MIT License. The code is on
[GitHub](https://github.com/ximfinity/Movie-Night-Intro), where you can also report bugs and
suggest features.

**Movie Night Intro is free.** If it made your movie night, a small donation keeps new features
coming. ♥

---

## Step 5: Genre, tags and links

| Field | Value |
|---|---|
| Genre | Other |
| Tags | `movie-night`, `projector`, `slideshow`, `countdown`, `trivia`, `pta`, `party`, `halloween`, `christmas`, `windows` |
| AI generation disclosure | Answer honestly for the code and the art/text. |
| Links | `https://github.com/ximfinity/Movie-Night-Intro` (label: *Source code*) |
| Community | **Comments** on |

## Step 6: Images

1. **Cover image**: upload `cover.png`.
2. **Screenshots**: upload in this order. The first few appear without scrolling, so lead with motion:
   1. `gifs/intro.gif`
   2. `gifs/trivia.gif`
   3. `gifs/slides.gif`
   4. `features/01-show-welcome-video.jpg`
   5. `features/04-show-hold.jpg`
   6. `features/06-phone.jpg`
   7. `features/07-wizard-themes.jpg`
   8. `features/08-show-concessions.jpg`
   9. `features/09-editor-slides.jpg`
   10. `features/10-editor-trivia.jpg`
3. **Gameplay video / trailer**: once you've filmed a real movie night, upload it to YouTube and
   paste the link here.

## Step 7: Theme (on the page, click **Edit theme**)

| Setting | Value |
|---|---|
| Banner | `banner.png` |
| Background | `#0B090E` |
| Inner background | `#15111A` |
| Text | `#ECE6DE` |
| Links / buttons | `#F2B84B` |
| Font | A clean sans-serif (e.g. Lato) |

## Step 8: Publish

Set **Visibility & access** to **Public**, click **Save**, then post the devlog below.

## Launch devlog: "Movie Night Intro is out"

> Movie Night Intro gives your movie night a real pre-show. Pick a theme night, type the movie
> and the showtime, and get welcome slides, house rules, snack prices, sponsor thank-yous and a
> trivia round, with a countdown in the corner. At showtime the curtains open on your feature,
> and your phone is the remote. It's free for Windows. Tell me about your movie night in the
> comments!
