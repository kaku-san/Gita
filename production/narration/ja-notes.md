# Japanese narration notes

## Delivery

- Asset: `ja.json`; language: Japanese (`ja`). This is a complete translation of the supplied English adaptation, not a new translation of the Sanskrit verses.
- Narrate the translated `text` values for dialogue. Speaker values identify voice routing and should ordinarily not be read aloud. Other translated user-facing fields can be narrated if the product explicitly requests explanatory narration.
- `source` and `staging` remain English production metadata. `sanskrit` remains exactly as supplied. Do not send these fields, IDs, verse ranges, mood names, or bridge markers to the Japanese narration voice.
- Japanese punctuation supplies natural pauses. Keep a measured, conversational pace and dignified delivery; do not read punctuation aloud. No SSML, phoneme markup, delivery cues, or invented scriptural lines have been inserted into the JSON.
- Krishna uses 私 / お前 and calm direct instruction. This is a consistent literary register reflecting the teacher and friend relationship; avoid a contemptuous or aggressive delivery of お前. Arjun uses respectful, candid Japanese. Sanjaya uses clear narrative です・ます speech. Dhritarashtra speaks in a restrained royal register.
- Formal compounds that a speech engine may misread: 信愛 = しんあい; 帰依 = きえ; 恩寵 = おんちょう; 祭祀 = さいし; 解脱 = げだつ; 輪廻 = りんね; 渇望 = かつぼう; 功徳 = くどく; 法螺貝 = ほらがい; 惰性 = だせい; 棍棒 = こんぼう; 礼拝 = らいはい in this religious narration; 生 in expressions such as 身体をもつ生 = せい. Use these as pronunciation-dictionary guidance if the selected voice needs it; audio has not yet been generated or auditioned.

## Character and place pronunciation

Katakana below is the spelling used consistently in the script and the intended Japanese pronunciation. Long vowels must remain long. These are Japanese readings, not a claim of exact reconstructed Sanskrit pronunciation.

| Source name | Script spelling | Hiragana pronunciation / guidance |
|---|---|---|
| Krishna | クリシュナ | くりしゅな |
| Arjun | アルジュナ | あるじゅな; traditional full Japanese form retained for source “Arjun” |
| Sanjaya | サンジャヤ | さんじゃや |
| Dhritarashtra | ドリタラーシュトラ | どりたらーしゅとら |
| Bhishma | ビーシュマ | びーしゅま |
| Drona | ドローナ | どろーな |
| Pandu | パーンドゥ | ぱーんどぅ |
| Pandavas | パーンダヴァ | ぱーんだゔぁ; the brothers collectively |
| Kurukshetra | クルクシェートラ | くるくしぇーとら |
| Kurus | クル一族 | くるいちぞく |
| Himalayas | ヒマーラヤ | ひまーらや |
| Ganga | ガンガー | がんがー |
| Vedas | ヴェーダ | ゔぇーだ |
| peepal tree | インドボダイジュ | いんどぼだいじゅ |
| Gita | ギーター | ぎーたー |

## Philosophical terminology

| Source term | Japanese used / pronunciation | Meaning preserved |
|---|---|---|
| self / atman | 自己 / アートマン（じこ / あーとまん） | The enduring self in the teaching. Distinct from ego, which is 自我（じが）, and from ordinary changing thoughts. |
| Brahman | ブラフマン（ぶらふまん） | Ultimate reality. Never substitute ブラフマー. |
| Brahma | ブラフマー（ぶらふまー） | The creator deity, distinct from Brahman. No user-facing occurrence of “Brahma” appears in the supplied adaptation, so none was inserted. |
| dharma | ダルマ（だるま） | Sustaining order, right conduct, and situated responsibility. Ordinary contextual “duty” is translated as 務め or 責任, not made identical with every meaning of dharma. |
| svadharma | スヴァダルマ（すゔぁだるま） | One’s own duty in its context; not a simple modern career preference. |
| karma / karma yoga | カルマ / カルマ・ヨーガ | Action; disciplined action without possessive attachment to its fruits. |
| yoga | ヨーガ（よーが） | Spiritual discipline and its integration or steadiness, not merely bodily postures. |
| yajna | ヤジュニャ（やじゅにゃ） | Sacrifice or offering; 祭祀 / 捧げもの in explanatory Japanese. |
| lokasangraha | ローカサングラハ（ろーかさんぐらは） | Sustaining the world. |
| maya | マーヤー（まーやー） | Divine power of manifestation and obscuring appearances; not “everything is fake.” |
| adhyatma | アディヤートマ（あでぃやーとま） | Inner spiritual nature in chapter 8. |
| moksha | モークシャ（もーくしゃ） / 解脱（げだつ） | Liberation from spiritual bondage and repeated birth and death. |
| bhakti | バクティ（ばくてぃ） / 信愛（しんあい） | Loving devotion to the divine. |
| vibhuti | ヴィブーティ（ゔぃぶーてぃ） | Manifestation of divine splendour or power. |
| Vishvarupa | ヴィシュヴァルーパ（ゔぃしゅゔぁるーぱ） | The universal form; 宇宙を包含する姿 in explanatory Japanese. |
| kshetra | クシェートラ（くしぇーとら） / 場（ば） | The field, including body and changing experience. |
| kshetrajna | クシェートラジュニャ（くしぇーとらじゅにゃ） | Knower of the field. The relation to the divine remains open to the interpretive traditions noted in the source. |
| gunas | グナ（ぐな） | Interacting qualities of nature, not fixed personality types or medical diagnoses. |
| sattva / rajas / tamas | サットヴァ / ラジャス / タマス | Clarity; craving and restless activity; obscuration and inertia. Sattva’s binding aspect is retained. |
| Purushottama | プルショーッタマ（ぷるしょーったま） / 至高の人格 | The highest or supreme person; not a claim about a human personality’s moral superiority. |
| shastra | シャーストラ（しゃーすとら） | Authoritative teaching. |
| shraddha | シュラッダー（しゅらっだー） | Faith or deep orientation of trust, expressed in life. |
| tyaga | ティヤーガ（てぃやーが） | Relinquishment, distinguished from renunciation of desire-driven action. |
| varna | ヴァルナ（ゔぁるな） | The text’s historical social categories; the four varnas are not rewritten as a modern career system. |
| surrender / refuge | 帰依 / よりどころとする | Devotional entrusting and taking refuge. Neither military defeat nor an instruction to abandon ethical care. |
| Om, Tat, Sat | オーム、タット、サット | Separate the three terms with light pauses; preserve the long vowel in オーム and final consonant closure represented by ット. |

