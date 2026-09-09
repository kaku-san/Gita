# Geeta interface update · 9 September 2026

The live field now has a single compact transport row. A soft scrim replaces the opaque dialogue block and repeated horizontal rules. Dialogue uses real Source Sans 3, with Source Serif 4 for chapter identities and titles. Hindi, Japanese and Simplified Chinese use their own locally served Noto families; French shares the accented Latin fonts.

On portrait phones the transport occupies 64px plus the device safe area. Read/Listen and Shloka retain visible labels. Play and Next remain available, while Previous, passage count and recorded-audio seeking live in expanded controls. Expanded reading permits more passage text without a permanent panel. All four dock targets are at least 48px high; the row fits a 320px viewport.

The chapter index is a warm paper drawer. Sound/settings and Introduction are destinations below the chapter list, with a back control inside each destination. Original Sanskrit and scene meaning appear together in a single source surface, as a side panel on desktop and a bottom sheet on portrait phones. The selected verse can change independently; the meaning remains explicitly the current scene meaning. Opening the source does not pause recorded narration.

The existing live opening, continuous camera rig, character models, environment, endings, story passages and audio manifest remain intact. The narration manifest still has no generated recordings; the public casting links in Geeta-UX-and-Voice-Plan.md are audition candidates, not installed story audio.

## Validation

- Existing camera, opening and ending checks pass, including protected hashes for 89 approved assets.
- Framing checks include the new left-side source panel and larger portrait study sheet.
- An event integration smoke check ran the real app.js module against JSDOM with media, modal and RAF doubles: five languages, moved control handlers, mode switching, missing-audio recovery, source and meaning, verse navigation, chapter destinations, final completion and restart. The record is in scripts/interface-validation.json.
- Parsed WOFF2 glyph coverage includes all current text and the new localized interface labels. Font provenance, OFL licenses, checksums and coverage details ship with web/fonts.
- No browser rendering, real-device QA or voice audition was performed. Visual contrast and enlarged-text reflow still require device review.
