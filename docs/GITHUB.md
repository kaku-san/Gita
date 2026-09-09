# Repository maintenance

The project lives in `kaku-san/Gita`. `main` is the production branch for the connected Vercel project. Do not create a second repository or upload another ZIP over this history.

## Contribution flow

Public contributors use forks and pull requests; invited collaborators use feature branches. `CONTRIBUTING.md`, the issue forms and PR template explain the workflow. `CODEOWNERS` requests review from `@kaku-san`; it does not by itself prevent merges.

Use labels such as `bug`, `enhancement`, `documentation`, `accessibility`, `translation`, `audio`, `performance`, `good first issue` and `help wanted` as useful. Labels and starter issues have not been auto-created. Give a first issue a clear outcome and relevant file paths before marking it beginner-friendly.

## Owner settings before public contribution

1. Resolve the license and asset rights in `LICENSING.md`.
2. Enable a `main` branch rule that requires a pull request, at least one approving review, dismissal of stale approvals, and successful `verify` and `Secret scan` checks. Block force pushes and deletion. The API reported that rulesets need GitHub Pro or a public repository for this account's current private repo, so configure these when available; they are not yet enforced by this change.
3. Enable private vulnerability reporting, available secret scanning and push protection. Confirm the reporting link in `SECURITY.md` works for other users.
4. Keep forked PR workflows unprivileged and require approval for first-time contributors. Review Vercel's fork-deployment controls before allowing public previews. Do not expose production credentials to preview builds.
5. Change visibility only after these decisions are complete. Public history and archives can be copied; a later private switch does not recall copies.

CI uses read-only repository permissions, does not persist checkout credentials, pins its actions, verifies the Gitleaks binary checksum, and scans current tracked files plus fetched Git history. Dependabot proposes GitHub Actions updates. Vendored Three.js and production-tool dependencies need manual review.

The branch-protection, private-reporting and account-level settings above are owner tasks, not claims about their current configuration. [Branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [private reporting](https://docs.github.com/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository).
