# La couche « sentiments » du ver E1 sur le registre XRPL (testnet)

Généré le 2026-11-04 09:37 UTC depuis `humeur-etat.json`. Organisme [rKwUB85U…](https://testnet.xrpl.org/accounts/rKwUB85UjesLhW89FZqHtxDvuCYMg2hF4f).

## Le connectome sans fil posé

| modulateur | arêtes (Bentley 2016, restreintes aux neurones de E1) | émetteurs | neurones récepteurs |
|---|---|---|---|
| 5HT | 102 | 2 (ADFL, ADFR) | 43 |
| PDF1 | 892 | 32 (ADAL, ADAR, ADEL, ADER, AFDL, AFDR, …) | 28 |

Trustlines de récepteurs vérifiées sur le registre : **994/994**, ancrage [C928BC26…](https://testnet.xrpl.org/transactions/C928BC2633EE619DD1B19777FB570AA3A0BB037741571AED2CC16B0FA226EA45).

## Les trois états

| état | registre | entrées excitatrices actives | inhibitrices actives | neurones modulés |
|---|---|---|---|---|
| base | 22058209 | 0 | 0 | 0 |
| repu | 22058284 | 48 | 54 | 39 |
| affame | 22058367 | 892 | 0 | 28 |

Gain d'un neurone = exp(0,5 × (part des entrées excitatrices actives − part des inhibitrices actives)), lu sur les soldes du registre.

## Le test : même stimulus, trois humeurs

| état | stimulus | sauts | paiements | neurones atteints | activité → marche avant (AVB, PVC) | → arrêt/recul/virage (AVA, AVD, AVE, RIM, RIV, SMD) | index d'errance | durée |
|---|---|---|---|---|---|---|---|---|
| base | AWCL+AWCR | 3 | 274 | 76 | 0.1188 | 0.4994 | **0.192** | 76 s |
| base | ALML+ALMR | 3 | 68 | 40 | 0.2361 | 0.2325 | **0.504** | 33 s |
| repu | AWCL+AWCR | 3 | 274 | 76 | 0.0688 | 0.2642 | **0.207** | 117 s |
| repu | ALML+ALMR | 3 | 68 | 40 | 0.2902 | 0.2871 | **0.503** | 32 s |
| affame | AWCL+AWCR | 3 | 274 | 76 | 0.1306 | 0.5006 | **0.207** | 75 s |
| affame | ALML+ALMR | 3 | 68 | 40 | 0.4190 | 0.4324 | **0.492** | 31 s |

Index d'errance = activité arrivée aux commandes de marche avant / (avant + arrêt). Prédiction Flavell 2013 : repu (sérotonine) < base < affamé (PDF-1).

| stimulus | base | repu (5HT) | affamé (PDF-1) | sens prédit tenu ? |
|---|---|---|---|---|
| AWCL+AWCR | 0.192 | 0.207 | 0.207 | NON : égal (écart 0.0002, sous le seuil de 0,01) |
| ALML+ALMR | 0.504 | 0.503 | 0.492 | NON : sens inverse (écart -0.010) |

## Lecture

La modulation change l'**activité totale** (sérotonine : ÷ 1,9 depuis AWC ; PDF-1 : × 1,8 depuis ALM) mais pas la **répartition** entre marche avant et arrêt : l'index d'errance bouge de moins de 0,015 dans les trois humeurs, et dans le sens inverse de la prédiction pour ALM. Dans ce modèle, un gain uniforme sur un neurone multiplie toutes ses sorties de la même façon ; la part qui atteint chaque commande ne dépend alors que de la carte, pas de l'humeur. Pour que la sérotonine fasse brouter, il faut qu'elle change **quelles** synapses transmettent, pas combien : un effet par récepteur et par synapse, ce que Bentley 2016 ne donne pas et que ce modèle n'a pas. Le registre pouvait avoir tort ici, et il a eu tort : c'est la première mesure du projet qui n'est pas vraie par construction.


## Journal

- 09:20:25 **nettoyage** essai 1 : 32 soldes rendus, 38 lignes fermées 
- 09:20:34 **mange** 0.0 XRP pour les récepteurs [CD2E7D02…](https://testnet.xrpl.org/transactions/CD2E7D02D2D81C63CE2B7E446104D68749B3ABE6493BC7CA8B37C3EDC886B149)
- 09:24:09 **récepteurs** 994/994 vérifiés sur le registre [C928BC26…](https://testnet.xrpl.org/transactions/C928BC2633EE619DD1B19777FB570AA3A0BB037741571AED2CC16B0FA226EA45)
- 09:24:10 **recapture** 5HT : 0/0 lignes vidées, refus {} 
- 09:24:11 **recapture** PDF1 : 0/0 lignes vidées, refus {} 
- 09:24:19 **gains** base : registre 22058209, 0 entrées excitatrices et 0 inhibitrices actives, 0 neurones modulés 
- 09:24:27 **humeur** base ancré [A98F2D58…](https://testnet.xrpl.org/transactions/A98F2D583274B4C784D8ED3F5F02F9D43C56BA05034B2A74676B0E7D9C376A97)
- 09:25:43 **influx** base depuis AWCL+AWCR : 274 paiements, 76 neurones, avant 0.1188 / arrêt 0.4994 → index d'errance 0.192 
- 09:26:16 **influx** base depuis ALML+ALMR : 68 paiements, 40 neurones, avant 0.2361 / arrêt 0.2325 → index d'errance 0.504 
- 09:26:17 **recapture** PDF1 : 0/0 lignes vidées, refus {} 
- 09:28:33 **sécrétion** 5HT : 102/102 paiements, refus {} 
- 09:28:42 **gains** repu : registre 22058284, 48 entrées excitatrices et 54 inhibitrices actives, 39 neurones modulés 
- 09:28:47 **humeur** repu ancré [ABA51676…](https://testnet.xrpl.org/transactions/ABA51676F243DC503AF8A4C2D3B8BF8B6CEB2E73928CF936E39655E7C76356D4)
- 09:30:44 **influx** repu depuis AWCL+AWCR : 274 paiements, 76 neurones, avant 0.0688 / arrêt 0.2642 → index d'errance 0.207 
- 09:31:16 **influx** repu depuis ALML+ALMR : 68 paiements, 40 neurones, avant 0.2902 / arrêt 0.2871 → index d'errance 0.503 
- 09:31:39 **recapture** 5HT : 86/86 lignes vidées, refus {} 
- 09:33:23 **sécrétion** PDF1 : 892/892 paiements, refus {} 
- 09:33:31 **gains** affame : registre 22058367, 892 entrées excitatrices et 0 inhibitrices actives, 28 neurones modulés 
- 09:33:36 **humeur** affame ancré [901BC623…](https://testnet.xrpl.org/transactions/901BC6237D864D52D8AB47F9F58150A3E9475AF7122FFE912A00FFF37CF0610A)
- 09:34:51 **influx** affame depuis AWCL+AWCR : 274 paiements, 76 neurones, avant 0.1306 / arrêt 0.5006 → index d'errance 0.207 
- 09:35:22 **influx** affame depuis ALML+ALMR : 68 paiements, 40 neurones, avant 0.4190 / arrêt 0.4324 → index d'errance 0.492 
- 09:35:30 **fin** résultats ancrés [38B90D7C…](https://testnet.xrpl.org/transactions/38B90D7C36495743E2ABF8874848AEDF4E2FDF71AC6BC7801B68867B0BCEF2B3)

## Ce que le registre a enseigné

Essai 1 (monnaies communes « 5HT » et « PDF1 », résultats dans `HUMEUR-essai1.md`) : les quatre neurones RME se sécrètent PDF-1 mutuellement ; avec une monnaie commune, les deux sens partagent le même objet RippleState et les deux sécrétions s'annulent (12 arêtes inactives sur 892, mesuré sur le registre). D'où une monnaie par émetteur et par modulateur (« PDF1.RMED »), comme une monnaie par neurone pour les synapses. Les 16 « doublons » de la sérotonine (même paire, deux récepteurs, par exemple mod-1 et ser-4 sur AIB) partagent une ligne, ce qui est fidèle : une concentration, deux récepteurs. Un émetteur ne peut pas poser NoRipple sur une ligne où il est débiteur (tecNO_PERMISSION) : c'est au récepteur de fermer sa ligne.


## Mesuré et inventé

**Mesuré** : la carte des émetteurs et récepteurs (Bentley 2016), les soldes et les paiements sur le registre, chaque transfert d'activité est une transaction publique. **Inventé** : la fonction de gain (exp(0,5 × (E − I))), la répartition de l'activité au prorata des poids, l'index d'errance comme lecture du comportement, la sécrétion « tout ou rien ». NSM, source principale de sérotonine chez l'animal, est pharyngé et absent de l'anneau nerveux de Witvliet : ADF tient ce rôle ici.
