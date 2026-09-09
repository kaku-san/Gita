# Security policy

## Reporting a vulnerability

Do not publish API keys, tokens, exploit details or personal data in an issue or pull request.

When GitHub private vulnerability reporting is enabled, use [Report a vulnerability](https://github.com/kaku-san/Gita/security/advisories/new). This feature is not yet confirmed enabled. If that link is unavailable, open an issue titled **Private security contact requested**, without technical details, and ask `@kaku-san` for a private reporting channel. Never post the vulnerability itself while waiting.

A useful private report identifies the affected commit, impact, reproducible steps and any suggested fix. Redact secrets. Test only against a local copy or a deployment you own; do not probe other people's accounts or production services.

## Supported version

Security fixes target the latest `main` branch. There is no long-term support promise for earlier snapshots. This is a community project without a guaranteed response time.

## Runtime boundaries

- Vercel serves only `web/`. The browser runs static HTML, CSS, JavaScript, Three.js and bundled media.
- The browser does not call ElevenLabs. Its API key is used only for deliberate, local production runs.
- Voice IDs, model names, content hashes and the public localStorage namespace are identifiers, not authentication credentials.
- Reading position, language and playback preferences are stored in the visitor's browser. Do not add personal data to this storage.
- `worker/asset-server.js` is an optional Cloudflare/Sites publishing backend. Its upload routes require a server-side `GEETA_PUBLISH_TOKEN`; private Sites delivery additionally uses platform authorization. Neither credential belongs in frontend code or Git.
- Vercel security headers restrict framing, embedded objects, base-URL changes and form submissions. They are defense in depth, not a complete script-isolation policy.

## Maintainer practices

- Keep local keys in an ignored `.env`; use hosting secret settings for any backend secrets. Never put keys in `VITE_*`, `NEXT_PUBLIC_*`, public JSON, logs or screenshots.
- Revoke and replace any exposed credential at its provider immediately. Removing a file in a later commit does not remove its history. Assess forks, caches and release archives before rewriting history in coordination with collaborators.
- Use the smallest permissions and spending limits for generation credentials. Ordinary contributors and CI do not need those credentials.
- Keep CI permissions read-only, pin external actions, and do not run untrusted pull-request code with production secrets. Do not switch this workflow to `pull_request_target` to work around fork permissions.
- Before going public, enable available secret scanning and push protection, private vulnerability reporting, and branch rules requiring review plus the `verify` and `Secret scan` checks. `CODEOWNERS` alone does not enforce those rules.
- Require approval for Vercel deployments from untrusted forks and keep production credentials out of preview environments. Review platform settings directly; repository configuration does not establish their current state.
- Periodically review vendored Three.js and font notices. Dependabot covers GitHub Actions here; it does not automatically update vendored browser libraries.

## Scope of the release audit

See [PUBLIC-RELEASE-REVIEW.md](docs/PUBLIC-RELEASE-REVIEW.md) for the inspected revision, scans, findings and remaining decisions. Passing a scanner is not a guarantee that software has no vulnerabilities. GitHub/Vercel/ElevenLabs account settings and credentials outside the repository require separate owner review.
