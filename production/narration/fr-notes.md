# Notes de narration — version française

## Périmètre et validation

`fr.json` contient une traduction intégrale de l’adaptation anglaise fournie. Il s’agit d’une adaptation narrative de la Bhagavad-Gita, et non d’une nouvelle traduction versifiée du sanskrit.

La validation récursive confirme :

- 18 chapitres, dans leur ordre d’origine ;
- 72 scènes, avec quatre scènes par chapitre ;
- 194 prises de parole, soit 4 dans le prologue et 190 dans les scènes ;
- 285 objets et 164 tableaux, avec les mêmes clés, types, longueurs et ordres que la source ;
- 486 chaînes de contenu non vides examinées : toutes traduites, sauf le titre sacré « Om, Tat, Sat », identique dans les deux langues ;
- 68 champs de contexte vides conservés tels quels ;
- 194 noms de locuteur conservés ou adaptés selon la correspondance ci-dessous ;
- valeurs de `version`, `n`, `id`, `ref`, `range`, `mood`, `bridge` et `sanskrit` intégralement préservées ;
- champs de production `source` et `staging` laissés en anglais, sans modification.

Le JSON est encodé en UTF-8 et analysable sans dépendance particulière. Il ne contient ni consigne vocale insérée dans les dialogues, ni balise SSML. Les références numériques et les informations de mise en scène ne sont pas destinées à être lues comme des répliques.

## Voix et registre

Le dialogue emploie le tutoiement entre Krishna et Arjuna. Les exemples et questions adressés au public emploient le vouvoiement. Conserver un ton accessible, digne et posé. Krishna est ferme sans être grandiloquent ; Arjuna peut exprimer la détresse, l’incertitude et la peur sans perdre sa capacité de réflexion. Sanjaya raconte sobrement. Dhritarashtra ouvre le récit par une question attentive.

Les ponctuations françaises marquent les pauses. Ne pas faire de chaque point-virgule une rupture dramatique. Dans les énumérations, préserver un débit fluide. Au chapitre 11, laisser l’émerveillement et la peur apparaître ensemble ; la description de la destruction n’appelle pas un ton triomphal.

## Noms et repères de prononciation

Ces repères sont des approximations pour une voix française, pas une transcription phonétique savante. Les syllabes séparées par des tirets servent à préparer la voix ; elles ne doivent pas être insérées dans le texte final. Un « n » explicitement prononcé ne doit pas devenir une voyelle nasale française. Les voyelles doublées indiquent une tenue légèrement plus longue, sans emphase artificielle.

| Graphie dans le JSON | Repère de lecture | Remarque |
| --- | --- | --- |
| Arjuna | ar-djou-na | Le nom anglais « Arjun » est rendu partout par « Arjuna », forme française usuelle. |
| Krishna | krich-na | Le groupe « sh » se rapproche du « ch » français. |
| Sanjaya | san-dja-ya | Faire entendre le n ; ne pas lire « san » comme le mot « sans ». |
| Dhritarashtra | dhri-ta-raach-tra | Groupe initial compact ; l’aspiration après d peut rester légère. |
| Bhishma | bhiich-ma | Le groupe initial bh garde un b avec une légère aspiration possible. |
| Drona | dro-na | Deux syllabes ; ne pas nasaliser la finale. |
| Pandu | paan-dou | Faire entendre le n. |
| Pandavas | paan-da-va | Nom du groupe ; le s final français reste muet. |
| Kurus | kou-rou | Nom du groupe ; le s final français reste muet. |
| Kurukshetra | kou-rouk-ché-tra | Éviter une lecture française de « ks » séparée de la syllabe suivante. |
| Gange | ganj | Nom français du fleuve ; « Ganga » dans la source. |
| Himalaya | i-ma-la-ya | Forme française habituelle. |

Correspondance des locuteurs : `Arjun` → `Arjuna` ; `Krishna` → `Krishna` ; `Sanjaya` → `Sanjaya` ; `Dhritarashtra` → `Dhritarashtra`. Les graphies des noms dans `staging` restent celles de la source anglaise, conformément au périmètre de production.

## Termes constants

