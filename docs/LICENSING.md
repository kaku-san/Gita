# Licensing status and proposed release terms

The original project does not yet have an active open-source license. Making a repository visible on GitHub does not automatically grant general reuse or redistribution rights. Third-party components retain the licenses already included with them. [GitHub guidance](https://docs.github.com/articles/licensing-a-repository).

## Proposed decision for the owner

Use the MIT License for original application code, configuration, build/test scripts and documentation. This permits reuse, modification and commercial use with the copyright/license notice retained. The complete text is prepared in [LICENSE-MIT.proposed.txt](LICENSE-MIT.proposed.txt). It is a proposal only; the owner must approve its scope before it becomes the root `LICENSE`.

Keep generated audio, voices, artwork/mesh assets, narrative text/translations, font files and vendored libraries outside that original-code grant until their relevant rights are confirmed. This avoids describing every bundled asset as MIT. The README should be updated when the decision is made.

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
