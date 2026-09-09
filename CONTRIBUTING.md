# Contributing to GITA

Help make this experience more readable, accessible, accurate and enjoyable on everyday phones. Code is only one way to contribute: native-language review, pronunciation feedback, device testing and documentation are welcome.

## Choose a contribution

| Area | Useful first contributions | Start here |
| --- | --- | --- |
| Languages | Grammar, natural wording, punctuation, pronunciation | `web/narrative/locales/`, `web/narrative/ui.js` |
| Mobile and accessibility | Reproducible layout, keyboard, contrast or touch-target issues | `web/index.html`, `web/experience.css`, `web/experience/` |
| Playback | Loading, seeking, speed and resume bugs | `web/narrative/audio-player.js`, `web/experience/podcast.js` |
| Scene performance | A measured improvement on a real phone | `web/world.js`, `web/camera.js`, `web/elements/` |
| Documentation | Clearer setup steps, broken links, testing notes | `README.md`, `docs/` |

Use the appropriate [issue template](https://github.com/kaku-san/Gita/issues/new/choose). Before a substantial feature or visual redesign, explain the problem and proposed scope in an issue. Small, focused fixes may go straight to a pull request. Please ask before generating new audio: generation costs money and changing the cast affects the experience.

## Run the project

Install Git and Python 3; use Node.js 22 or newer for the automated checks. Follow the [README](README.md#run-locally). Playback needs no account, API key or package installation.

Once the repository is public, fork it and work on a branch in your fork. Invited collaborators can use a branch in the existing repository.

```bash
git clone https://github.com/YOUR-USERNAME/Gita.git
cd Gita
git switch -c fix/short-description
python3 -m http.server 8000 --bind 127.0.0.1 --directory web
```

Open `http://localhost:8000`. Keep the server running and use a separate terminal for checks.

## Before opening a pull request

```bash
node scripts/check-arrival.mjs
npm run check:release
git diff --check
```

These checks need no external services. Run the relevant additional check when your change affects a specific area: `check-locales.mjs`, `check-ending.mjs`, `check-opening-credits.mjs`, `check-field-audio.mjs` or `check-cinematic.mjs`, all under `scripts/`. Some checks rewrite validation reports; review those diffs before including them. Do not change approved-asset checksums simply to make a failing test pass.

For interface changes, test a narrow phone viewport, landscape, keyboard navigation and reduced motion. Include screenshots and the actual browser/device tested; do not claim device testing from source checks alone. For playback changes, test pause, seeking, speed, resuming, a slow connection and a failed request. Preserve the selected-language loading gate and the user's mode preference.

Keep the pull request focused. Explain what changed, why, and what you checked. Link the issue and use the supplied PR template. The maintainer reviews and merges changes; contributors do not need production hosting access. A merge to `main` can deploy to Vercel, so use feature branches for work in progress.

## Text, translation and narration

- Include the language, chapter and stable passage ID with every correction.
- Distinguish the original Sanskrit from this project's abridged interpretation. Explain interpretive changes and cite a source; do not paste copyrighted modern translations.
- Update all affected UI language strings, or explicitly identify missing translations in the PR.
- Changing spoken text also requires matching narration and manifest updates. Flag that dependency; do not silently ship text/audio mismatches or regenerate all languages for a small correction.
- Japanese, Chinese and Devanagari fonts are subsetted. Check new characters against `web/fonts/README.md`.
- Record a new asset's origin, author, license and modifications. Preserve existing third-party notices. Do not contribute imitations of real people without appropriate rights and consent.

## Credentials and security

Never commit `.env`, API keys, hosting tokens, private keys, raw account exports or screenshots containing credentials. The empty `.env.example` documents variable names only. The site serves `web/`; production scripts and private files must stay outside it. Contributors use their own credentials for any separately agreed production work.

CI runs Gitleaks on history and current files, including archives. To scan locally with Gitleaks installed:

```bash
gitleaks git . --log-opts=--all --redact=100 --max-archive-depth=4 --max-decode-depth=3
```

Do not add broad scanner exclusions. Report security problems through [SECURITY.md](SECURITY.md), not a public bug report.

## Conduct and rights

Be respectful of contributors, cultures and religious interpretations. Critique the work, explain disagreements with evidence, and avoid harassment or personal attacks. The maintainer may close abusive or unrelated discussions.

Submit only work you have the right to contribute. Unless explicitly agreed otherwise before merging, original code and documentation contributions are provided under the project's [MIT License](LICENSE). You retain your copyright. Narrative, audio, artwork and other asset contributions must document their applicable terms and provenance separately; see [licensing scope](docs/LICENSING.md).
