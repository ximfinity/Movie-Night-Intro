# Releasing Movie Night Intro

Running **Actions → Build Windows installer → Run workflow** with **"Publish the installer to a
GitHub Release"** ticked (or pushing a `v*` tag) runs `.github/workflows/build-windows.yml`, which:

1. lints, tests and builds the Windows installer, with the version from `package.json`,
2. publishes it as a **GitHub Release** (`movie-night-intro-1.7.0-setup.exe`), and
3. pushes it to **itch.io** with [butler](https://itch.io/docs/butler/), if the itch.io settings
   below are present. Two channels go up:
   - `windows-installer`: the installer, for people downloading from the page.
   - `windows`: the unpacked app folder with `.itch.toml` (from `build/itch/`), which the
     [itch app](https://itch.io/app) installs and patches in place on updates.

## One-time setup: connect itch.io

1. The project already exists: https://ximfinity.itch.io/movie-night-intro (kind
   **Downloadable**, pricing **$0 or donate**). Build the page with `docs/itch/PAGE.md`.
2. Create an API key: **itch.io Settings → API keys → Generate new API key**. Copy it straight
   into GitHub; don't save it in a file or paste it anywhere else.
3. In this GitHub repo, open **Settings → Secrets and variables → Actions**:
   - **Secrets → New repository secret**: `BUTLER_API_KEY` = that key. If it ever leaks, revoke
     it on the same itch.io page and add a new one.
   - **Variables → New repository variable**: `ITCH_TARGET` = `ximfinity/movie-night-intro`
     (the workflow adds the channel names).
4. After the first upload, open **Edit game → Uploads** on itch.io and set both files as shown
   in `docs/itch/PAGE.md` step 3 (tick **Windows**, give each a display name). You only do this
   once; later releases replace the files in the same channels.

Without the secret and variable, releases still go to GitHub and the itch.io step is skipped with
a notice.

### Keep it locked down

- Turn on two-factor authentication for both GitHub and itch.io.
- GitHub encrypts secrets, never shows them again, masks them in logs, and doesn't give them to
  pull requests from forks.

### Optional: code signing

The installer isn't code-signed, so Windows SmartScreen shows "Windows protected your PC" until
people click **More info → Run anyway** (the page explains this). A code-signing certificate
removes that warning; electron-builder can use one via the `CSC_LINK` and `CSC_KEY_PASSWORD`
secrets.

## Cutting a release

1. Bump the version (`npm version 1.7.0 --no-git-tag-version`), commit and push.
2. **Actions → Build Windows installer → Run workflow**, pick the branch, tick **Publish the
   installer to a GitHub Release**, and run it.

When it's green, the installer is on the GitHub Release and both files are live on itch.io. Post
a devlog on itch.io so followers hear about it.

## Updating the page images

See `tools/marketing/README.md`: the scripts rebuild everything in `docs/itch/` from the real app.
