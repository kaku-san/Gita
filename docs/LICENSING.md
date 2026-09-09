# Licensing scope

The owner has approved the [MIT License](../LICENSE) for original application code, configuration, build/test scripts and documentation. You may reuse, modify and redistribute covered work, including commercially, while retaining the copyright and license notice. Contributors retain their copyright and submit covered contributions under the same terms unless otherwise agreed before merging.

## What MIT covers

The grant covers original executable code and configuration in this project, its build/test/generation scripts, and project documentation. This includes the original JavaScript, HTML and CSS that implement the website and the optional publishing backend. It does not replace a third party's license.

## What MIT does not cover

Generated recordings, voice models, narration scripts and story/translation text, artwork, meshes, fonts and vendored third-party libraries are outside the original-code grant. This exclusion also applies to non-code content embedded in source files and to copies inside archives. Those materials retain their applicable ownership and terms; the MIT license does not grant access to a provider account, a voice model, trademarks or a person's likeness.

Three.js has its own included MIT notice; the fonts have included SIL Open Font License notices. Public redistribution rights for other assets still need confirmation as recorded below. Attribution does not by itself establish reuse permission.

## Asset inventory

| Material | Location | Current evidence / release requirement |
| --- | --- | --- |
| Three.js r180 | `web/vendor/`; other vendor modules re-export it | MIT notice is included in `web/vendor/THREE-LICENSE.txt`; preserve it. |
| Source Sans 3, Source Serif 4, Noto fonts | `web/fonts/` | SIL Open Font License notices and source/subsetting provenance are included. Preserve the notices and review font-modification requirements for future updates. |
| Narration and generated sound | `web/audio/`, `production/narration/`, `production/sound/` | Generation records identify ElevenLabs and the cast. Confirm the account's applicable plan and voice/output terms for public source distribution, including masters and auditions. Do not present voice models or third-party voice rights as MIT. |
| Sanskrit and adapted dialogue/translations | `web/narrative/`, production scripts | The project describes its dialogue as an original abridged retelling. Confirm rights to modern wording and sources; ancient Sanskrit and modern translations are distinct works. Native-language review is still welcome. |
| Scene models and generated geometry | `web/elements/`, `web/battle/`, `web/vision/`, related scripts | Local generation/checking scripts are present. Confirm provenance of approved input meshes and any source material before granting a broad asset license. |
| Bundled archives | `hosting/previous-site.tar.gz`, `web/downloads/Geeta-Narration-Scripts.zip` | Copies retain their constituent works' terms; an archive is not independently relicensed. |

ElevenLabs' terms distinguish generated output from its voice models and make output use subject to the applicable service terms. Publishing rights also depend on the plan and whether beta services were used. The repository contains generation receipts, not a verified subscription/license record. [Terms](https://elevenlabs.io/terms-of-use), [publishing guidance](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform).

This inventory records what was checked and what remains for the owner; it is not a claim that third-party or generated material can be relicensed without permission.
