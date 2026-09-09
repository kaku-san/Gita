# Public-release review

Reviewed on 2026-09-09. Baseline GitHub commit: `e302f33d2f51f1c3e5f54b2b240ae5d7473f9307`.

**Result:** no credentials detected in the inspected repository/history after two verified false positives were identified. The contribution structure and repository safeguards are prepared. The repository remains private; licensing and owner-controlled account settings still need decisions before a public launch.

## Audit scope and evidence

| Area | Inspected | Result |
| --- | --- | --- |
| GitHub history | All three commits reachable from the advertised `main` ref; no other advertised branches/tags | Their Git trees matched the three local history snapshots exactly. All 3,539 unique historical blob objects were available locally for inspection. |
| Current repository | 3,550 tracked files at the baseline | No tracked real `.env`, private-key or hosting-credential file was found; `.env.example` contains empty values only. |
| Secret scanning | Gitleaks 8.30.1, history and tracked-file export, archive depth 4 and decode depth 3 | Clean after reviewed false positives. The file scan processed approximately 399 MB, including binary/media content as supported by the scanner. |
| Embedded archives | `hosting/previous-site.tar.gz` (169 members), `web/downloads/Geeta-Narration-Scripts.zip` (993 members) | No credential filenames or credential findings. The prior-site archive is unchanged across the baseline history. |
| False-positive review | Two `generic-api-key` matches in current/archived `app.js` | Both were the exact public localStorage namespace. The exception matches only that assignment and that rule; no file, folder or commit is excluded. |
| Scanner behavior | Additional raw ElevenLabs-style key rule | A temporary synthetic, unlabelled key was rejected. It was never committed or sent to a provider. |
| Vendored rendering library | Three.js r180 / npm `three` 0.180.0 | Both real vendor files matched the official r180 files byte-for-byte. The other vendor modules re-export this copy. An OSV query for npm `three` version `0.180.0` returned no advisories at audit time. |
| Browser/API boundary | Application, audio cache, manifest loading, local preferences and DOM updates | Normal playback uses local static recordings; no ElevenLabs credentials or runtime generation calls. Dynamic UI data is repository-controlled. This was a source review, not a penetration test. |
| Optional publishing backend | `worker/asset-server.js`, uploader and existing host checks | Upload/activation requires a server-side token; files are constrained by the release manifest and verified checksums. Existing checks for unauthorized access, incomplete activation and media ranges pass. Vercel does not deploy this backend. |
| Functional regression | Arrival, release, podcast and hosted-server checks | Passed, including all 965 recordings and text/voice assignment checks. |

The Gitleaks executable was downloaded from the official release and verified against its published SHA-256 checksum. CI uses that exact binary checksum. No secret values or raw scan reports are committed.

## Changes prepared by this review

- Replaced the historical README with a contributor-facing overview, feature list, verified technology stack, project map, local setup, checks, deployment and credits.
- Added `CONTRIBUTING.md`, `SECURITY.md`, three issue forms, a PR template and `CODEOWNERS` for maintainer review.
- Added Gitleaks scans of fetched Git history and current tracked files/archives, keeping inherited detection rules and a precise exception for the public storage namespace.
- Pinned CI actions, disabled persisted checkout credentials, retained read-only workflow permissions, and added Dependabot updates for GitHub Actions.
- Expanded credential-file ignores and added Vercel response headers for MIME sniffing, referrer disclosure, framing, objects, base URLs and forms.
- Replaced stale GitHub/hosting handoff instructions with the current `kaku-san/Gita` and Vercel workflow.
- Prepared a proposed MIT license for original code/documentation and a separate asset-rights inventory. No license grant or repository visibility change was made.

## Owner decisions before public launch

1. **Approve the code license.** Read [LICENSING.md](LICENSING.md) and the complete [MIT proposal](LICENSE-MIT.proposed.txt). It permits modification, redistribution and commercial reuse of covered code. It is not active yet.
2. **Confirm rights for bundled assets.** Check the ElevenLabs plan/voice/output terms applicable at generation time, plus the provenance of narrative translations and approved input meshes. Generation receipts are not a license certificate. Preserve the included Three.js and font licenses.
3. **Review credentials outside Git.** Provider keys, chat attachments, local files and hosting secret stores are outside this scan. Rotate any credential previously shared outside its intended secret store; the existing recordings do not need an API key to play.
4. **Enable account safeguards.** Require PR review and successful `verify`/`Secret scan` checks on `main`, enable available secret scanning/push protection and private vulnerability reporting, and review fork/preview deployment permissions. The rulesets API returned a plan/visibility restriction while the repo was private; these controls have not been enabled by this change.

## Limits

A clean secret scan is not proof that no vulnerability exists. This review did not inspect provider-account settings, validate or revoke live credentials, audit billing/voice entitlements, conduct a browser penetration test, or certify asset licensing. Deleted/unreachable GitHub objects, caches, issues, PR attachments, external releases and copies outside the advertised repository history are not covered. New contributions and upstream dependencies require ongoing review.

References: [Gitleaks](https://github.com/gitleaks/gitleaks), [Three.js r180](https://github.com/mrdoob/three.js/tree/r180), [OSV API](https://google.github.io/osv.dev/post-v1-query/), [GitHub repository licensing](https://docs.github.com/articles/licensing-a-repository), [private vulnerability reporting](https://docs.github.com/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository).
