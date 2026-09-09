# Review decisions

The proposal and audits below record the pre-implementation review. The implementation is now complete for version 9: closing flow, mobile corrections and interface cleanup. The latest user direction removes visible helper text across all five languages, superseding the earlier plan to rewrite those helper notes. Required adaptation/content disclaimers and essential controls/status remain. Parent review and source/numeric checks are complete; browser visual testing was not performed.

## Next implementation priorities

1. Build the closing sequence and end screen described in `ending-proposal.md`.
2. Correct complete localized introduction counts, consistent English Arjun naming, the source-selection note, the audio retry sentence, and the translated opening region label.
3. Prevent the study panel and expanded camera guide from colliding; restore camera controls when study closes.
4. Respect device safe insets in the full-screen menu header and side padding.
5. Make the reading progress line measure the same thing while playing and paused.
6. Prefer the broader Settings menu label. Treat alternate reading-button wording and play-button styling as editorial recommendations, not grammar errors or verified visual defects.

## Preserve the requested listening behavior

The user explicitly wants to check the shloka alongside Listen mode. The UX audit's suggestion to pause narration on opening study is therefore **not accepted**. Keep narration uninterrupted and preserve the default source-follow behavior. A potential interruption when manually browsing another verse is a narrower usability question for later review; do not silently change the required listening flow on the basis of this audit.

Narration is intentionally awaiting ElevenLabs production. The current missing-recording notice and Read recovery are working fallback behavior. Earlier availability labeling is a refinement, not a claim that the audio implementation failed.

## Validation limits

All findings came from source and interaction tracing. No browser or device visual checks were performed. Safe-area obstruction, exact text wrapping, gesture comfort, visual style, and the character's final rising/bow animation require visual review before claiming those qualities verified.


## Implementation follow-up

- Fixed the Listen-mode CSS specificity that could position wrapped field controls below a phone viewport.
- Reset stale exploration state when reopening the end screen from the field, retaining continuous rig motion.
- Removed the visible opening label, opening count, reading hints, gesture help, source helper notes, motion/auto-reading notes and operational disclaimer tails in all languages. Accessible control and region names remain localized.
- Retained four adaptation/content disclaimers and concise audio availability/error states.
- Corrected count grammar and English Arjun naming; renamed the settings tab consistently across locales.
- Made the reading progress line consistently track the current passage clock.
