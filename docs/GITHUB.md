# Private GitHub repository

The existing Site repository remains the deployment source. The GitHub project should initially be private under `kaku-san/gita`; making it public is a separate, later decision.

From the complete project checkout, after applying this update and committing it:

```bash
gh auth login
gh repo create kaku-san/gita --private --source . --remote github --push
gh repo view kaku-san/gita --json nameWithOwner,visibility,url
```

Use `--remote github` to retain the existing `origin` used by the Site. If the repository already exists, do not run the creation command; add its URL as the `github` remote and push the intended branch normally.

## Development

Node.js and Python 3 are sufficient for the existing checks and static website. From the project root:

```bash
python -m http.server 8000 --directory web
node scripts/check-arrival.mjs
npm run check:release
npm run build
```

Open `http://localhost:8000`. The website uses the checked-in narration and sound files. No ElevenLabs key is required to run or host the finished experience.

Generation credentials belong only in the local, ignored `.env`. Keep `.env.example` empty of real values. Never include GitHub, Site publishing, or ElevenLabs tokens in a remote URL, frontend file, screenshot, or commit.

## Project structure

- `web/`: portable website, language content, 3D assets, fonts and finished audio.
- `web/experience/`: arrival, opening, ending, player, sound and UI components.
- `web/narrative/`: chapters, translations, Sanskrit access and narration manifests.
- `production/`: existing source material and audio production records.
- `scripts/`: existing checks, audio production and packaging; arrival regression checks added by this update.
- `worker/` and `hosting/`: existing private Site delivery implementation.
- `docs/CREDITS.md`: technology, inspiration, typography and voice cast.

The current hosting path uploads content-addressed files after deployment. Preserve that release workflow; a normal Git push alone does not activate new media. This update does not change the project's license or make the repository public.

The verification workflow uses the official [checkout](https://github.com/actions/checkout) and [setup-node](https://github.com/actions/setup-node) actions, with read-only repository permissions.
