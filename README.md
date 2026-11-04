# XRPLife — un connectome complet sur le registre XRPL

*English summary.* The complete connectome of the nematode *C. elegans*
(302 neurons, Cook et al. 2019) materialised on the XRPL testnet on
3 November 2026: every neuron is an XRPL account issuing its own currency,
every directed synaptic pair is a trust line held by the postsynaptic neuron
(limit = synaptic weight), the dataset's SHA-256 is anchored in an `AccountSet`
memo, and a nerve impulse is a chain of payments. 302 accounts, 5,039 trust
lines, verified on-ledger. To our knowledge this is the first connectome whose
neurons and synapses are themselves ledger objects (NEMA had earlier hashed
simulation states of the worm onto Solana, which is a different thing). The
ledger holds the map, not the computation: one hop takes one ledger, ~3.5 s.


Premier pas de XRPLife : prendre un réseau neuronal **entièrement cartographié**
et le matérialiser sur une blockchain publique, étage par étage.

Le ver *Caenorhabditis elegans* est le seul animal dont le système nerveux
est connu synapse par synapse : 302 neurones, un peu plus de 7 000 connexions
(White et al. 1986, refait au microscope électronique par Cook et al. 2019).
Le jeu de données vient d'OpenWorm (`data/herm_full_edgelist.csv`, hermaphrodite,
connexions chimiques et électriques, pondérées).

## Correspondance

| Vivant | XRPL testnet |
|---|---|
| l'organisme | un compte maître, financé par le robinet, qui crée et finance chaque neurone |
| un neurone | un compte XRPL, qui émet sa propre monnaie (son nom, code sur 20 octets) |
| une synapse A→B | une trustline posée par **B** vers la monnaie de **A**, limite = poids (chimique + électrique), `NoRipple` |
| le jeu de données | son SHA-256 ancré dans un mémo d'`AccountSet` du compte maître |
| un influx | un paiement de A vers B dans la monnaie de A, montant = poids / 1 000 000 |

Seul le sous-graphe neurone → neurone est posé : muscles, hypoderme et intestin
restent hors périmètre. Les 5 084 paires orientées deviennent 5 039 trustlines : les 45 autapses (un
neurone connecté à lui-même) sont écartées, un compte XRPL ne pouvant pas
se faire confiance à lui-même ;
une paire qui a à la fois une synapse chimique et une jonction électrique n'a
qu'une trustline, dont le mémo garde le détail. CANL et CANR, sans synapse
connue, existent comme comptes isolés : 302 neurones.

Réserve XRPL : 1 XRP par compte + 0,2 par trustline portée, soit ~1 320 XRP
immobilisés sur le testnet pour le ver entier.

## Ce que le registre fait et ne fait pas

Le registre **porte la carte** : qui est relié à qui, avec quel poids, prouvé
et daté. Il **ne calcule pas** : faire tirer un neurone, c'est un agent hors
chaîne (`influx.mjs`) qui soumet un paiement par synapse sortante ; chaque
saut prend un registre, 3 à 4 secondes, là où la biologie prend une
milliseconde. C'est l'architecture en étages de XRPLife : L1 = la structure,
immuable ; L2 = l'agent, plastique ; L3 = l'activité, éphémère.

## Sur le registre (testnet, 3 novembre 2026)

| | |
|---|---|
| organisme | `rJZKSuxqJtGiub7dAc17XAgdcks5YcdQBW` |
| ancrage du jeu de données | tx `EC9933988CBE556CC866D9E11AB3CED0A5B6E0BABDF8ABFAFFAA38CF40420C93` |
| ALML (toucher antérieur) | `rMR59Gv34PVaqvptpysLPkpySD3mihMXcS` |
| AVAL (interneurone de commande, 107 entrées) | `rMTCnttuAusPqcFeC8kk8SrRAFZKJRP6N1` |
| vérification indépendante | 302/302 comptes, 5 039/5 039 trustlines conformes, 1 409 XRP immobilisés |
| influx `ALML`, 2 sauts | 317 paiements, 15 puis 135 neurones atteints, 341 s |

Toutes les adresses sont dans `etat.json` ; les journaux complets dans
`construire.log`, `verifier.log` et `influx.log`. Le testnet est remis à zéro
de temps en temps : le ver y est mortel, le code le recrée.

## Le cycle de vie (4 novembre 2026)

Quatre vers nés, nourris, grandis, accouplés, reproduits et morts sur le
testnet, en 4 heures de registre (01:43 → 05:41 UTC). Le détail, adresse par
adresse et transaction par transaction, est dans [CYCLE.md](CYCLE.md) ; la
vérification indépendante dans `verifier-vie.log`.

