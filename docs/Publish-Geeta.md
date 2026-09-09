# Publishing Geeta

The portable website is the contents of `web/`. It is a static HTML/JavaScript/Three.js experience with exported MP3 audio. It needs HTTPS hosting, not an ElevenLabs connection or a production backend. Audio synthesis costs are incurred during generation; replaying the website never calls ElevenLabs.

## Git handoff

The hosted Site uses a small Worker with the platform `BUCKET` object store. All 1,138 public files, including the 965 narration MP3s, are uploaded individually and verified against a SHA-256 manifest. The previous site remains the fallback until the complete release is activated. This avoids the large upload and source-fetch timeouts encountered with the single audio-heavy archive. The recordings are unchanged.

The working checkout is `/workspace/sites/vishvarupa`. Its source is versioned in the existing private Sites Git repository. `/workspace/repos/geeta-private` is the user's separate local private clone. These are not a claim that a repository has been created under the user's GitHub account.

`Geeta-Source.zip` contains the exact committed source, generated audio, voice cast and production receipts. Extract it into the intended private GitHub repository, or push the existing local repository to a user-chosen GitHub remote. `Geeta-Website.zip` contains only the deployable site, with `index.html` at its root. Keep the production source and generation receipts outside a public web root.

The real `.env` is local-only and excluded from Git and both archives. `.env.example` is an empty setup template. Keep the full source repository private unless you intend to release its scripts, translations, models and generated masters publicly.

Run `npm run check:release` before a new release. Run `python scripts/package-release.py /absolute/output/folder` after committing to reproduce the two archives. Packaging refuses a dirty working tree or incomplete narration. A simple local server can serve `web/`; opening `index.html` directly as a `file://` URL does not provide the HTTP module and audio environment the experience needs.

## Hosting choices

For the current Sites project, keep the existing private hosted URL as the review surface. A custom hostname can be attached after the user chooses and owns it. The Sites domain operation returns the exact CNAME or apex A targets plus verification records; use those returned records. Do not guess an IP address or change nameservers based on generic instructions for another hosting product. A custom domain does not itself change who can view the Site.

For independent hosting from GitHub, point a static host at this repository and publish directory `web`. There is no framework build command or package install required. For example, Cloudflare Pages supports Git-backed static hosting and custom domains; its apex-domain setup has specific nameserver requirements. Follow the host's actual instructions for the selected hostname. [Cloudflare custom-domain documentation](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Every individual source asset must remain below the chosen Git host and static host's file limits. GitHub blocks ordinary Git files above 100 MiB; use LFS or separate object storage if future assets exceed that. Current narration is stored as short MP3 passages, rather than a single large audio file. [GitHub file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## Domain shortlist — 9 September 2026

| Candidate | Reason | Lookup result |
| --- | --- | --- |
| `entergeeta.com` | Short invitation into an immersive experience | Verisign RDAP returned 404: no current registration record found |
| `thegeetajourney.com` | Explicitly describes the chapter journey | Verisign RDAP returned 404: no current registration record found |
| `experiencegeeta.com` | Clear description of the product | Lookup could not complete; registration status unknown |

These are shortlist results, not reservations or guaranteed checkout availability. Confirm availability and renewal price with the chosen registrar before buying. No domain has been purchased, attached, or made public in this work. The two completed lookups used the `.com` registry endpoints [entergeeta.com](https://rdap.verisign.com/com/v1/domain/entergeeta.com) and [thegeetajourney.com](https://rdap.verisign.com/com/v1/domain/thegeetajourney.com).

## Hosted media release

`npm run build` creates `dist/server/index.js`, the previous-site fallback under `dist/client/_previous/`, and `hosting/release.json`. The hosted manifest declares the existing project and `r2: "BUCKET"`. The separate `GEETA_PUBLISH_TOKEN` is a private runtime secret for publishing fixed, checksum-verified files; the ElevenLabs key is never sent to the host. The upload endpoint cannot accept arbitrary paths or activate an incomplete release.

After deployment, run `scripts/upload-hosted-assets.py` with `GEETA_SITE_ORIGIN` and the temporary Sites authorization bearer supplied only in the process environment. It resumes already uploaded objects, transfers the remaining files, checks every object before activation, and writes a local report under ignored `dist/`. Do not put either publishing credential into Git, website assets, or command examples. Normal visitors only use read routes.

The portable ZIP still contains the complete static website and all audio, so independent static hosting does not require this Worker or object store.

API references: [R2 Worker API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) and [static asset binding](https://developers.cloudflare.com/workers/static-assets/binding/).
