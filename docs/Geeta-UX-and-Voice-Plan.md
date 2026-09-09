> Historical research and shortlist. The implemented player, approved Hindi Krishna voice, final cast and generated audio are documented in [the current narration README](../production/narration/README.md).

# Geeta — visual design and voice production

Research completed 9 September 2026. Three parallel agents covered visual design, Asian-language casting, and English/French casting plus API integration. This document records a proposed design and audition shortlist. The live interface has not been redesigned in this research pass; no audio was generated or auditioned.

The recommended next step is a representative mobile redesign covering one passage in Read, Listen, Shloka and the chapter index, alongside a short voice audition reel. For the present scripts, one month of ElevenLabs Creator should cover production and substantial retakes at the current standard API rates.

## Why the current interface still looks generic

The current CSS gives portrait phones a 30dvh opaque dialogue block and a separate 112px, two-row player, plus safe-area padding. Repeated borders and a second tab strip divide the screen into competing bands. Georgia is reused for dialogue, headings and menu titles; Arial handles controls. The last update changed the play button's outline but retained this composition.

The proposed visual direction is a continuous cinematic scene with a readable text layer and one compact control row. Richness comes from the approved Three.js environment, lighting, camera and characters. Interface styling should provide a clear hierarchy.

| Surface | Proposed design |
| --- | --- |
| Dialogue | Left-aligned 19–21px Source Sans 3 for English/French, generous line height, warm white text over a soft dark scrim. One quiet speaker name. Full current passage remains selectable and readable. |
| Titles | Source Serif 4 for the opening, ending and chapter identities. Use Noto Sans/Serif Devanagari, JP and SC for the matching scripts, loading only the current language's required font assets. |
| Buttons | One clearly weighted play/pause action; quiet, unboxed secondary actions. Target 48px touch areas even when the visible icons are smaller. Reserve brass for the active state. |
| Bottom controls | One 60–64px row plus safe area. Mode switch, transport and Shloka. At the narrowest widths, secondary transport controls move into the expanded player before text or touch targets shrink. |
| Menu | Remove the extra horizontal tab strip. Open a spacious, numbered chapter index with a single current-chapter marker. Language, sound and appearance live in separate menu destinations. |
| Progress | Remove persistent decorative rules and redundant counters. Show passage position in the index; reveal the real audio scrubber when the player expands. |
| Shloka | One sheet with Sanskrit, verse reference and meaning together. On desktop it becomes a side panel. It remains available during Listen and does not pause narration. |
| Transitions | Keep the dialogue position anchored; use a brief opacity transition, with continuous camera motion independent of text replacement. Respect reduced motion. |

Read shows the complete passage over the lower scene. Long passages and increased text sizes can expand into one accessible reading surface; never silently truncate or shrink them. Listen removes the paragraph and scrim, preserving the same control positions and immediate Shloka access. Opening the study sheet keeps narration running. Helper paragraphs and labels such as “Opening credits” stay absent.

