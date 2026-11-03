# XRPLife — un connectome complet sur le registre XRPL

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
