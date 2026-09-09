# Hindi adaptation and narration notes

Source: `source-en.json`, version 2. Deliverable: `hi.json`.

The complete English adaptation has been translated into natural, dignified spoken Hindi in Devanagari. This remains an adaptation with explanations and modern examples, not a new translation of the Sanskrit verses. No dialogue has been shortened, merged, removed, or added. The existing Sanskrit chapter labels are unchanged.

## Narration register

- Krishna and Arjun use **तुम** with each other. This preserves the intimate teacher–friend relationship. Maintain warmth and dignity; do not switch between तू, तुम, and आप.
- Sanjaya's narration uses respectful plural forms for the characters. Reader-facing explanations and reflections use **आप**.
- Read each `text` value as its own beat, using the localized `speaker` value for voice selection. Speaker labels, IDs, verse references, mood keys, and production metadata are not spoken dialogue.
- Titles, subtitles, explanations, examples, context notes, and reflections are fully translated and can be narrated separately when needed. Do not automatically insert them into character dialogue.
- Punctuation provides sentence and clause pauses. Danda **।** is a sentence ending; commas suggest light pauses. No phonetic respellings, SSML, or voice-specific tags have been inserted into the JSON.
- Use natural Hindi consonant clusters and schwa deletion. The scholarly romanizations below identify sounds; they are not instructions to add a fully pronounced final “a” to every name.
- **ओम** is the spoken spelling used in translated prose. **ॐ** or Sanskrit chapter labels remain exactly as supplied wherever present in protected source values. Separate **ओम, तत्, सत्** gently without turning the narration into an added chant.

## Characters and places

| Source name | Exact Hindi spelling | Pronunciation guidance |
|---|---|---|
| Krishna | कृष्ण | Kṛṣṇa; **कृष्-ण**. Familiar Hindi pronunciation, short कृ and retroflex ण; no long “ee” or “aa” inserted. |
| Arjun | अर्जुन | Arjun; **अर्-जुन**. Short उ in जुन, not अर्जून. |
| Sanjaya | संजय | Sanjay; **सन्-जय**. Use the familiar Hindi name संजय; do not append “या”. |
| Dhritarashtra | धृतराष्ट्र | Dhṛtarāṣṭra; **धृ-त-राष्-ट्र**. Preserve the aspirated ध, long आ, and final ष्ट्र cluster. |
| Bhishma | भीष्म | Bhīṣma; **भीष्-म**. Long ई and aspirated भ. |
| Drona | द्रोण | Droṇa; **द्रो-ण**. Long ओ and retroflex ण; not द्रोन. |
| Pandu | पांडु | Pāṇḍu; **पां-डु**. Nasalized long आ, retroflex ड, short उ. |
| Pandavas | पांडव | Pāṇḍava; **पां-डव**. The standard Hindi form is used with plural agreement when required. |
| Kurus | कुरुवंशी | Kuruvaṃśī; **कु-रु-वं-शी**. The dialogue names the assembled Kuru lineage. |
| Kurukshetra | कुरुक्षेत्र | Kurukṣetra; **कु-रु-क्षेत्र**. Keep क्षेत्र together. |
| Ganga | गंगा | Gaṅgā; **गं-गा**. Long final आ. |
| Himalayas | हिमालय | Himālaya; **हि-मा-लय**. Long आ in मा. |

For production voice mapping, the exact four speaker values are **संजय**, **धृतराष्ट्र**, **अर्जुन**, and **कृष्ण**. Spoken references to Bhishma and Drona occur inside those voices; they do not create new speakers.

## Consistent philosophical terms