The design takes specific principles from the references: [Astra](https://astra.directory/) pairs spatial exploration with a direct catalog; [Gateless Gate's creator documentation](https://github.com/KilledByAPixel/GatelessGate) describes moving text aside for read-aloud; [OpenAI's public UI system](https://github.com/openai/apps-sdk-ui) supplies a useful example of consistent type, spacing and control tokens. These are researched principles, not claims of a rendered comparison with the current ChatGPT application.

[Source Serif](https://github.com/adobe-fonts/source-serif), [Source Sans](https://github.com/adobe-fonts/source-sans), [Noto Devanagari](https://github.com/notofonts/devanagari) and [Noto CJK](https://github.com/notofonts/noto-cjk) provide the proposed type families. This is a deliberate type pairing; the fonts are not yet installed in Geeta.

The implementation should be judged at 320, 390 and 430px widths, short landscape, all five languages and enlarged text. Check actual scene-plus-scrim contrast, complete text reflow and keyboard focus. The 48px touch target is our ergonomic choice; WCAG's AA minimum is 24px subject to exceptions. [Target sizing](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). No browser or device visual verification was performed during this research.

## Voice shortlist

These names are verified catalogue candidates. Their assignment to a character is our creative judgment, based on published descriptions; it still requires listening to actual Geeta passages. Individual voice IDs and links were resolved from the official catalogue on 9 September 2026. The individual pages require ElevenLabs sign-in; no audio audition or generated Geeta sample has been performed. Confirm account availability and voice-specific rates before production.

| Language | Krishna: first audition | Arjun: first audition | Intended performance and official source |
| --- | --- | --- | --- |
| English | [Frederick Surrey](https://elevenlabs.io/app/voice-library?voiceId=j9jfwdrw7BRfcR43Qohk) | [Kaelen](https://elevenlabs.io/app/voice-library?voiceId=10NkTYmU7tSz3Kkl3Lex) | Calm, rounded British storytelling for Krishna; grounded warrior presence for Arjun. [Frederick](https://elevenlabs.io/app/voice-library?voiceId=j9jfwdrw7BRfcR43Qohk), [Kaelen's official replacement listing](https://help.elevenlabs.io/hc/en-us/articles/26942950589969-What-are-Default-voices). |
| Hindi | [Aakash](https://elevenlabs.io/app/voice-library?voiceId=ogSj7jM4rppgY9TgZMqW) | [Vikrant](https://elevenlabs.io/app/voice-library?voiceId=HyhAfYGa3UDZpjb4Ci4k) | Warm reassurance and composed authority versus an earthier, deeper warrior. [Official Hindi/Desi samples](https://elevenlabs.io/text-to-speech/desi). |
| Japanese | [Otani](https://elevenlabs.io/app/voice-library?voiceId=3JDquces8E8bkmvbh6Bc) | [Ishibashi](https://elevenlabs.io/app/voice-library?voiceId=Mv8AjrYZCBkdsmDHNwcB) | Dignified mentor versus a textured dramatic protagonist; anime influence through emotional contrast and timing. [Official Japanese samples](https://elevenlabs.io/text-to-speech/japanese). |
| Mandarin Chinese | [Adam Li](https://elevenlabs.io/app/voice-library?voiceId=hZTuv9Zqrq4yHYrEmF1r) | [Martin Li](https://elevenlabs.io/app/voice-library?voiceId=WuLq5z7nEcrhppO0ZQJw) | Steady, calm presence versus stronger, rougher intensity. [Official Mandarin samples](https://elevenlabs.io/text-to-speech/mandarin-chinese). |
| French | [Martin Dupont](https://elevenlabs.io/app/voice-library?voiceId=a5n9pJUnAhX4fn7lx3uo) | [Jean Petit](https://elevenlabs.io/app/voice-library?voiceId=4p5WXd3ZuWR9pPtRQuxC) | Mature warmth versus a younger, serious voice capable of doubt and resolve. [Official French samples](https://elevenlabs.io/text-to-speech/french), [Jean Petit](https://elevenlabs.io/app/voice-library?voiceId=4p5WXd3ZuWR9pPtRQuxC). |

Indian English would also suit the setting. The current English pair is a verifiable alternative, not a claim of Indian accents. The official [Indian-English selector](https://elevenlabs.io/text-to-speech/indian-accent) lists Ranbir as a cinematic candidate for Arjun. Aakash is worth testing in English for Krishna, but his verified Hindi listing does not prove the desired English delivery. Confirm the user's accent preference before locking the English cast.

Krishna's heavenly quality should come from serene certainty, compassion, clear articulation and space between thoughts. Keep ordinary speech intimate; introduce a larger spatial effect for Chapter 11 in the scene mix. Arjun needs uncertainty, sincere questioning and recovered strength. A permanently aggressive performance would lose this progression. Japanese direction should carry dramatic pauses and controlled emotional escalation.

The active story also contains seven short context passages per language. Budget a separate neutral narrator, also used for the five opening captions. This is the preserved internal Sanjaya speaker key, with no return to the removed court opening. Henry and Nicolas are English/French narrator candidates; the other narrator selections remain part of the audition. Fifteen role slots cover three voices in each language.

All translations are complete, structurally checked drafts. They still need fluent editorial and pronunciation review before full generation. Check Krishna, Arjun/Arjuna, Kurukshetra, Dharma and Vishvarupa in each language. Catalogue labels alone cannot establish native pronunciation or emotional range.

## Measured production scope and cost

The estimate reads the exact active script text and the five opening caption bodies in every language. It includes spaces and punctuation, excludes UI labels and retired passages, and checks the stored spoken-text hashes. The current adaptation has 188 active passages per language; the introduction adds five clips per language.

| Language | Active story characters | Introduction characters | Total |
| --- | ---: | ---: | ---: |
| English | 24,823 | 473 | 25,296 |
| Hindi | 23,876 | 431 | 24,307 |
| Japanese | 11,406 | 200 | 11,606 |
| Mandarin script | 8,013 | 144 | 8,157 |
| French | 28,870 | 515 | 29,385 |
| **All five** | **96,988** | **1,763** | **98,751** |

That is **940 story clips + 25 introductory clips = 965 deliverables**. Sanskrit recitation, source-panel meanings, soundtrack, sound design and human language review are separate scope. Opening audio still needs its own timing integration; the existing chapter importer covers story passage IDs.

As checked today, ElevenLabs advertises v3 and Multilingual v2 API usage at **$0.10 per 1,000 characters**. Creator is **$22/month**, with an eligible **$11 first month**, and advertises **220,000 API characters** for either model. Pro is $99/month and Scale $299/month. [API pricing](https://elevenlabs.io/pricing/api). Creator also offers 30 custom voice slots, enough for the proposed fifteen roles. [Plan features](https://elevenlabs.io/pricing).

| Scenario | Estimated submitted characters | Usage equivalent at the displayed rate |
| --- | ---: | ---: |
| One complete pass | 98,751 | $9.88 |
| 10,000 audition characters + 50% retakes | 158,127 | $15.81 |
| 10,000 audition characters + a complete second pass | 207,502 | $20.75 |

These are usage equivalents, not fees added to the subscription. With the full API allowance available and standard-rate voices, even the complete-second-pass scenario fits within Creator. **Recommended purchase: one month of Creator, $11 if eligible, otherwise $22, before tax.** Pro and Scale have no capacity advantage needed for this release. A second production month would incur the normal renewal charge if the subscription remains active.

The general Creative page displays a different credit allowance from API character capacity; they are not two pools to add together. Existing accounts may need the documented [switch to new pricing](https://elevenlabs.io/blog/weve-lowered-api-agents-pricing-and-introduced-pay-as-you-go). The API page also advertises a September 11 promotion; this estimate does not halve the displayed unit price again or assume additional eligibility.

Voice-specific multipliers can increase the bill. Select standard-rate entries and verify usage on the audition before the bulk run. [Voice Library rates](https://elevenlabs.io/docs/eleven-creative/voices/voice-library). PAYG top-ups can extend an allowance but do not expand the subscription's voice-slot limits. [PAYG documentation](https://elevenlabs.io/docs/overview/administration/pay-as-you-go).

## API and mobile playback workflow

Audition **Eleven v3** first because this story needs expressive character acting; compare its quiet teaching delivery with Multilingual v2. Both support our five languages. Freeze a consistent model and voice treatment after the samples rather than switching timbre casually across a chapter. [Model documentation](https://elevenlabs.io/docs/overview/models).

Generate short exchanges with `POST /v1/text-to-dialogue/with-timestamps`, then split the approved audio by returned speaker/segment timings into the existing passage IDs. This lets characters respond within one generated exchange. Retain the original take and check every split by listening. Independent passages can use the speech-with-timestamps endpoint. [Dialogue API](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert-with-timestamps), [speech timing API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps).

V3 does not support the documented request-stitching feature; Multilingual v2 does. Therefore do not promise that generating every tiny v3 clip separately with previous-request IDs will produce continuous acting. [Request stitching](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching).

Use a production script outside the public app, with the API key supplied securely through its environment. Track each approved clip's text hash, voice ID, model, settings and pronunciation version; reuse successful files and cap the generation budget. Deliver MP3 at 44.1 kHz/128 or 192 kbps; Creator supports the higher MP3 option. [Conversion API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

The website should serve finished MP3 files and preload the next passage in the selected language. Existing real-audio completion events remain responsible for story progression and the ending. Opening narration needs timing-driven integration so its visuals wait for each actual voice clip. Caption timing can come from the API alignment; camera transitions continue smoothly throughout. Duck battlefield ambience during dialogue and preserve separate narration/ambience controls.

With this architecture, a replay triggers no new generation request. Additional listening affects hosting traffic, not ElevenLabs synthesis spend.

## Decisions before auditions

The current estimate assumes narration of the adapted story and introduction, standard Mandarin for the Simplified Chinese script, standard-rate voices, and one production billing cycle. The remaining useful decisions are: the existing ElevenLabs plan, Indian versus other English accents, and whether to add a separately reviewed Sanskrit recitation track. No account access or payment was needed for this research.

The smallest useful next deliverable is a short reel testing each character's calm, conflicted and revelatory passages, reviewed in each language, alongside the four mobile interface states. Approve the performances before generating all 965 files.

Reproducible budget: run `node scripts/estimate-narration.mjs` from the project. The adjacent JSON snapshot records the checked date, source links, counts, assumptions and scenarios.
