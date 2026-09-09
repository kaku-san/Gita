# Geeta local fonts

Eight licensed font families, served from the site itself. No request to Google Fonts is needed at runtime.

Include `fonts/fonts.css` before the interface stylesheet. Use the exact family names below. Files are variable WOFF2 with real weights **400–600** and `font-display: swap`.

| Family | Font files total | Use |
| --- | ---: | --- |
| Source Sans 3 | 51.4 KB | English/French dialogue and controls |
| Source Serif 4 | 56.6 KB | English/French headings; optical size fixed at 32 |
| Noto Sans Devanagari | 78.2 KB | Hindi dialogue and controls |
| Noto Serif Devanagari | 80.8 KB | Hindi headings, Sanskrit, and the गीता wordmark |
| Noto Sans JP | 280.7 KB | Complete current Japanese dialogue/interface |
| Noto Serif JP | 193.2 KB | Japanese headings and interface |
| Noto Sans SC | 322.8 KB | Complete current Simplified Chinese dialogue/interface |
| Noto Serif SC | 196.5 KB | Simplified Chinese headings and interface |

Total font files across all languages: **1,260,148 bytes**, reduced from 3,225,468 bytes received from the font provider. Browsers only load a used family and the subsets matching visible characters. Do not preload all files or add all CJK families to a global fallback stack. Japanese and Chinese need their own locale-specific families because shared Unicode characters can have different regional letterforms.

Use system sans/serif as the final fallback. Use Noto Serif Devanagari explicitly for the Sanskrit verse and Hindi wordmark in every language. The Latin fonts include accents and punctuation, so French needs no extra family. Controls should stay at weight 400–600; heavier/lighter weights would be outside these files' range.

## Coverage and maintenance

`validation.json` records parsed WOFF2 character coverage. Every current Japanese and Chinese story/interface character is covered by its sans family; every current interface and story-heading character is covered by its serif family. All 64 Devanagari codepoints used anywhere in current site text are covered by both Devanagari families. FontTools parsed every resulting font successfully; Devanagari OpenType shaping tables were preserved.

CJK serif was deliberately subset for these selectors confirmed by the UI implementation: `#intro-title`, `#chapter-title`, `.chapter-name`, `.sheet-top h1`, `#source-title`, `#opening-name`, `#opening-title`, `#faceoff-types span`, `#credits-subtitle`, `#ending-reflection`, `#people-content h2`, and `#meaning-view h2`. Dialogue, opening paragraphs, and final spoken words use sans.

Rebuild/validate the subsets if translation or interface wording changes. An unfamiliar new character will use the final system font until the subset is rebuilt. No screenshots or browser/device visual checks were performed by this font asset task.

## Source and license

All families were fetched through the official Google Fonts CSS2 API on 2026-09-09, then processed with FontTools. `provenance.json` contains source text hash, exact source URLs, original requested character lists, output checksums and modifications. The accompanying OFL files are from each font's official Google Fonts source directory. Preserve them when copying or distributing these assets.

- [Source Sans](https://github.com/adobe-fonts/source-sans)
- [Source Serif](https://github.com/adobe-fonts/source-serif)
- [Noto CJK](https://github.com/notofonts/noto-cjk)
- [Google Fonts source repository](https://github.com/google/fonts)

Build scripts and original downloaded files are outside this shipping directory, beside it in the scratch task folder. Only this `fonts` directory needs to be copied into `dist/fonts`.

Validation also includes all localized strings from the new `experience/interface.js`, including Japanese 切り替え： and Chinese 切换到.
