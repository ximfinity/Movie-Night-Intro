# Releasing Movie Night Intro

Running **Actions → Build Windows installer → Run workflow** with **"Publish the installer to a
GitHub Release"** ticked (or pushing a `v*` tag) runs `.github/workflows/build-windows.yml`, which:

1. lints, tests and builds the Windows installer, with the version from `package.json`, and
   signs it if code signing is set up (see below),
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

## One-time setup: code signing (Azure Artifact Signing)

Signing puts your name on the installer as the verified publisher instead of "Unknown
publisher", and stops Windows treating every download as suspicious. Since 2023, signing keys
must live on secure hardware, so a plain certificate file can't be used from GitHub Actions any
more. Microsoft's **Azure Artifact Signing** (formerly "Trusted Signing") is a cloud service
that works here: about **$9.99/month**, open to individual developers in the **US and Canada**
(and to organizations).

(The free [SignPath Foundation](https://signpath.org) program for open-source projects
requires *every* bundled component to be open source, and GSAP isn't, so it doesn't apply unless
GSAP is replaced; see `THIRD_PARTY_NOTICES.md`.)

Releases are signed automatically once the `AZURE_CLIENT_SECRET` secret exists. Everyday builds
(every push) stay unsigned so they don't use up signatures.

### 1. Create the signing account (Azure portal)

1. Sign in at https://portal.azure.com with a **pay-as-you-go** subscription (free and trial
   subscriptions aren't accepted).
2. **Subscriptions → your subscription → Resource providers**: register
   `Microsoft.CodeSigning`.
3. Search for **Artifact Signing** (or **Trusted Signing**) and **Create** an account: pick a
   resource group, a name (this is the *account name*), a region near you, and the **Basic** plan.
   Open it and copy its **Account URI**, for example `https://eus.codesigning.azure.net/` (this
   is the *endpoint*).
4. On the account, **Access control (IAM) → Add role assignment**: give yourself
   **Artifact Signing Identity Verifier** (older name: *Trusted Signing Identity Verifier*).
5. **Identity validations → New → Public → Individual**, and follow the steps with your photo ID.
   Microsoft checks it; plan for a few business days.
6. When it shows **Completed**, **Certificate profiles → Create → Public Trust**: pick the
   validation and a name (this is the *certificate profile name*). The name on the validation
   (usually your legal name) is the *publisher name*.

### 2. Let GitHub sign with it

1. **Microsoft Entra ID → App registrations → New registration**, name it e.g.
   `movie-night-intro-signing`, and register. Copy the **Directory (tenant) ID** and the
   **Application (client) ID**.
2. In the app registration: **Certificates & secrets → New client secret**. Copy the secret's
   **Value** (not its ID) straight into GitHub in the next step. Secrets expire (at most 24
   months), so set yourself a reminder to replace it.
3. Back on the signing account: **Access control (IAM) → Add role assignment** →
   **Artifact Signing Certificate Profile Signer** (older name: *Trusted Signing Certificate
   Profile Signer*) → assign it to the app registration.
4. In this GitHub repo, **Settings → Secrets and variables → Actions**:

   | Kind | Name | Value |
   |---|---|---|
   | Secret | `AZURE_TENANT_ID` | Directory (tenant) ID |
   | Secret | `AZURE_CLIENT_ID` | Application (client) ID |
   | Secret | `AZURE_CLIENT_SECRET` | the client secret's value |
   | Variable | `AZURE_SIGNING_ENDPOINT` | the account URI, e.g. `https://eus.codesigning.azure.net/` |
   | Variable | `AZURE_SIGNING_ACCOUNT` | the signing account name |
   | Variable | `AZURE_SIGNING_PROFILE` | the certificate profile name |
   | Variable | `AZURE_SIGNING_PUBLISHER` | the publisher name, exactly as on the certificate |

The next release is signed, and the workflow checks that both the installer and the app's
`.exe` carry a valid signature before publishing anything. If any of these settings is missing,
the release stops with a message naming it rather than going out unsigned by accident.

After the first signed release, update the itch.io page: in `docs/itch/PAGE.md` (Install),
replace step 2 with *"Windows may still show a SmartScreen notice for a short while after a new
version comes out; click **More info → Run anyway**."* SmartScreen also builds trust from download
history, so a brand-new signer can still see that notice at first.

## Cutting a release

1. Bump the version (`npm version 1.7.0 --no-git-tag-version`), commit and push.
2. **Actions → Build Windows installer → Run workflow**, pick the branch, tick **Publish the
   installer to a GitHub Release**, and run it.

When it's green, the installer is on the GitHub Release and both files are live on itch.io. Post
a devlog on itch.io so followers hear about it.

## Updating the page images

See `tools/marketing/README.md`: the scripts rebuild everything in `docs/itch/` from the real app.
