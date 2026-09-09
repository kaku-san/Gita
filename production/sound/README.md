# Battlefield audio

Eight ElevenLabs Sound Effects generations now replace the procedural battlefield in the experience. These are generated effects for a dramatic adaptation, not field recordings or historical evidence. No voice generation happens in the browser.

| File | Role | Runtime duration |
| --- | --- | --- |
| field-wind.mp3 | Wide stereo wind, grass and banners; remains softly in the ending | 29.84s loop |
| army-murmur.mp3 | Distant army mass | 29.84s loop |
| combat-left.mp3 | Melee to the left | 12s event |
| combat-right.mp3 | Melee to the right | 12s event |
| horse-walk.mp3 | Nearby hooves, tack and chariot; follows travel intensity | 19.84s loop |
| horse-breath.mp3 | Occasional nearby horse | 5s event |
| conch.mp3 | Distant signal | 7s event |
| war-drum.mp3 | Occasional distant drum | 8s event |

## Provenance and regeneration

Generated on 9 September 2026 using `eleven_text_to_sound_v2`, `prompt_influence: 0.4`, output `mp3_44100_128`. The eight requests total 124 seconds and returned a combined `character-cost` of 1,364. This is the API's usage header, not a dollar estimate or subscription balance. Account-details access is unavailable with the supplied key; generation succeeded.

`originals/` contains unmodified MP3 outputs and JSON receipts with exact prompts, settings, SHA-256, timestamps and returned usage. `generation-briefs.json` is the production brief. `scripts/generate-field-audio.py FILENAME` generates one named brief using only the local root `.env`; it refuses to overwrite an existing output/receipt. Do not repeat paid requests to reproduce an existing asset.

API reference: [ElevenLabs Sound Effects](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert). Generated outputs remain subject to the account's applicable ElevenLabs terms; these receipts establish generation provenance, not a separate licence certification.

## Preparation and playback

Run `python scripts/prepare-field-audio.py` from the project root (Python, NumPy and FFmpeg required) to prepare existing masters without API calls. The preparation uses 32 kHz, stereo wind at 128 kbps and mono positional effects at 96 kbps. Loop boundaries receive a 160 ms overlap. RMS normalization has a -4 dBFS source peak ceiling. `preparation.json` records hashes, actual durations, encoded sizes and decoded signal measurements. Total runtime download is 1,610,856 bytes.

`battlefield.ready.json` and `dist/audio/battlefield.json` are the same active bank; files live in `dist/audio/field/`. MP3s are fetched only after sound is enabled. Decoding is serial to limit peak memory on phones. The scheduler limits active sources, prevents a clip overlapping itself, and spaces the two combat recordings at different times. Event intervals specify silence after completion.

The listener follows the scene camera. The wind remains a stereo bed while other layers occupy nearby, mid-field and distant positions. Narration reduces all buses; conch and drums fade out during speech and wait before playing again. Chapter XI quiets the field. The closing fades combat/travel/signals away while wind remains. Mute, visibility changes and stop suspend the context after a short fade. Disposal aborts loading and releases sources and decoded buffers. Unavailable individual clips are skipped; a wholly unavailable bank reports the existing sound error and permits a later retry. There is no synthetic fallback.

## Verification status

All eight MP3s decode; sample data is finite and non-silent, with encoded peaks below -4 dBFS. Generated and delivered files are separately hashed. Lifecycle, scheduling, file integrity and resource-budget checks run with `node scripts/check-field-audio.mjs`. No browser/device or subjective listening review has been performed. Listen for unnatural horses, intelligible battle cries, modern sounds and repeating seams before considering the final mix approved.
