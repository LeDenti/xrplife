# La couche « sentiments » du ver E1 sur le registre XRPL (testnet)

Généré le 2026-11-04 09:15 UTC depuis `humeur-etat.json`. Organisme [rKwUB85U…](https://testnet.xrpl.org/accounts/rKwUB85UjesLhW89FZqHtxDvuCYMg2hF4f).

## Le connectome sans fil posé

| modulateur | arêtes (Bentley 2016, restreintes aux neurones de E1) | émetteurs | neurones récepteurs |
|---|---|---|---|
| 5HT | 102 | 2 (ADFL, ADFR) | 43 |
| PDF1 | 892 | 32 (ADAL, ADAR, ADEL, ADER, AFDL, AFDR, …) | 28 |

Trustlines de récepteurs vérifiées sur le registre : **994/994**, ancrage [1F4233CF…](https://testnet.xrpl.org/transactions/1F4233CFE2168658E5AD5E73765C4A447E7A4EC87491A693189F7AA569917594).

## Les trois états

| état | registre | entrées excitatrices actives | inhibitrices actives | neurones modulés |
|---|---|---|---|---|
| base | 22057889 | 0 | 0 | 0 |
| repu | 22057946 | 48 | 54 | 39 |
| affame | 22058016 | 880 | 0 | 28 |

Gain d'un neurone = exp(0,5 × (part des entrées excitatrices actives − part des inhibitrices actives)), lu sur les soldes du registre.

## Le test : même stimulus, trois humeurs

| état | stimulus | sauts | paiements | neurones atteints | activité → marche avant (AVB, PVC) | → arrêt/recul/virage (AVA, AVD, AVE, RIM, RIV, SMD) | index d'errance | durée |
|---|---|---|---|---|---|---|---|---|
| base | AWCL+AWCR | 3 | 274 | 76 | 0.1188 | 0.4994 | **0.192** | 75 s |
| base | ALML+ALMR | 3 | 68 | 40 | 0.2361 | 0.2325 | **0.504** | 29 s |
| repu | AWCL+AWCR | 3 | 274 | 76 | 0.0688 | 0.2642 | **0.207** | 80 s |
| repu | ALML+ALMR | 3 | 68 | 40 | 0.2902 | 0.2871 | **0.503** | 31 s |
| affame | AWCL+AWCR | 3 | 274 | 76 | 0.1306 | 0.5006 | **0.207** | 69 s |
| affame | ALML+ALMR | 3 | 68 | 40 | 0.4190 | 0.4324 | **0.492** | 29 s |

Index d'errance = activité arrivée aux commandes de marche avant / (avant + arrêt). Prédiction Flavell 2013 : repu (sérotonine) < base < affamé (PDF-1).

| stimulus | base | repu (5HT) | affamé (PDF-1) | sens prédit tenu ? |
|---|---|---|---|---|
| AWCL+AWCR | 0.192 | 0.207 | 0.207 | oui (repu < affamé) |
| ALML+ALMR | 0.504 | 0.503 | 0.492 | NON (repu > affamé) |

## Journal

- 09:01:40 **mange** 239.8 XRP pour les récepteurs [9B8691C8…](https://testnet.xrpl.org/transactions/9B8691C8BB3738DC810A4344AE514B3C0F7E3FE9E91213844BB0AF6F6038440A)
- 09:05:19 **récepteurs** 994/994 vérifiés sur le registre [1F4233CF…](https://testnet.xrpl.org/transactions/1F4233CFE2168658E5AD5E73765C4A447E7A4EC87491A693189F7AA569917594)
- 09:05:34 **recapture** 5HT : 0/0 lignes vidées, refus {} 
- 09:05:35 **recapture** PDF1 : 0/0 lignes vidées, refus {} 
- 09:05:37 **gains** base : registre 22057889, 0 entrées excitatrices et 0 inhibitrices actives, 0 neurones modulés 
- 09:05:42 **humeur** base ancré [177FCAC9…](https://testnet.xrpl.org/transactions/177FCAC94A750296069357C04392787E219BC36E363EB59DD53F4F0A168E61DE)
- 09:06:58 **influx** base depuis AWCL+AWCR : 274 paiements, 76 neurones, avant 0.1188 / arrêt 0.4994 → index d'errance 0.192 
- 09:07:27 **influx** base depuis ALML+ALMR : 68 paiements, 40 neurones, avant 0.2361 / arrêt 0.2325 → index d'errance 0.504 
- 09:07:28 **recapture** PDF1 : 0/0 lignes vidées, refus {} 
- 09:08:46 **sécrétion** 5HT : 102/102 paiements, refus {} 
- 09:08:48 **gains** repu : registre 22057946, 48 entrées excitatrices et 54 inhibitrices actives, 39 neurones modulés 
- 09:08:55 **humeur** repu ancré [0FC6BCF5…](https://testnet.xrpl.org/transactions/0FC6BCF5B4DCE68DB857F7F9BC4E8433427791C37AE9F944D880E3082A913686)
- 09:10:16 **influx** repu depuis AWCL+AWCR : 274 paiements, 76 neurones, avant 0.0688 / arrêt 0.2642 → index d'errance 0.207 
- 09:10:47 **influx** repu depuis ALML+ALMR : 68 paiements, 40 neurones, avant 0.2902 / arrêt 0.2871 → index d'errance 0.503 
- 09:11:14 **recapture** 5HT : 86/86 lignes vidées, refus {} 
- 09:13:01 **sécrétion** PDF1 : 892/892 paiements, refus {} 
- 09:13:03 **gains** affame : registre 22058016, 880 entrées excitatrices et 0 inhibitrices actives, 28 neurones modulés 
- 09:13:08 **humeur** affame ancré [EA7EA654…](https://testnet.xrpl.org/transactions/EA7EA654971666D55CE8F6F2D5F95DDA42D4E52B34186DC401171E96A0B5484F)
- 09:14:17 **influx** affame depuis AWCL+AWCR : 274 paiements, 76 neurones, avant 0.1306 / arrêt 0.5006 → index d'errance 0.207 
- 09:14:46 **influx** affame depuis ALML+ALMR : 68 paiements, 40 neurones, avant 0.4190 / arrêt 0.4324 → index d'errance 0.492 
- 09:14:54 **fin** résultats ancrés [F409B8EE…](https://testnet.xrpl.org/transactions/F409B8EE566926AFF53650E820FB480624867A5089FBEA4592955A0353804C67)

## Mesuré et inventé

**Mesuré** : la carte des émetteurs et récepteurs (Bentley 2016), les soldes et les paiements sur le registre, chaque transfert d'activité est une transaction publique. **Inventé** : la fonction de gain (exp(0,5 × (E − I))), la répartition de l'activité au prorata des poids, l'index d'errance comme lecture du comportement, la sécrétion « tout ou rien ». NSM, source principale de sérotonine chez l'animal, est pharyngé et absent de l'anneau nerveux de Witvliet : ADF tient ce rôle ici.
