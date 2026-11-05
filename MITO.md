# Le réseau mitochondrial de E1 sur la chaîne 7302

Généré le 2026-11-05 01:39 UTC depuis `mito-etat.json`. Chaîne dédiée (réserve 0, actif natif = énergie), registre de départ 60 (F0ED5AFA1FD6EABD…). Graine : `xrplife-mito-2026-11-05` ; tout est dérivé d'elle (clés des mitochondries, ordre des mutations, fusions, fissions).

## Paramètres

| paramètre | valeur |
|---|---|
| mitochondries par neurone à la naissance | 6 |
| stock initial par mitochondrie | 50 unités (1 unité = 1000 drops) |
| besoin d'entretien par neurone et par palier | 4 unités |
| capacité d'une mitochondrie saine par palier | 2 unités (réserve : 6 × 2 = 12 pour 4) |
| fusions / fissions par palier | 8 / 8 |
| paliers | 0, 20, 40, 60, 70, 80, 90, 100 % |

## Mesure : part de mutées et neurones silencieux

| palier | mitochondries vivantes | mutées | part mutée | fusions | fissions | neurones actifs | silencieux | part silencieuse | durée | ancrage |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 % | 970 | 0 | 0 % | 6 | 8 | 161 | 0 | **0 %** | 375 s | 6A7DDF9A… |
| 20 % | 969 | 163 | 17 % | 8 | 7 | 161 | 0 | **0 %** | 444 s | 6962A4D4… |
| 40 % | 970 | 358 | 37 % | 7 | 8 | 161 | 0 | **0 %** | 418 s | 236DC54C… |
| 60 % | 972 | 617 | 63 % | 6 | 8 | 150 | 11 | **7 %** | 384 s | EAD0A7A1… |
| 70 % | 973 | 680 | 70 % | 7 | 8 | 111 | 50 | **31 %** | 369 s | 7B28CAAF… |
| 80 % | 977 | 811 | 83 % | 3 | 7 | 6 | 155 | **96 %** | 289 s | 1C15CC02… |
| 90 % | 977 | 850 | 87 % | 7 | 7 | 0 | 161 | **100 %** | 336 s | 549A08B9… |
| 100 % | 979 | 979 | 100 % | 6 | 8 | 0 | 161 | **100 %** | 305 s | 6C500B61… |

Seuil de panne lu : plus de la moitié des neurones silencieux à partir du palier 80 % (part mutée mesurée 83 %). Attendu par construction : un neurone tombe quand ses mitochondries saines ne couvrent plus le besoin, soit moins de 2 saines sur 6, donc au-delà de 67 % de mutées ; les fusions et fissions brouillent ce seuil neurone par neurone.

## Ce que ça prouve et ce que ça ne prouve pas

**Mesuré** : 161 neurones sans énergie propre, nourris par 1058 comptes mitochondriaux créés depuis une graine, des mutations, fusions et fissions comme transactions, et à chaque palier l'entretien payé ou non, lisible par n'importe qui sur la chaîne (mémos `xrplife/alive`). **Construit, pas découvert** : la capacité de réserve (12/4) fixe le seuil ; le registre le reproduit, il ne le prédit pas. Le seuil biologique (60 à 80 % d'hétéroplasmie) est ce qui a motivé le choix de la capacité, et la mesure vérifie que le mécanisme choisi produit bien un seuil, pas une pente. **Ce que le registre apporte** : la trace, la reproductibilité (même graine, même organe), l'hérédité possible (les mitochondries d'une mère seraient copiées dans l'œuf), et la panne comme vrai refus de paiement plutôt que comme variable.


Note du vérificateur : 6 mitochondries sont lues « saines » sur la chaîne alors que le fichier les dit mutées : elles ont absorbé une sœur mutée par fusion, et le modèle propage le génome muté à la fusion sans écrire de mémo sur le compte absorbant. Le registre ne garde que ce qu'on lui écrit ; c'est une règle de modèle, visible comme telle.

## Journal

- 23:07:06 **organisme** rKwUB85UjesLhW89FZqHtxDvuCYMg2hF4f sur la L2 4874F13A…
- 23:24:44 **naissance** 161 neurones, 966 mitochondries sur la L2 EB5914A5…
- 00:55:43 **palier** 0 % : 0/970 mitochondries mutées (0 %), 6 fusions, 8 fissions → 0/161 neurones silencieux 6A7DDF9A…
- 01:03:07 **palier** 20 % : 163/969 mitochondries mutées (17 %), 8 fusions, 7 fissions → 0/161 neurones silencieux 6962A4D4…
- 01:10:05 **palier** 40 % : 358/970 mitochondries mutées (37 %), 7 fusions, 8 fissions → 0/161 neurones silencieux 236DC54C…
- 01:16:30 **palier** 60 % : 617/972 mitochondries mutées (63 %), 6 fusions, 8 fissions → 11/161 neurones silencieux EAD0A7A1…
- 01:22:38 **palier** 70 % : 680/973 mitochondries mutées (70 %), 7 fusions, 8 fissions → 50/161 neurones silencieux 7B28CAAF…
- 01:27:27 **palier** 80 % : 811/977 mitochondries mutées (83 %), 3 fusions, 7 fissions → 155/161 neurones silencieux 1C15CC02…
- 01:33:04 **palier** 90 % : 850/977 mitochondries mutées (87 %), 7 fusions, 7 fissions → 161/161 neurones silencieux 549A08B9…
- 01:38:08 **palier** 100 % : 979/979 mitochondries mutées (100 %), 6 fusions, 8 fissions → 161/161 neurones silencieux 6C500B61…
- 01:38:24 **fin** résultats ancrés sur la L2 2635F514…