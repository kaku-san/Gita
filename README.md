# GITA

An immersive, browser-based retelling of the Bhagavad Gita: Krishna and Arjun in a continuous Three.js battlefield, with reading, narration and selected Sanskrit shlokas.

**18 chapters · 5 languages · 965 narration recordings · mobile-first controls**

[Contribute](CONTRIBUTING.md) · [Report a bug](https://github.com/kaku-san/Gita/issues/new/choose) · [Credits and voices](docs/CREDITS.md) · [Security](SECURITY.md)

## The experience

- A language-first entrance that prepares the scene, fonts, content and initial audio before continuing.
- English, Hindi, Japanese, Simplified Chinese and French.
- **Listen:** recorded narration, 0.5×–2× speed, chapter seeking, 15-second skips and saved position.
- **Read:** paced passages, optional autoplay, and Sanskrit with meaning in a study sheet.
- A moving battlefield, opening character sequence, Chapter XI's Vishvarupa reveal and a closing sequence.
- Touch and mouse camera controls, reduced-motion support, locally served fonts and layered battlefield sound.

The dialogue is an original **abridged interpretation**, not the complete scripture or an authoritative translation. Selected Sanskrit verses are identified separately. Native-language, pronunciation and source review are welcome.

## Run locally

You need **Git and Python 3**. Use **Node.js 22 or newer** for the checks. No API key, ElevenLabs account, npm installation or build step is needed to run the website. The clone includes generated audio and production assets, so it is a substantial download.

```bash
git clone https://github.com/kaku-san/Gita.git
cd Gita
python3 -m http.server 8000 --bind 127.0.0.1 --directory web
```

Open **http://localhost:8000** in a browser with WebGL support. Serve the files over HTTP; opening `index.html` directly from disk will not load ES modules correctly. Repository access is required while this project remains private.

## Technology

| Layer | Technology | Purpose |
| --- | --- | --- |
| Interface | HTML, CSS, vanilla JavaScript ES modules | Responsive menus, language selection, dialogue and controls |
| 3D scene | Three.js r180 / WebGL | Battlefield, characters, camera movement and transitions |
| Audio playback | HTML audio, Web Audio API, Media Session API where supported | Narration, speed/seeking, spatial ambience and media controls |
| Voice production | ElevenLabs `eleven_v3` and Sound Effects API | Pre-generated narration and battlefield recordings; no runtime API calls |
| Typography | Source Sans 3, Source Serif 4, Noto families | Locally hosted WOFF2 subsets for the five languages and Sanskrit |
| Validation | Node.js built-in assertions | Loading, player, narrative, asset and camera checks |
| Production utilities | Python, FFmpeg; NumPy/FontTools for relevant asset tasks | Audio preparation, font work and packaging |
| Hosting | Vercel static deployment | Serves the complete `web/` directory |
| Optional host | Cloudflare Worker and R2 via Sites | Separate authenticated media-publishing workflow |
| Repository checks | GitHub Actions, Gitleaks | Validation and secret detection, including history and archives |

Three.js is vendored; there is no frontend framework or JavaScript bundler. The browser uses the included recordings and does not need a live AI service.

## Project map

| Path | Contents |
| --- | --- |
| `web/index.html`, `web/app.js` | Entry screen, application state and story/player integration |
| `web/experience/` | Loading, interface, podcast controls, opening and ending |
| `web/narrative/` | Adapted story, translations, Sanskrit references, audio manifest and voice credits |
| `web/world.js`, `web/camera.js` | Scene and camera orchestration |
| `web/elements/`, `web/battle/`, `web/vision/` | Scene assets, battlefield elements and Vishvarupa |
| `web/audio/`, `web/fonts/`, `web/vendor/` | Runtime recordings, licensed fonts and Three.js |
| `scripts/` | Checks, asset preparation, generation and release utilities |
| `production/` | Narration scripts, cast, takes, generation records and sound masters |
| `worker/`, `hosting/` | Optional Cloudflare/Sites host, manifests and fallback archive |
| `.github/` | CI, issue templates, PR template and review ownership |
| `docs/` | Credits, deployment, licensing and release-review notes |

## Checks

Run from the repository root in a separate terminal:

```bash
node scripts/check-arrival.mjs
npm run check:release
```

The checks verify loading transitions, podcast behavior, the 965 installed recordings, matching text/voice assignments and host behavior. CI also scans Git history and tracked files with Gitleaks. Area-specific checks and device-testing expectations are described in [CONTRIBUTING.md](CONTRIBUTING.md).

Automated checks do not replace listening or testing on real phones. Please identify the language, passage, device and browser when reporting an issue.

## Contribute

You do not need to be a Three.js developer. Useful contributions include:

- Native-language corrections and pronunciation review.
- Mobile usability, accessibility and slow-connection testing.
- Focused playback fixes and measured rendering improvements.
- Clearer documentation and reproducible bug reports.

**Open an issue → work in a fork or feature branch → submit a focused PR → maintainer review.** The templates ask for the context needed to reproduce and assess changes. Read [the contribution guide](CONTRIBUTING.md) before substantial work; discuss new features, visual redesigns and audio generation first.

Original code and documentation contributions use the MIT License. Contributions to narrative, audio or other assets must identify their separate terms; see [licensing scope](docs/LICENSING.md).

## Deploy

For Vercel, import the repository and keep **Root Directory at the repository root**. The included `vercel.json` selects the Other framework preset, skips install/build and publishes **`web/`**. A push to `main` triggers deployment when the Git integration is enabled.

Other static hosts can also serve `web/`. The optional `npm run build` command packages the **Cloudflare/Sites backend**, not the Vercel site. See [deployment instructions](docs/Publish-Geeta.md).

## Audio production and credentials

The [narration README](production/narration/README.md) and [voice credits](docs/CREDITS.md#narration-cast) list the voices, languages and models used. Voice IDs are identifiers, not API credentials; custom voices may require the owning ElevenLabs account to regenerate.

Generating new audio is a separate, potentially billable maintainer task. Use the empty `.env.example` only if you intentionally need production tools. Real `.env` files and hosting credentials must stay local and uncommitted. Never place secrets in `web/`, a public environment variable, an issue or a PR. See [SECURITY.md](SECURITY.md).

## Credits and inspiration

Built by Akanshu Jain with Codex-assisted development. Three.js renders the scene; ElevenLabs generated the voices and sound effects. Typography uses Source and Noto families.

Visual and interaction references include [Lusion's AI Quest](https://ai-quest.lusion.co/), [The Gateless Gate 3D](https://killedbyapixel.github.io/GatelessGate/#preface) and [Astra](https://astra.directory/). These are inspirations, not endorsements. See [full credits](docs/CREDITS.md) for source links, voice IDs and license notices.

## License and public-release status

**Original application code, configuration, build/test scripts and documentation are licensed under the [MIT License](LICENSE).** Retain the copyright and license notice when reusing covered work. 

Three.js and fonts retain their included MIT/OFL licenses. Generated recordings, voices, meshes and narrative/translation assets require their own rights review; they are not automatically covered by the original-code MIT license. See [licensing scope](docs/LICENSING.md) and the [public-release review](docs/PUBLIC-RELEASE-REVIEW.md).
