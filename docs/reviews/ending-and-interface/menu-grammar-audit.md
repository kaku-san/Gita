# Geeta menu and interface copy audit

Source-only review of the current `web/index.html`, `web/app.js`, `web/narrative/ui.js`, `web/narrative/experience-copy.js` and `web/narrative/flow-copy.js`. Runtime assignments in `localize()`, `renderPaced()` and `showOpening()` were resolved before judging labels. HTML fallback text that is replaced at runtime is not reported. No Site files were edited or published. The approved Three.js opening direction is preserved.

Seven prioritized findings follow. “Correction” identifies grammar, consistency, localization or accuracy problems; “clarity” and “optional” distinguish editorial recommendations. This is a limited multilingual interface check, not a native-speaker review or an audit of full story translations.

## 1. Correction — introduction counts use menu labels as count nouns

Location: `web/app.js:148`, `#intro-meta`, currently assembled as `18 ${x.contents} · 5 ${u.language}`. Add one complete localized metadata string instead of concatenating unrelated labels.

| Locale | Actual current wording | Exact replacement |
|---|---|---|
| English | 18 Chapters · 5 Language | 18 chapters · 5 languages |
| Hindi | 18 अध्याय · 5 भाषा | 18 अध्याय · 5 भाषाएँ |
| Japanese | 18 章一覧 · 5 言語 | 全18章 · 5言語 |
| Simplified Chinese | 18 章节目录 · 5 语言 | 18章 · 5种语言 |
| French | 18 Chapitres · 5 Langue | 18 chapitres · 5 langues |

Reason: English, Hindi and French need plural forms; Japanese and Chinese are currently counting a “chapter list/directory” label instead of chapters. These are high-confidence interface corrections.

## 2. Correction — English switches between Arjun and Arjuna

The introduction says “Arjun lowers his bow.” The menu descriptions, accessible scene description and English dialogue also use **Arjun**. Preserve that established English spelling and change the four opening fields below. Neither transliteration is inherently wrong; their unexplained alternation is the issue. Keep the internal `Arjun` identifiers and other languages unchanged.

| Source key in `web/narrative/flow-copy.js` | Actual current wording | Exact replacement |
|---|---|---|
| `en.opening[1].title` (line 12) | Arjuna | Arjun |
| `en.opening[1].name` (line 15) | Arjuna | Arjun |
| `en.opening[2].role` (line 23) | Beside Arjuna | Beside Arjun |
| `en.opening[4].text` (line 34) | Arjuna asks Krishna to bring their chariot between the two armies. Here, before the battle, their conversation begins. | Arjun asks Krishna to bring their chariot between the two armies. Here, before the battle, their conversation begins. |

## 3. Correction — source note overstates the relationship of a browsed verse to the scene

Location: `web/narrative/experience-copy.js:52`, `en.verseNote`; rendered at `web/app.js:110`. The selector at `app.js:112–115` exposes every verse in the current chapter.

Current: “Selected source shloka for this scene; the adapted dialogue draws on the verse range shown above.”

Replacement: “Browse any verse in this chapter. The adapted dialogue draws on the verse range shown above.”

Reason: after the reader selects a verse outside the scene’s range, the current sentence incorrectly continues to describe it as selected for that scene. The existing explanation that the meaning belongs to the adapted scene is useful and should remain.

## 4. Correction — audio error contains unnatural English

Location: `web/narrative/ui.js:1`, `en.error`; used by `renderAudio()` at `web/app.js:133` when audio status is `error`.

Current: “Audio could not load. Try play again.”

Replacement: “Audio could not load. Press Play to try again.”

Reason: “Try play again” is ungrammatical in this instruction. This is a live error-state string, even though narration is currently described as in preparation.

## 5. Correction — the opening’s accessible region name stays in English

Location: `web/index.html:37`, `#opening-film[aria-label]`. `showOpening()` localizes the visible `#opening-label` at `web/app.js:90`, but no current assignment updates this region’s accessible label.

Current in all five locales: “Opening credits”.

Exact replacements by active locale: English “Opening credits”; Hindi “प्रारंभिक परिचय”; Japanese “オープニング”; Simplified Chinese “片头”; French “Générique d’ouverture”. Assign `f.openingLabel` to the region’s `aria-label` to reuse those existing translations.

Reason: screen-reader users changing language still encounter an untranslated interface label. This requires no change to the opening itself.

## 6. Clarity — the reading button sounds like an audio control

Location: `web/narrative/flow-copy.js:46–48`, applied to the reading button and its active status by `web/app.js:60–63`.

| Source key | Actual current wording | Exact replacement |
|---|---|---|
| `en.playReading` | Play reading | Start automatic advance |
| `en.pauseReading` | Pause reading | Pause automatic advance |
| `en.autoReading` | Auto reading | Advancing automatically |

Reason: these controls advance written passages on a timer; they do not start narration. The current Play icon and “Play reading” label can imply speech. The existing explanatory hint already makes the behavior clear, but the button label should do so on its own. This is a recommended clarity change, not a grammatical necessity. Japanese already explicitly calls this automatic advance.

## 7. Optional — use a broader name for the settings tab

Location: `web/narrative/experience-copy.js:77`, `en.settings`; applied to `#menu-settings` at `web/app.js:145`.

Current: “Sound & movement”.

Replacement: “Settings”.

Reason: the tab also contains language, lighting, reading pace and dialogue visibility. The broader label makes these easier to find. The current phrase is grammatically correct; this is an information-design preference, not a required copy correction.

## Proposed ending labels

Use the existing English closing line “The conversation rests here.” with these concise actions:

| Label | Intended action |
|---|---|
| Revisit chapters | Open the chapter list. |
| Begin again | Start the journey from the beginning. |
| Stay on the field | Dismiss the ending screen and keep the final scene available. |

All three labels are grammatical and fit the current tone. Their actions should match these meanings; “Stay on the field” should preserve the current viewpoint and final position.
