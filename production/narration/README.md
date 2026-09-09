# Geeta — narration and voice cast

All five languages have 188 active story recordings and five opening recordings: **965 MP3s**, generated with ElevenLabs `eleven_v3`. Hindi Krishna uses **audition 2**, approved by the user. Each language has distinct Krishna, Arjun and context-narrator voices.

## Voices used

| Language | Character | Voice name | Permanent voice ID | Type |
| --- | --- | --- | --- | --- |
| en | Krishna | Frederick Surrey | `j9jfwdrw7BRfcR43Qohk` | library |
| en | Arjun | Kaelen | `10NkTYmU7tSz3Kkl3Lex` | library |
| en | Context narrator | Johnny Kid — Serious and Calm Narrator | `8JVbfL6oEdmuxKn5DK2C` | library |
| hi | Krishna | Geeta — Krishna — Hindi | `hRHid0k1FJN4S80Kbs5m` | designed |
| hi | Arjun | Vikrant | `HyhAfYGa3UDZpjb4Ci4k` | library |
| hi | Context narrator | Geeta — Context — hi | `JXjD3Apv5OBjfkhCa3tI` | designed |
| ja | Krishna | Otani | `3JDquces8E8bkmvbh6Bc` | library |
| ja | Arjun | Ishibashi | `Mv8AjrYZCBkdsmDHNwcB` | library |
| ja | Context narrator | Geeta — Context — ja | `w5WuszXzuKLYFrNBH2kY` | designed |
| zh-Hans | Krishna | Adam Li | `hZTuv9Zqrq4yHYrEmF1r` | library |
| zh-Hans | Arjun | Martin Li | `WuLq5z7nEcrhppO0ZQJw` | library |
| zh-Hans | Context narrator | Geeta — Context — zh-Hans | `H9aY8kOUrDpSQdCRVQo5` | designed |
| fr | Krishna | Martin Dupont | `a5n9pJUnAhX4fn7lx3uo` | library |
| fr | Arjun | Jean Petit | `4p5WXd3ZuWR9pPtRQuxC` | library |
| fr | Context narrator | Geeta — Context — fr | `ieDBPVAoZrvjyZ7n7z8y` | designed |

`cast.json` is the machine-readable cast. The custom Hindi Krishna voice was saved from preview `hRHid0k1FJN4S80Kbs5m`; the service returned the same string as its permanent voice ID. The three original Hindi auditions remain in `auditions/hi-krishna/`. Four native context narrators were designed for Hindi, Japanese, Mandarin and French; their prompts, previews and saved IDs are preserved under `auditions/*-context/`. English uses Johnny Kid from the official narrator catalogue.

The remaining character cast follows the documented catalogue shortlist: Frederick Surrey / Kaelen (English), Vikrant (Hindi Arjun), Otani / Ishibashi (Japanese), Adam Li / Martin Li (Mandarin), Martin Dupont / Jean Petit (French). Catalogue IDs were used directly and confirmed by successful generation. Hindi Krishna alone has explicit sample approval; other casting was completed under the user’s instruction to implement all languages. Full multilingual listening and independent native-editor review have not been performed.

## Delivered audio

| Language | Story clips | Opening clips | Minutes | Download MB |
| --- | ---: | ---: | ---: | ---: |
| en | 188 | 5 | 31.53 | 30.48 |
| hi | 188 | 5 | 36.6 | 35.34 |
| ja | 188 | 5 | 43.41 | 41.88 |
| zh-Hans | 188 | 5 | 40.5 | 39.09 |
| fr | 188 | 5 | 30.94 | 29.91 |

The narration requests contain 98,751 characters. Returned `character-cost` headers total 54,311; these are provider usage units, not a dollar bill or account balance. Voice-design auditions and battlefield effects are separate requests.

## Production method

- Endpoint: `POST /v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128`.
- Model: `eleven_v3`; language codes: `en`, `hi`, `ja`, `zh`, `fr`. App locale `zh-Hans` maps to API `zh`.
- Default dialogue stability is 0.5. Seed: `20260909`; text normalization: `auto`. No character names, IDs, headings, helper text or stage directions were added to the spoken text.
- Batches stay within one chapter and at or below 1,800 text characters. Returned `dialogue_input_index` maps segments back to exact passage IDs, including repeated speakers. Every input must have correctly attributed segments before clips are exported.
- Clips split at silence between returned voice segments; audio is encoded as mono 44.1 kHz/128 kbps MP3. Original generated masters and timing data remain in `takes/`.
- `release-script.json` is the exact active production text. The earlier 970-row scripts remain a preserved archive, including retired court/prologue IDs; they are not all active recordings. Sanskrit recitation and source-panel explanations are not part of the narrated abridged dialogue.

`scripts/generate-all-narration.py` resumes generated takes without paying again. `scripts/generate-narration.py --language hi --chapter 2` targets one chapter. Existing submitted/unknown attempts require outcome review before retrying; the scripts do not blindly repeat ambiguous paid calls. The reserved-language helper coordinated parallel production in this release. Completed receipts now identify successful requests.

Run `python scripts/assemble-narration.py` to verify every audio hash, script hash, voice assignment, duration and full MP3 decode before atomically installing `web/narrative/audio.json`. A missing clip blocks complete release assembly. `release-report.json` records measurements for all 965 files. Run `npm run check:release` for a read-only check of the installed release and player behavior.

## Playback and mobile entry

The intro offers Read or Listen and language selection. The first entry click opens a full-screen loader and keeps experience controls hidden/inert until the Three.js scene is compiled and rendered, selected-language fonts/text, first-chapter audio and opening clips are ready. Audio bytes are cached in a bounded compressed-file cache rather than decoding an entire book into memory. Later chapters preload as playback reaches them.

Listen has a chapter-wide scrubber, elapsed/total time, 15-second rewind/forward across passage and chapter boundaries, a visible 0.5×–2× speed selector, play/pause, passage controls and Shloka access. Speed is saved; passage/time bookmarks are saved periodically and on exit. Native media-session controls are supplied where the browser supports them. Actual mobile background playback behavior remains device/browser dependent and untested here.

Opening narration shares the cinematic clock, which extends to fit the recorded introduction. Buffering/paused narration holds the opening; manual Continue fades the visual phase forward, and Skip goes to the conversation. Actual final-story `ended` starts the existing 21-second closing. Missing, blocked or stale audio never counts as completion. Shloka & meaning stays available while narration plays.

## Credentials and evidence

The real `ELEVENLABS_API_KEY` is in the local root `.env`, owner-readable only and ignored by Git. `.env.example` is empty. No key is embedded in the website, source archives, recordings, logs or receipts. Playback needs no API key and makes no generation request.

Successful synthesis, segment mapping, full decode and source checks are verified. Hindi Krishna preview 2 was listened to and approved by the user. Full narration quality, native pronunciation and device listening remain unverified by the agent; generated alignment is not an independent transcript audit.

Official references: [Dialogue/timing API](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert-with-timestamps), [saved voice API](https://elevenlabs.io/docs/api-reference/text-to-voice/create), [Voice Library](https://elevenlabs.io/docs/eleven-creative/voices/voice-library). Publishing instructions and the domain shortlist are in [Publish Geeta](../../docs/Publish-Geeta.md).
