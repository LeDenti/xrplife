# XRPLife L2 — procédure du réseau (mesurée le 4 novembre 2026)

Une chaîne rippled dédiée à la couche « sentiments » : même logiciel que XRPL
(`xrpld` 3.3.0, image Docker XRPL Labs), réseau séparé `network_id 7302`,
**réserve 0**, frais 10 drops, les neurones y gardent **les mêmes clés et les mêmes
adresses** que sur le testnet (vérifié : ADFL = `rKjK6Jd2…` des deux côtés).

## Fichiers

| fichier | rôle |
|---|---|
| `rippled.cfg.modele` | configuration commune : ports, `[network_id] 7302`, `[voting]` réserve 0, `[amendments]` (47 identifiants + noms), `[ips] 127.0.0.1 51234` qui coupe l'amorçage public |
| `validators.txt` | la liste de confiance (UNL) : une clé publique `nHB…` par validateur, identique sur tous les nœuds |
| `noeud-a/rippled.cfg` | = modèle + `[validator_token]` (secret, hors git) |
| `noeud-b/rippled.cfg` | = modèle + `[ips_fixed] noeud-a 51235` (un suiveur) |
| `cles/` | clés du validateur (`validateur-1.json`, `.token`) et du trésor : **hors git, 0600** |
| `lancer.sh` | genese / demarrer / arreter / etat |
| `../ancrer-l2.mjs` | ancre l'empreinte du dernier registre L2 sur le testnet (organisme E1) |
| `dernier-registre.json`, `ancrages.json` | dernier registre L2 noté, liste des ancrages faits |
| `INVITATION.md` | la page d'une feuille pour les validateurs (anglais) |

## Les cinq étapes pour un nouveau validateur

1. **Clés** : `validator-keys create_keys --keyfile validateur.json` puis
   `validator-keys create_token --keyfile validateur.json`. Garder le fichier et le
   jeton secrets ; envoyer la **clé publique** (`public_key`, `nHB…`) seulement.
2. **Configuration** : copier `rippled.cfg.modele`, coller le bloc `[validator_token]`
   à la fin (à partir de la ligne `[validator_token]`, pas le texte qui précède),
   ajouter `[ips_fixed]` avec un ou deux nœuds existants.
3. **Liste de confiance** : `validators.txt` reçu du réseau, mis à jour quand les
   validateurs en place ont accepté la nouvelle clé (80 %).
4. **Lancer** : `docker run … xrpllabsofficial/xrpld:3.3.0 --load` (ou sans argument
   pour un premier démarrage qui se synchronise sur les pairs). Ports : 51235 ouvert
   aux pairs, 6005 websocket public, 5005/6006 admin **sur localhost seulement**.
5. **Vérifier** : `server_info` doit donner `network_id 7302`, `server_state proposing`
   (validateur) ou `full` (suiveur), et le même `ledger_hash` que les autres nœuds.

## Ce que le banc d'essai a enseigné (mesuré)

- `--start` en mode **réseau** crée la genèse avec les amendements listés dans
  `[amendments]` (47/47). En mode autonome (`-a`), les registres ne sont pas écrits
  comme validés et `--load` ne les retrouve pas ; et voter un amendement après coup
  demande deux semaines de majorité, même en autonome.
- `[amendments]` attend `<identifiant> <nom>` ; un nom seul (« AMM ») fait planter le
  démarrage. Les 57 amendements « obsolètes » de 3.3 sont intégrés en dur (Checks,
  AccountDelete, etc.), pas besoin de les lister.
- Sans section `[ips]`, ou avec une section **vide**, rippled contacte les hubs
  publics et se retrouve avec dix pairs du mainnet. Une entrée locale inerte
  (`127.0.0.1 51234`) coupe l'amorçage ; effacer `db/peerfinder.sqlite` purge le cache.
- **Un validateur sans aucun pair ne ferme pas de registre** (état `disconnected`).
  Il faut toujours au moins un suiveur ; d'où les deux nœuds du kit.
- Arrêter par la commande `stop` (admin), jamais `docker rm -f` : sinon le dernier
  registre n'est pas sur disque et `--load` échoue.
- Les noms `noeud-a`/`noeud-b` de `[ips_fixed]` doivent exister dans le DNS Docker :
  `--network-alias`.
- Le compte de genèse (phrase secrète publique) a été vidé vers le trésor
  `r3eBiYU5S8EQtfehtGTywzc6bd86kjmGpt` (99 999 999 900 XRP) puis neutralisé :
  clé régulière `rrrrrrrrrrrrrrrrrrrrBZbvji`, clé maître désactivée (tesSUCCESS ×3).
- Mesures sur ce Mac (amd64 émulé sur Apple Silicon, donc lent) : un registre
  toutes les 8 à 16 s, une transaction validée en 16 à 35 s, **200 paiements en
  rafale validés 200/200 en 6 registres**. Sur une machine x86 réelle, compter
  3 à 5 s par registre.
- Premier ancrage L2 → testnet : registre 43,
  `F6A3305EF942CFB56CAEDF5E3B9A9F648A6AF2FC036FBF392471987015E145A8`, mémo
  `xrplife/l2-anchor` sur l'organisme E1 (voir `ancrages.json`).

## Hébergement du premier validateur

Tokyo (Vultr) tel quel ne convient pas : 1 cœur, 951 Mo. Il faut au moins 2 cœurs et
4 Go (`node_size tiny`), 8 Go pour être tranquille, x86 (image amd64 native, pas
d'émulation). Ports à ouvrir : 51235 (pairs) et 6005 (websocket public) ; 5005 et 6006
restent sur localhost. Serveur séparé de celui des bots.
