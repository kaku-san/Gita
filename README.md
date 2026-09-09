# Geeta — the complete immersive conversation

A private, self-contained Three.js experience: 18 chapters, 72 scenes and 188 active adapted passages in English, Hindi, Japanese, Simplified Chinese and French. All runtime assets are served from this Site. The dialogue is an original abridged adaptation; selected ancient Sanskrit shlokas are shown separately with references.

Voice names, IDs, languages and generation models are documented in [the narration README](production/narration/README.md#voices-used). All 965 narration clips are generated and installed; Hindi Krishna uses approved audition 2. The ElevenLabs API key stays in a local, Git-ignored `.env` file and is never part of the hosted experience.

## Project documentation

- [Credits, technology and inspirations](docs/CREDITS.md)
- [Private GitHub and local-development guide](docs/GITHUB.md)
- [Publishing and domain handoff](docs/Publish-Geeta.md)

## Enter and navigate

The entrance loads the compiled scene, selected-language content/fonts and initial audio behind a full-screen loading state, then plays a live Three.js opening (35.5 seconds in Read; extended to fit narration in Listen) before every entry, including resumed journeys: split-screen Pandava/Kaurava face-off → Arjun close-up → Krishna close-up → full-screen गीता / GEETA title → moving-rath arrival. Portrait screens stack the face-off views. Both panes render the existing animated battlefield; there are no image slides or generated illustrations. The first pane expands into the continuous camera rig, with matched projection at the handoff. The credits occupy the full viewport with Pause, Continue and Skip; the usual reading controls return after the arrival. Story captions and essential controls are present in all five languages. Visible helper labels and explanatory UI notes have been removed. Reduced-motion settings hold the cameras and remove typography movement. The first spoken passage is Arjun asking Krishna to take the chariot between the armies. The court prologue and final court narration remain outside the active experience; source and audio IDs are preserved.

The final response now leads to a 21-second closing: Arjun returns from the prayer pose with a steady bow, the existing camera rig pulls back continuously, and the Geeta title appears over the live field. Manual readers choose Finish; reading autoplay and actual final-recording completion start it automatically. The screen offers Revisit chapters, Stay on the field and Begin again. Pausing and backgrounding hold the closing; the user's volume and lighting preferences are retained. A separate sound envelope quiets battle effects into a soft wind bed. No new character geometry or images are introduced. Reopening the ending from field exploration discards stale exploration state without resetting the rendered camera.

The story UX has a full-width scene above a dark conversation stage, large high-contrast dialogue and a unified transport. Read/Listen, Previous/Play/Next and Shloka & meaning live together. A new chapter drawer shows an eighteen-chapter index. Listen stays scene-only by default; its transport and source control remain available during playback. Shloka & meaning expands a light study sheet above the same persistent transport without pausing narration. Original Sanskrit and scene meaning are distinguished. Read autoplay remains explicit and pauses for study, text scrolling, menus and hidden tabs. All five languages have recorded narration. Listen adds chapter-wide seeking, 15-second skips, visible 0.5×–2× speed, saved playback position and supported media-session controls.

Desktop: drag to orbit, wheel to zoom, Shift/right-drag or WASD to move. Touch: one finger turns, two fingers pan and pinch zooms. The camera reserves a fixed bottom reading area, so text length never reframes a shot. The rendered camera follows the raw shot destination through one velocity-preserving rig; visual reveals ease separately. This removes the old double easing that stalled motion during repeated Next clicks. Linear speed is bounded at 5 m/s and rotation at 0.35 rad/s. Hold camera still freezes the current transform instead of cutting to a new view. The old gentle-camera setting is migrated to continuous motion unless an OS reduced-motion preference or a new explicit fixed-view choice applies. Hidden Chapter XI materials compile before entry to avoid first-reveal shader compilation stalls.

`#chapter-11/3/1` addresses an exact chapter/scene/passage. The original `#passage-1` through `#passage-10` links still address the approved Chapter XI cues. The old field-only query view is replaced by the in-scene camera controls.

## Story choreography

The opening has a 9 m, 10.5 s arrival with four-beat horse walking, planted contacts, proportional wheel rotation and restrained deck suspension. Skip arrival parks the rath. It remains parked for the teaching. Krishna turns toward Arjun; from Chapter II through the final teaching, Arjun kneels with joined palms using the approved body's original geometry and materials. The final resolution restores the original pose.

The approved Chapter XI sequence still includes the universal form, awe and fear, Time, the reassuring four-armed form, and return to Krishna. The Dashavatar studies are not inserted into this sequence. The ten approved visual cues map to fourteen full-story spoken passages.

Near the chariot, pairs of soldiers exchange sword and shield attacks. Mounted cavalry walks; elephants move their trunks, ears and weight while carrying riders. Distant formations fill all sides of the field. Nature includes mature trees, dry grass, drainage banks, birds, dust and moving banners. Hold camera still freezes the current camera without freezing combat; Pause scene freezes the world. Hidden tabs stop rendering and suspend battlefield ambience.

Light follows a deliberately staged dawn-to-night progression across the chapters, or can be set to Dawn, Day, Dusk or Night. The sky, near lights, distant haze and silhouettes change together. Chapter XI overrides this with its approved divine-light sequence. The introduction explicitly distinguishes this staging from the pre-battle conversation's chronology.

Battlefield audio now uses eight locally hosted ElevenLabs sound-effect recordings: wind, army ambience, melee on each side, walking horses/chariot, horse breathing, conch and war drum. They replace the procedural battlefield completely. Sound starts after a gesture, positions follow the camera listener, narration ducks the field, Chapter XI recedes, and the ending leaves a quiet wind bed. Exported files total 1.61 MB; mono positional effects, serial decoding and bounded scheduling limit phone resource use. `production/sound/` preserves the original generations, prompts, model, receipts and preparation measurements. No external audio service or secret is used at runtime.

## Saved modules

| Module | Purpose |
| --- | --- |
| `web/elements/`, `web/assembly.js` | Original approved characters, Indian rath and four-horse assembly |
| `web/prayer-pose.js` | Reversible kneeling and joined-palms rig using original geometry |
| `web/rath-motion.js` | Reversible horse gait, wheel rotation, carriage travel and harness refresh |
| `web/world.js` | Integrated choreography, light, pause and rendering lifecycle |
| `web/experience/exploration.js` | Orbit, pan, pinch and keyboard controls |
| `web/experience/camera-flow.js`, `camera-rig.js` | Velocity-preserving rendered camera and fixed reading-area projection |
| `web/experience/ending.js`, `ending-copy.js`, `ending.css` | Closing timeline, five-language end screen, mobile and menu corrections |
| `web/experience/opening-credits.js`, `opening-credits.css` | Live split cameras, five-stage film clock, full-screen responsive credits |
| `web/narrative/reading-clock.js`, `flow-copy.js` | Optional auto reading and opening captions in five languages |
| `web/experience/daylight.js` | Story lighting palettes and teaching-pose selection |
| `web/surroundings.js`, `web/battle/` | Earth, dense armies, foreground combat, cavalry, elephants and nature |
| `web/vision/`, `web/cosmos.js` | Approved universal form and cosmic surroundings |
| `web/narrative/` | Full story, five-language copy, journey, Sanskrit and recorded-audio player |
| `web/sound.js` | Recorded battlefield mixer and audio lifecycle |
| `production/narration/` | 965 delivered recordings, cast IDs, masters, timing, validation and archived scripts |
| `web/experience/preparation.js`, `podcast.js`, `podcast.css` | Entry loading gate, bounded audio preloading and podcast controls |

Approved source hashes remain locked in `scripts/approved-assets.json` and `scripts/approved-vishvarupa.json`. Runtime adapters add motion without changing those originals. The independently authored adapter notes are preserved under `scripts/experience/`.

## Population and performance

| Quality | Fighting pairs | Detailed reserve troops | Cavalry | Elephants | Trees | Distant represented soldiers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| High | 72 | 1,440 | 32 | 8 | 68 | 1,909,376 |
| Touch | 52 | 1,000 | 24 | 6 | 46 | 1,446,816 |

Distant soldiers use silhouettes and formation strips rather than millions of independent simulations. Touch devices use smaller surroundings and a pixel-ratio cap of 1. Hero actors update at 30 Hz. Near shadows update on every travelling pose and roughly five times per second when parked. Actual device frame rates have not been measured; the approved detailed hero models are still substantial GPU work.

## Verification

- `node scripts/check-sequence.mjs`: approved hashes, all module syntax/imports, original sequence, geometry, shaders, harness and projection.
- `node scripts/check-journey.mjs`: all 194 passages and legacy links, navigation, audio lifecycle and UI references.
- `node scripts/check-locales.mjs`: full translated content, structure and protected source fields.
- `node scripts/check-battlefield.mjs`: both quality tiers, motion/pause, restoration, disposal and numeric framing.
- `node scripts/check-experience.mjs`: intro/context languages, source-verse coverage, desktop/phone reading frustum, orbit/pinch/pan/cancellation, actual assembly travel and face-to-face kneeling.
- `node scripts/check-ending.mjs`: explicit completion, recorded-audio events, pause/restart, end actions, bounded camera movement and helper-copy removal.
- `node scripts/check-opening-credits.mjs`: film pause/completion, split viewport coverage, opposing soldier projections, full-frame camera handoff and source asset preservation.
- `node scripts/check-flow.mjs`: rapid camera retargeting, camera speed, fixed reading-area projection, auto-reading pause/completion, all opening translations, transparent shadow corners and shared verse controls.
- `node scripts/check-prayer-pose.mjs`: original hand recovery, palm gap, deck contact and reversible geometry binding.

These are source and numerical checks. This revision has not had a browser visual review, device testing or audio audition. The translation drafts have not had independent native-editor review. Hindi Krishna audition 2 is approved and the complete narration is installed; full native-language and device listening review remains unperformed. See `production/narration/README.md`. Nothing substitutes browser speech for missing recordings.

Three.js is vendored under `web/vendor/`, with its MIT license. Source links for the narrative frame include Bhagavad Gita 1.1, 1.21–22 and 18.75. The Gateless Gate reference informs the restrained presentation; no art or sound was copied from it.

## UX changes and references

The near soldiers’ rectangular shadows came from reading a white RGB channel as an alpha mask. Their material now reads the texture’s actual alpha channel, with transparent corners and soft contact edges. No new screenshot was present in the latest upload directory; this defect was verified in the source and texture data.

The interface uses [NN/g’s progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/): reading and playback are primary; the connected source text is available through one clearly labelled control. [W3C’s interaction-animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) informs the retained gentle-camera preference and explicit pause controls. Research informs the choices; numerical checks do not establish visual usability on real devices.

## V7 validation

`check-cinematic.mjs` exercises the exact camera rig used by the world across four viewport shapes: repeated Next clicks, first-half-second travel, rendered rotation bounds, fixed-camera behavior and resume, stable saved passage migration, introductory copy, and the absence of unsupported audio assets. `check-flow.mjs` verifies the current bottom dialogue/study framing, shared verse controls and transparent shadow corners. Journey, localization, protected geometry/cue and syntax checks also pass. Browser/device visual review and sound audition have not been performed.

## Generated battlefield audio verification

`node scripts/check-field-audio.mjs` checks actual file provenance/budgets plus the audio lifecycle with a simulated AudioContext: lazy startup, missing-file recovery, no synthesis, narration and ending attenuation, no overlapping copies, listener position, mute/background suspension and disposal. All eight delivered MP3s decoded with FFmpeg and were checked for non-silence, finite samples and peak headroom. Loop masters have a 160 ms overlap before export. These checks do not establish subjective sound quality or replace listening on phones/headphones.

## Final release

`npm run check:release` verifies 940 story clips, 25 opening clips, 15 character/language voice assignments, local asset references and the loader/player lifecycle. `production/narration/release-report.json` contains full audio-decode measurements. `python scripts/package-release.py /absolute/output/folder` packages the exact committed source and portable website without credentials. [Publishing and domain handoff](docs/Publish-Geeta.md).

## Hosted release delivery

The complete portable website is in `web/`. The Sites deployment uses `worker/asset-server.js` and platform object storage to deliver these exact files without one large media upload. `npm run build` prepares the small host artifact; authenticated, checksum-verified asset upload activates the new experience only when every file is present. See [publishing instructions](docs/Publish-Geeta.md).

### Vercel

Keep the Vercel project's Root Directory at the repository root. The checked-in `vercel.json` serves `web/` directly, including the scene, fonts and all narration recordings. It selects the Other framework preset and skips installation and compilation because these browser assets are already complete. No API keys or server runtime are required for playback.

`npm run build` remains the Cloudflare/Sites packaging command; its Worker output is not the Vercel website. Vercel's configuration overrides that command and publishes only `web/`, keeping production scripts and local credentials outside the deployed directory. See [Vercel's static-build guidance](https://vercel.com/docs/builds/configure-a-build#skip-build-step).
