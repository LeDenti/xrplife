# Le L1 immunitaire du ver E3 sur le registre XRPL (testnet)

Généré le 2026-11-04 22:27 UTC depuis `immun-etat.json`. Organisme [rNN3VFgj…](https://testnet.xrpl.org/accounts/rNN3VFgjVPxEKsMkBivEkd2oTGositzx55) ; pathogène PA14 [rphxbDQF…](https://testnet.xrpl.org/accounts/rphxbDQFDbY55PPnRUuu62da9PvynFehd8).

## L1 : le soi

- 20 cellules intestinales et 1 épiderme (hyp7), un compte chacune (noms WormAtlas).
- Membrane : `DepositAuth` sur chaque cellule intestinale ; soi = émetteurs pré-autorisés : le milieu (nourriture « FOOD ») et hyp7 (peptide NLP-29).
- Récepteurs de la sérotonine sur les neurones : 102 lignes pour 102 arêtes (Bentley 2016).
- Ancrage [39577325…](https://testnet.xrpl.org/transactions/39577325BFED815383E6EDF3F2A150779BF6F1331B8A4414B2249B81E843706D).

## L3 : l'attaque et la défense (mesuré)

| étape | résultat | ancrage |
|---|---|---|
| PA14 tente d'entrer sans autorisation | {"tecNO_PERMISSION":20} | |
| les cellules naïves pré-autorisent ce qui ressemble à la nourriture, PA14 colonise | {"tesSUCCESS":20} | [DF4D353A…](https://testnet.xrpl.org/transactions/DF4D353AEE903D6EC2B8A52C37568A3D7B909AAC2F0C706BA87D6E1590C63EB3) |
| défense innée : expulsion, désautorisation, fermeture | 20 cellules infectées, 20 expulsions, 20 lignes fermées, codes {"tesSUCCESS":60} | [4EA5EEED…](https://testnet.xrpl.org/transactions/4EA5EEED3A9468B3CF76FCBBD93D13E59D7A5BF8932E76D0B136C86B7A391CB0) |
| NLP-29 de l'épiderme vers l'intestin | épiderme → intestin : {"tesSUCCESS":20} | |
| ADF sécrète la sérotonine (messager vers le L1 nerveux) | ADF → 102/102 récepteurs | |

## Le comportement : même stimulus, avant et après l'infection

| état | stimulus | paiements | neurones modulés | activité → avant (AVB, PVC) | → recul (AVA, AVD, AVE, RIM) | index de fuite | durée |
|---|---|---|---|---|---|---|---|
| naif | AWCL+AWCR | 274 | 0 | 0.1188 | 0.3324 | **0.737** | 76 s |
| naif | AWBL+AWBR | 261 | 0 | 0.0418 | 0.2280 | **0.845** | 67 s |
| infecte | AWCL+AWCR | 274 | 39 | 0.0688 | 0.1784 | **0.722** | 69 s |
| infecte | AWBL+AWBR | 261 | 39 | 0.0417 | 0.2141 | **0.837** | 69 s |

Index de fuite = activité arrivée aux commandes de recul / (avant + recul). Prédiction (Zhang, Lu & Bargmann 2005) : la fuite augmente après l'infection, par la sérotonine d'ADF.

| stimulus | naïf | infecté | écart | prédiction tenue ? (seuil 0,01) |
|---|---|---|---|---|
| AWCL+AWCR | 0.737 | 0.722 | -0.0151 | NON : sens inverse |
| AWBL+AWBR | 0.845 | 0.837 | -0.0081 | NON : égal |

## La mémoire héritée : E5, fille de E3

E3 infectée a pondu E5 ; l'œuf porte le mémo `memory=avoid PA14 gen 1/4`. À sa naissance, E5 a relu ce mémo sur le registre (mémo de l'œuf lu sur le registre : « avoid PA14 gen 1/4 (Moore et al. 2019) »), posé ses récepteurs et sécrété la sérotonine d'ADF sans avoir jamais rencontré PA14 (ADF → 102/102 récepteurs (at birth, inherited avoidance)). Ancrage [CA71CE0A…](https://testnet.xrpl.org/transactions/CA71CE0AAA69730033600AB85E3257471A70D0E10C798D61CFEE39FDB701AE35).

| ver | état | stimulus | index de fuite |
|---|---|---|---|
| E3 | naif | AWCL+AWCR | 0.737 |
| E3 | naif | AWBL+AWBR | 0.845 |
| E3 | infecte | AWCL+AWCR | 0.722 |
| E3 | infecte | AWBL+AWBR | 0.837 |
| E5 | herite | AWCL+AWCR | 0.722 |
| E5 | herite | AWBL+AWBR | 0.837 |

E5 héritée reproduit exactement l'état de sa mère infectée (même carte, mêmes soldes, mêmes chiffres) : l'héritage est tenu par le registre ; la prédiction comportementale ne l'est pas davantage chez la fille que chez la mère.

## Journal

- 22:02:06 **mange** 52.5 XRP pour l'intestin et l'épiderme [7BF72BAE…](https://testnet.xrpl.org/transactions/7BF72BAEA0B6C93C3302FACB54C1DFCC37F8B0D453EABDF5BF79451B9D0EF567)
- 22:02:31 **cellules** 21/21 créées —
- 22:02:39 **pathogène** PA14 rphxbDQFDbY55PPnRUuu62da9PvynFehd8 dans le milieu [76258475…](https://testnet.xrpl.org/transactions/7625847531DEBB9A65FF8C9FF896580EC64C95C1B98581C9B15B7FE05DB31ED0)
- 22:03:03 **soi** membrane, pré-autorisation du milieu, lignes FOOD et NLP-29 : {"tesSUCCESS":100} —
- 22:03:09 **mange** 52.9 XRP pour les récepteurs 5HT [C447A746…](https://testnet.xrpl.org/transactions/C447A746FEFB4396687FCA4879A07969D8364472396F8DDAA5E1A37706D1C9B8)
- 22:04:33 **L1 immunitaire** ancré : 21 cellules, soi = milieu, 102 arêtes 5HT [39577325…](https://testnet.xrpl.org/transactions/39577325BFED815383E6EDF3F2A150779BF6F1331B8A4414B2249B81E843706D)
- 22:04:59 **nourriture** milieu → intestin : {"tesSUCCESS":20} —
- 22:06:23 **influx** naif depuis AWCL+AWCR : 274 paiements, 0 neurones modulés, avant 0.1188 / recul 0.3324 → index de fuite 0.737 —
- 22:07:38 **influx** naif depuis AWBL+AWBR : 261 paiements, 0 neurones modulés, avant 0.0418 / recul 0.2280 → index de fuite 0.845 —
- 22:07:53 **mimétisme** lignes FOOD vers PA14 : {"tesSUCCESS":20} —
- 22:08:22 **membrane** PA14 sans autorisation : {"tecNO_PERMISSION":20} —
- 22:08:36 **ingestion** pré-autorisation de PA14 : {"tesSUCCESS":20} —
- 22:09:07 **infection** PA14 dans l'intestin : {"tesSUCCESS":20} [DF4D353A…](https://testnet.xrpl.org/transactions/DF4D353AEE903D6EC2B8A52C37568A3D7B909AAC2F0C706BA87D6E1590C63EB3)
- 22:09:26 **défense innée** 20 cellules infectées, 20 expulsions, 20 lignes fermées, codes {"tesSUCCESS":60} —
- 22:09:50 **NLP-29** épiderme → intestin : {"tesSUCCESS":20} —
- 22:11:04 **sérotonine** ADF → 102/102 récepteurs —
- 22:11:10 **réponse** ancrée [4EA5EEED…](https://testnet.xrpl.org/transactions/4EA5EEED3A9468B3CF76FCBBD93D13E59D7A5BF8932E76D0B136C86B7A391CB0)
- 22:12:27 **influx** infecte depuis AWCL+AWCR : 274 paiements, 39 neurones modulés, avant 0.0688 / recul 0.1784 → index de fuite 0.722 —
- 22:13:43 **influx** infecte depuis AWBL+AWBR : 261 paiements, 39 neurones modulés, avant 0.0417 / recul 0.2141 → index de fuite 0.837 —
- 22:13:51 **fin** résultats ancrés [CFE5DDD8…](https://testnet.xrpl.org/transactions/CFE5DDD8446516BDFEDBF98C906D7961A04EE046F1B9B44F71C74A3865F8C860)

## Mesuré et inventé

**Mesuré** : la membrane (le registre refuse un dépôt non sollicité, code tecNO_PERMISSION), l'infection par pré-autorisation, l'expulsion et la fermeture, chaque paiement. **Inventé** : les 21 cellules comme comptes (anatomie WormAtlas, pas de connectome pour elles), le mimétisme du pathogène (même code de monnaie), la réponse innée comme règle d'agent, NLP-29 vers l'intestin, la sérotonine d'ADF comme seul messager, le gain uniforme et l'index de fuite. *C. elegans* n'a pas d'immunité adaptative : rien ici ne prétend en modéliser une.