| Étape | Donnée réelle | Sur le registre |
|---|---|---|
| naissance | Witvliet et al. 2021, animal 1 (L1, 0 h) : 161 neurones, 747 synapses de l'anneau nerveux | la mère (le milieu pour les fondateurs) paie un compte « œuf » qui crée ses neurones |
| alimentation | la réserve XRPL : 1 XRP par compte, 0,2 par trustline | le ver mange des XRP du milieu ; sans réserve, le registre refuse la synapse |
| croissance | les 8 connectomes de Witvliet (L1 0 h → adulte 50 h), puis l'adulte complet de Cook 2019 | neurones nouveaux, synapses posées, renforcées ou élaguées ; chaque stade ancré par un `AccountSet` |
| accouplement | Cook 2019 contient le mâle : 377 neurones connectés, 5 620 synapses | le mâle émet un `Check`, l'hermaphrodite l'encaisse |
| ponte | le croisement double la ponte ; sans mâle, autofécondation | V1 fécondée pond deux œufs, V2 et V3 un chacun ; sexe des croisés tiré au sort (E2 est un mâle) |
| mort | 18 à 20 jours à 20 °C | synapses remises à zéro, 301 à 380 `AccountDelete` par ver vers le milieu, 0,2 XRP brûlés chacun |

**Bilan** : 9 000 XRP tirés du robinet (le « soleil » du testnet), 6 751 XRP
mangés par les quatre fondateurs, 6 492 XRP rendus au milieu par leur mort,
257 XRP brûlés par les suppressions, 7 158 XRP dans le milieu à la fin, quatre
enfants vivants au stade L1 avec 747 synapses chacun. Le registre est un
système fermé qui fuit : sans robinet, chaque génération coûterait 257 XRP de
plus qu'elle ne rend.

**Ce qui est mesuré** : les connectomes de chaque stade et des deux sexes, la
réserve comme nourriture, les codes de refus du registre. **Ce qui est
inventé** : l'horloge (un registre = une heure de vie ; les âges dans les
mémos sont gonflés par les relances, V1 est « morte à 3 257 h »), un à deux
descendants par mère au lieu de 300, aucune variation génétique, les larves
mâles qui suivent des stades mesurés sur des hermaphrodites, et la jonction
entre l'anneau nerveux de Witvliet et le corps entier de Cook, qui sont des
animaux différents (le passage d'un stade adulte de Witvliet à l'autre change
déjà un tiers des synapses : c'est la variabilité entre individus).

**Ce que le registre a enseigné en route** : il refuse l'autapse (un compte ne
se fait pas confiance à lui-même) ; deux synapses réciproques dans une même
monnaie partageraient un objet et s'annuleraient, d'où une monnaie par
neurone ; pendant une mue le neurone porte ses anciennes et ses nouvelles
synapses, la réserve se calcule sur l'union ; un compte ne peut mourir que 256
registres après sa naissance ; le websocket public coupe un client « trop
lent », il faut borner les requêtes en vol.

```
./superviser.sh                 # ETAT=vie : le cycle complet, relançable, sous superviseur
MINI=8 ETAT=mini node vie.mjs   # répétition à 8 neurones par ver
node verifier-vie.mjs           # relit le registre : vivants, morts, transactions clés
node rapport.mjs                # écrit CYCLE.md
```

## Lancer

```
npm install
node connectome.mjs            # lit le jeu de données, compte, hache
node construire.mjs            # organisme → neurones → synapses → ancrage (relançable)
node verifier.mjs              # relit le registre et compare au connectome
node influx.mjs ALML 2         # un toucher antérieur : ALML, 2 sauts
```

`etat.json` garde les adresses et hachages (public) ; `.cles.json` les graines
testnet (0600, hors git).

## La couche « sentiments » (4 novembre 2026)

Le connectome filaire ne contient pas les états internes du ver (faim, satiété, errance,
broutage) : ils passent par des molécules diffuses, sérotonine et neuropeptides, qui changent
le **gain** de milliers de synapses à la fois. C'est le connectome « sans fil » de Bentley et
al. 2016, posé ici sur l'enfant vivant E1 comme un deuxième étage (L2) au-dessus du filaire (L1) :

| Vivant | XRPL testnet |
|---|---|
| un neurone qui sécrète la sérotonine (ADF) ou PDF-1 | le compte du neurone émet une monnaie « 5HT » ou « PDF1 » |
| un récepteur (mod-1, ser-4 inhibiteurs ; ser-1, ser-5, pdfr-1 excitateurs) | une trustline du neurone récepteur vers cette monnaie, nom du récepteur en mémo |
| la concentration | le solde |
| la sécrétion | un paiement de l'émetteur à chaque récepteur |
| la recapture | le récepteur rend son solde à l'émetteur |
| le gain d'un neurone | exp(0,5 × (part des entrées excitatrices actives − part des inhibitrices)), **lu sur les soldes** |
| l'activité | l'agent d'influx (L3) répartit activité × gain sur les synapses chimiques, un paiement par transfert |

