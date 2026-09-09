# Deploying GITA

## Vercel: current deployment

Import `kaku-san/Gita` and leave the project's Root Directory at the repository root. The checked-in `vercel.json` specifies:

| Setting | Value |
| --- | --- |
| Framework | Other (`null`) |
| Install command | Empty; skipped |
| Build command | Empty; skipped |
| Output directory | `web` |

The website is already complete HTML/CSS/JavaScript with local assets. Do not use `npm run build` for Vercel: that command creates the optional Cloudflare Worker package. Only `web/` should be publicly served; never set the output directory to the repository root.

The Git integration deploys changes to `main` when enabled. Check the deployment result before announcing an update as live. Preview deployments from forks should require maintainer approval and receive no production credentials. Configure custom domains in the owning hosting account; no domain purchase or DNS changes are part of this repository setup.

Security headers are versioned in `vercel.json`: MIME sniffing protection, a referrer policy, framing restrictions, and restrictions on objects, base URLs and form submissions. They intentionally do not block the existing module scripts, inline styles or local/blob audio. This is not a full restrictive script CSP.

[Official static-build guidance](https://vercel.com/docs/builds/configure-a-build#skip-build-step), [project configuration](https://vercel.com/docs/project-configuration/vercel-json).

## Other static hosts

Serve the contents of `web/` over HTTPS. Keep their relative paths intact and serve JavaScript, JSON, WOFF2, binary mesh data and MP3 files with their correct MIME types. Support HTTP byte ranges for narration seeking. No ElevenLabs key or backend service is needed for playback.

## Optional Cloudflare/Sites publishing

The alternative backend in `worker/asset-server.js` uses the `BUCKET` object store and a content-addressed release manifest. It is independent of the Vercel deployment.

1. Run `npm run build` to generate the small Worker artifact and `hosting/release.json`.
2. Deploy through the owning Sites project with its real identity and bindings; do not reuse another owner's project ID for a fork.
3. Configure the server-side `GEETA_PUBLISH_TOKEN` as a hosting secret and provide the matching value locally in ignored `.env`.
4. Supply `GEETA_SITE_ORIGIN` and `GEETA_SITE_BEARER` through the local process environment when intentionally running `python3 scripts/upload-hosted-assets.py`.
5. The uploader verifies object checksums and sizes. Activation is refused until every expected asset is present; the previous release remains available before activation.

Do not paste tokens into command history, screenshots, logs, source files or Git. This path needs separate account access; contributors should use the static local preview instead. [R2 Worker API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

## Release checks

```bash
node scripts/check-arrival.mjs
npm run check:release
```

After deployment, test the language gate, all five languages, Listen/Read selection, narration seeking and mobile layout. Automated validation is not a substitute for device or native-language review.