| English/source term | Hindi rendering | Meaning and narration note |
|---|---|---|
| Self / atman | आत्मा; आत्मन् when explicitly naming the term | The enduring self in the teaching. Do not confuse with अहंकार or a person's passing mood. आत्मा has a long initial and final आ. |
| Living individual self | जीवात्मा | Used in chapter 15 to retain the embodied individual's relationship to Krishna. |
| Brahman | ब्रह्म | Ultimate, imperishable reality. Pronounce the ह्म cluster; **do not change to ब्रह्मा**. |
| Brahma | ब्रह्मा | The creator deity would take a long final आ. The English adaptation does not name this deity in a user-facing field, so no new reference has been introduced. ब्रह्मांड is the separate word for universe. |
| Dharma | धर्म | Sustaining order, right conduct, and responsibility in context; not automatically a religious affiliation. |
| Svadharma | स्वधर्म | One's own situated duty. The inherited varna setting remains explicit. |
| Karma / karma yoga | कर्म / कर्मयोग | Action / its spiritual discipline, rather than fate alone. |
| Renunciation / relinquishment | संन्यास / त्याग | Chapter 18 preserves the explicit distinction between relinquishing desire-driven acts and attachment to their fruits. |
| Non-attachment | अनासक्ति; आसक्ति छोड़ना or उसकी पकड़ ढीली करना in spoken explanation | Release of grasping, not indifference or careless conduct. |
| Surrender / refuge | समर्पण / शरण or आश्रय | Devotional trust. Arjun's reflection, choice, and responsibility remain intact. |
| Bhakti / devotee | भक्ति / भक्त | Loving devotion and its expression in conduct. |
| Yajna / offering | यज्ञ / अर्पण; आहुति in explanation | Ritual sacrifice and the wider discipline of offering are both retained. For यज्ञ use the familiar Hindi pronunciation यग्य, not “यज-ना”. Keep the written word यज्ञ. |
| Lokasangraha | लोकसंग्रह | Sustaining or holding the world together, not merely public reputation. |
| Maya | माया | Divine power of appearance; not a statement that everyday life is simply fake. |
| Lower nature | अपरा प्रकृति | The material and mental constituents in 7.1, distinguished from the sustaining living principle. |
| Adhyatma | अध्यात्म | Inquiry into one's inner spiritual nature. |
| Moksha | मोक्ष | Liberation from spiritual bondage and repeated birth and death. |
| Vibhuti | विभूति | Expression of divine excellence, splendour, or power. Long ऊ. |
| Vishvarupa | विश्वरूप | Universal form; **विश्-व-रूप**, long ऊ. |
| Time | काल | Krishna's cosmic declaration in chapter 11. Preserve its gravity without adding menace. |
| Instrument | निमित्त | Arjun's role within the revelation; not an unrestricted warrant for a listener's actions. |
| Nature / spirit | प्रकृति / पुरुष | The distinction in chapter 13; पुरुष here denotes the conscious principle, not merely a male person. |
| Kshetra / kshetrajna | क्षेत्र / क्षेत्रज्ञ | Field / its knower. Use familiar Hindi **क्षे-त्र** and **क्षे-त्र-ग्य**, retaining the standard spellings. |
| Gunas | गुण | Interacting qualities of nature, not fixed personality or medical categories. |
| Sattva / rajas / tamas | सत्त्व / रजस् / तमस् | **सत्-त्व**, **र-जस्**, **त-मस्**. Preserve all three terms consistently. |
| Purushottama | पुरुषोत्तम | Supreme person; **पु-रु-षोत्-तम**. It is Krishna's theological designation, not a ranking of ordinary men. |
| Shastra | शास्त्र | Authoritative teaching, preserved as such. Long आ. |
| Shraddha | श्रद्धा | Deep faith or trust lived through action; **श्रद्-धा**, aspirated ध and long आ. |
| Om, Tat, Sat | ओम, तत्, सत् | Sacred designations of Brahman. Keep the three distinct, with no added interpretation in the voice performance. |

## Material ambiguities retained

1. **Brahman, individual self, and Krishna:** The source deliberately leaves differences among interpretive traditions open, especially in chapters 13–15. The Hindi does likewise. At 4.3, “belong to Brahman” is rendered **सब ब्रह्म के ही हैं**, avoiding a stronger added assertion of identity. At 14.4, Krishna's statement that he is Brahman's foundation remains unchanged in meaning.
2. **“Relinquish all dharmas” (18.66):** Rendered **सभी धर्मों का त्याग करके केवल मेरी शरण में आओ**. The translated chapter explanation retains the source's warning against reducing this to arbitrary rule-breaking or abandonment of care for others. Do not narrow धर्मों to modern religious denominations in narration or supporting UI.
3. **Social and ritual framework:** The source's context concerning 1.40–44, 4.13, 9.32, and 18.41–48 is retained, including distinctions between Arjun's arguments, Krishna's teaching, and contemporary examples. These references point to source context notes; this translation does not invent or expand those separate notes.
4. **Universal-form transition (11.4):** Arjun asks for the crowned four-armed form, then refers to Krishna's gentle human form, exactly as the supplied adaptation does. No intermediate beat has been invented to explain this compressed transition.
5. **“That flame” (6.2):** The demonstrative is retained as **उस लौ**. The beat depends on the source staging's visual teaching image. An audio-only assembly may need to account for that visual dependence, but this translation has not inserted additional narration.
6. **Paraphrase and bridge status:** These Hindi lines remain translations of the supplied adaptation, even when their wording resembles familiar Gita renderings. All `bridge` values are unchanged, including the explicit bridge in chapter 10. Do not label every spoken line a literal verse translation.
7. **Birth, death, and cosmology:** These remain spiritual and theological claims in the adaptation. Everyday examples remain analogies; they do not replace rebirth, liberation, or the postmortem paths with modern psychological claims.

## Validation

Completed against `source-en.json` after translation:

- Valid UTF-8 JSON; identical recursive key order and value types.
- **18 chapters**, **72 scenes**, **4 prologue beats + 190 dialogue beats = 194 total beats**.
- All **164 array lengths** and their ordering retained.
- All **609 protected field occurrences** unchanged: version, chapter numbers, IDs, refs, ranges, moods, bridge flags, Sanskrit labels, staging, and source metadata.
- Translated **90 titles**, **18 subtitles**, **194 beat texts**, **194 speaker labels**, **72 simple explanations**, **72 examples**, **18 chapter explanations**, and **18 reflections**.
- All **72 context fields** retained: the **4 nonempty context notes** translated and **68 empty context values** left empty.
- No nonempty user-facing field left identical to its English source; no Latin letters remain in user-facing fields.
- Production `staging` and `source` values remain exactly in English as supplied.

No speech synthesis has been run. The text is ready for later Hindi voice preparation and pronunciation review.