| Terme | Choix français et sens préservé | Repère de lecture |
| --- | --- | --- |
| atman | Le Soi : principe spirituel qui demeure, distinct de la personnalité sociale ou du seul corps. | aat-mane, n final audible |
| Brahman | Réalité ultime ; graphie sans accent et sans substitution par Brahma. | brah-mane, n final audible |
| Brahma | Nom du dieu créateur, distinct de Brahman ; absent du récit fourni. | brah-maa |
| dharma | Ordre qui soutient la vie, conduite juste et responsabilité située ; le terme sanskrit reste visible là où la source l’emploie. | dhar-ma |
| dharmas | Pluriel préservé dans l’appel final de 18.66. | dhar-ma, s muet |
| karma | Action ; au chapitre 8, sens créateur expressément expliqué. | kar-ma |
| karma yoga | Discipline de l’action sans attachement possessif à ses fruits. | kar-ma yo-ga |
| yoga | Discipline spirituelle et unité ou stabilité recherchée ; ne se réduit pas aux postures. | yo-ga |
| yajna | Sacrifice ou offrande. | yag-nya, approximation praticable |
| lokasangraha | Le fait de soutenir le monde. | lo-ka-san-gra-ha, n audible |
| maya | Pouvoir d’apparence qui peut voiler la source ; pas l’affirmation sommaire que la vie serait fausse. | maa-ya |
| adhyatma | Nature spirituelle intérieure ; interrogation sur le Soi. | a-dhyaat-ma |
| moksha | Libération de l’asservissement spirituel et des naissances et morts répétées. | mok-cha |
| bhakti | Dévotion aimante envers le divin. | bhak-ti |
| vibhuti | Manifestation de la splendeur ou de la puissance divine. | vi-bhou-ti |
| Vishvarupa | Forme universelle. | vich-va-rou-pa |
| kshetra | Champ. | kché-tra |
| kshetrajna | Connaisseur du champ. | kché-tra-gnya, approximation praticable |
| gunas | Qualités de la nature, changeantes et interactives. | gou-na, s muet |
| sattva | Clarté et lumière, avec possibilité d’attachement au bonheur et à la connaissance. | sat-tva |
| rajas | Désir avide et activité agitée. | ra-djass ; ici le s appartient au terme |
| tamas | Obscurcissement, négligence et inertie. | ta-mass ; ici le s appartient au terme |
| Purushottama | La Personne suprême. | pou-rou-chot-ta-ma |
| shastra | Enseignement qui fait autorité. | chaas-tra |
| shraddha | Foi ou confiance profondément ancrée. | chrad-dha |
| tyaga | Détachement, au sens de lâcher prise sur les fruits de l’action. | tyaa-ga |
| varna / varnas | Terme historique maintenu pour les ordres sociaux du texte. | var-na, s pluriel muet |
| svadharma | Responsabilité ou devoir propre, à comprendre dans son contexte. | sva-dhar-ma |
| Om, Tat, Sat | Désignations sacrées conservées. | ôm, tat, sat ; m et t finaux audibles |

La majuscule de « Soi » indique le sens spirituel dans le texte français. « Esprit » traduit principalement le mental ou la faculté d’attention ; « conscience » désigne la conscience ou le fait d’être conscient. Dans la question initiale du chapitre 13, « principe spirituel » traduit « spirit » et le distingue du mental. « Compréhension », « intelligence » et « discernement » suivent la fonction exprimée dans chaque passage, sans les ramener systématiquement à une seule faculté.

« Détachement » ne signifie ni indifférence, ni travail négligé. « Abandon au divin » désigne le mouvement de confiance et de refuge de la conclusion ; il ne signifie pas renoncer à toute responsabilité. Les traductions « sacrifice », « offrande », « dévotion », « libération » et « renaissance » conservent le cadre religieux de la source.

## Ambiguïtés matérielles conservées ou explicitées

1. **Renoncement et tyaga, 18.1–12.** Le français dispose de mots qui se recouvrent en partie. Le dialogue distingue « renoncement » aux actions motivées par le désir et « détachement » à l’égard des fruits. La définition immédiate et la note sur tyaga sont essentielles ; ne pas remplacer ces deux formulations par un même mot lors de la narration.

2. **« Abandonne tous les dharmas », 18.66.** Le pluriel sanskrit est conservé. La note finale maintient l’existence d’interprétations différentes et exclut la réduction à une simple transgression des règles ou à l’abandon du soin d’autrui. Aucune interprétation confessionnelle unique n’a été ajoutée.

3. **Le Soi et le divin, chapitres 13 à 15.** La distinction entre le champ, son connaisseur, le Soi individuel, l’impérissable et Krishna est préservée. L’expression « une part de moi » conserve l’image de la source, sans décider si cette relation est littérale ou comment la comprendre métaphysiquement. La forme « Personne suprême » est théologique, et non une hiérarchie de valeur entre personnes humaines.

4. **Brahman et Brahma.** Seul Brahman apparaît dans les passages fournis. La finale n doit rester audible pour éviter une confusion avec Brahma, le dieu créateur. Aucun de ces termes n’a été remplacé par l’autre.

5. **Ordre social et contexte historique.** Les commentaires sur 1.40–44, 4.13, 9.32 et 18.41–48 sont traduits sans moderniser silencieusement leur cadre. Les renvois aux notes de contexte restent des renvois ; aucun contenu absent de la source n’a été inventé pour les compléter.

6. **Métaphores et affirmations religieuses.** Les exemples quotidiens restent des analogies. La renaissance, la révélation de la forme universelle, les chemins après la mort et la libération sont conservés comme affirmations religieuses du récit ; ils ne deviennent pas de simples métaphores psychologiques.

7. **La flamme, 6.2.** La réplique « comme cette flamme » dépend d’une image introduite par la mise en scène anglaise. Le texte a été conservé sans ajout. Pour une future version exclusivement audio, vérifier que le contexte sonore ou éditorial permet de comprendre ce démonstratif.

8. **Passage aux formes familières, 11.4.** Arjuna demande la forme à quatre bras, puis parle de la forme humaine. La transition est assurée par `staging` dans la source. Aucune nouvelle réplique n’a été inventée pour expliquer ce passage ; une version exclusivement audio devra tenir compte de cette dépendance visuelle.

9. **Adaptations de langue.** « Arjun » devient « Arjuna », « Ganga » devient « le Gange », et le « peepal tree » devient « le figuier des pagodes ». La remarque selon laquelle aucun mot anglais ne recouvre entièrement dharma est adaptée au lecteur français : aucun mot français ne le recouvre à lui seul.

Aucun rendu audio n’a été généré ni testé. Les repères ci-dessus servent à préparer une future narration ; une écoute des noms et des termes sanskrits restera nécessaire avec la voix effectivement choisie.