## Material source ambiguities and retained context

1. The opening’s family and ritual concerns are Arjun’s arguments. The Japanese retains the explicit note distinguishing them from Krishna’s teaching, including its reference to 1.40–44.
2. Dharma is deliberately not reduced to one modern category. The notes about the four social orders in 4.13, birth/gender/status in 9.32, and varna and duty in 18.41–48 remain explicit. References to context notes were translated; the adaptation’s external note content was not invented.
3. Chapter 6.2 says “like that flame,” relying on the accompanying visual. Japanese keeps あの炎. For audio-only presentation, provide the intended visual context or an explicitly authored transition; none has been added to this asset.
4. Chapter 8 uses karma in the specific sense of creative action bringing embodied beings into existence. Its cosmology, death, rebirth, and paths after death remain religious claims rather than attention-training metaphors.
5. The divine care in 9.22 is retained with the source’s qualification against material guarantees.
6. The Arjun bridge at scene 10.4, beat index 2 (“Can I see?”) remains marked `bridge: true`; all other bridge values retain the source. Do not label this bridge as an exact verse translation.
7. Chapter 11.3’s Time and instrument language is preserved within the stated epic context. “Become an instrument” is rendered その働きを担う者となれ, avoiding a dehumanizing mechanical reading while retaining agency within the larger divine action.
8. In 11.4 Arjun requests the crowned four-armed form and later says he sees the gentle human form. The supplied adaptation gives no separate narrated transition between these appearances. The Japanese retains this sequence without inventing a missing beat. The four-armed attributes remain explicit.
9. Chapters 13 and 15 preserve distinctions among nature, the individual self/knower, the imperishable, and Krishna. They do not settle differing theological traditions through wording or imagery. “精神” in 13.1 refers to spirit, while 心 is used for mind and 自我 for ego.
10. Chapter 14.4 retains Krishna’s statement that he is the foundation of the imperishable Brahman; it is not reversed or harmonized with a particular later school.
11. Chapter 18 retains both the invitation to reflect and choose (18.63) and the subsequent invitation to relinquish all dharmas and take refuge (18.66). The source’s interpretive caution about 18.66 remains present. Sin is translated 罪, not reduced to an ordinary mistake or stress.
12. The text remains an adaptation with contemporary examples, not a verse-for-verse translation or newly composed scripture. Sanskrit titles, references, source and staging metadata are unchanged.

## Validation

- Source: `/workspace/scratch/848384678770/translations/source-en.json`
- Source SHA-256: `39a6b8e1cdb8efb8821109e5e404d81b3e63a99778aefaf253300488b984c6b4`
- JSON parse: passed.
- Recursive types, object keys and their ordering, array lengths and ordering: match source.
- 18 chapters; 72 scenes; 4 prologue beats + 190 scene dialogue beats = 194 total beats.
- 748 localization-field leaves, comprising 680 translated nonempty leaves and 68 empty leaves preserved empty. This includes all speaker labels and every title, subtitle, text, simple, example, context, understand, and reflection field.
- 598 metadata leaves preserved verbatim, including version, chapter numbers, scene IDs, references/ranges, mood, Sanskrit, bridge, source, and staging values.
- 164 arrays and 1,346 total scalar leaves match the source shape.
- Zero nonempty user-facing fields left identical to English; zero nonempty localized fields without Japanese characters; zero Latin-script remnants in localized fields.
- Narration audio generation and listening QA are not part of this asset task.