Le test, d'après Flavell et al. 2013 (la sérotonine fait brouter, PDF fait errer) : même
stimulus dans trois humeurs, **base** (rien), **repu** (5HT sécrétée), **affamé** (5HT
recapturée, PDF-1 sécrété), et part de l'activité qui atteint les commandes de marche avant
(AVB, PVC) contre celles d'arrêt, recul et virage (AVA, AVD, AVE, RIM, RIV, SMD) : l'index
d'errance. Prédiction : repu < base < affamé.

**Résultat (essai 2, 4 novembre 09:20-09:35 UTC, [HUMEUR.md](HUMEUR.md), vérifié dans
`verifier-humeur.log`)** : 994/994 récepteurs posés ; la sérotonine divise l'activité totale par
1,9 et PDF-1 la multiplie par 1,8, mais l'index d'errance ne bouge pas (AWC : 0,192 / 0,207 /
0,207 ; ALM : 0,504 / 0,503 / 0,492). **La prédiction n'est pas tenue.** Un gain uniforme sur un
neurone multiplie toutes ses sorties pareil : la part qui atteint chaque commande ne dépend que de
la carte. Pour que la sérotonine fasse brouter, il faut un effet par récepteur et par synapse, que
ni Bentley 2016 ni ce modèle ne donnent. C'est la première mesure du projet qui n'est pas vraie
par construction, et elle est négative. L'essai 1 ([HUMEUR-essai1.md](HUMEUR-essai1.md)) avait une
monnaie commune par modulateur : les quatre RME, qui se sécrètent PDF-1 mutuellement, s'annulaient
sur un objet partagé (12 arêtes sur 892) ; d'où une monnaie par émetteur, « PDF1.RMED », comme
une monnaie par neurone pour les synapses.

```
node humeur.mjs poser            # 994 trustlines de récepteurs sur E1, nourries par le milieu
node humeur.mjs etat repu        # base | repu | affame : sécrétion, recapture, gains lus sur le registre
node humeur.mjs influx AWCL+AWCR repu
node humeur.mjs tout             # les trois états × deux stimulus, résultats ancrés
node rapport-humeur.mjs          # écrit HUMEUR.md
node verifier-humeur.mjs         # relit le registre : ancrages, récepteurs, échantillon d'influx
```

## La chaîne L2 sérotonine (4 novembre 2026, banc d'essai)

Un réseau rippled dédié, même logiciel que XRPL, réseau `7302`, **réserve 0**, où les
neurones gardent leurs clés et leurs adresses, et où la sérotonine d'un ver peut être reçue
par un autre. Pas de jeton à vendre : l'actif natif paie les frais (« ATP »), la sérotonine
reste une monnaie émise par le neurone. Validateur + suiveur dans Docker, genèse avec 47
amendements, genèse neutralisée vers un trésor, 200 paiements en rafale validés 200/200, et
l'empreinte du registre 43 ancrée sur le testnet par l'organisme E1 (tx `0E494466…`) :
c'est le sommeil, le règlement périodique L2 → L1. Kit, procédure mesurée et pièges dans
[l2/PROCEDURE.md](l2/PROCEDURE.md) ; page d'invitation des validateurs dans
[l2/INVITATION.md](l2/INVITATION.md). Un validateur seul ne ferme pas de registre ; le
premier serveur réel demande 2 cœurs et 4 Go.

```
./l2/lancer.sh genese && node l2-genese.mjs   # une fois
./l2/lancer.sh demarrer | etat | arreter
node ancrer-l2.mjs                            # empreinte du dernier registre L2 → testnet
```

## Papier et citation

Trois textes en anglais dans `paper/` (source HTML à côté de chaque PDF) :

1. [xrplife.pdf](paper/xrplife.pdf) — *A complete connectome as ledger objects* : le ver, le cycle de vie (6 pages).
2. [xrplife-2-neuromodulation.pdf](paper/xrplife-2-neuromodulation.pdf) — *Neuromodulation as ledger balances* : la couche sentiments et son résultat négatif (5 pages).
3. [xrplife-3-l2.pdf](paper/xrplife-3-l2.pdf) — *A dedicated ledger for neuromodulation* : note technique sur la chaîne L2, sept pièges mesurés (4 pages).

Pour citer le logiciel : `CITATION.cff`
(GitHub affiche « Cite this repository »). Les données se citent par leurs auteurs,
voir [data/README.md](data/README.md).

## Suite

Le ver est lent parce que chaque saut demande un accord entre validateurs,
pas faute de calcul. La version rapide est un étage au-dessus : un canal de
paiement XRPL par synapse, l'influx devient une signature hors chaîne, le
registre ne sert qu'au règlement périodique. Voir le fil d'idées dans le
projet [dareskro](https://github.com/LeDenti/dareskro) du même auteur.

Licence MIT. Données : OpenWorm (MIT) d'après Cook et al. 2019 (adultes, les deux sexes), Witvliet et al. 2021 (développement) et White et al. 1986 ; références complètes et DOI dans [data/README.md](data/README.md).
