#!/bin/sh
# XRPLife L2 — lance, arrête ou crée la chaîne. Image XRPL Labs xrpld 3.3.0 (amd64, émulée sur Mac).
#   ./lancer.sh genese     : première fois seulement — registre neuf (--start), 47 amendements, réserve 0
#   ./lancer.sh demarrer   : reprend la chaîne existante (--load) : validateur A + suiveur B
#   ./lancer.sh arreter    : arrêt propre (commande stop, puis suppression des conteneurs)
#   ./lancer.sh etat       : état des deux nœuds
set -e
cd "$(dirname "$0")"
IMAGE=xrpllabsofficial/xrpld:3.3.0
docker network inspect xrplife-l2 >/dev/null 2>&1 || docker network create xrplife-l2 >/dev/null
noeud() { # nom alias dossier ports... args
  nom=$1; alias=$2; dossier=$3; shift 3
  docker run -d --name "$nom" --network xrplife-l2 --network-alias "$alias" --platform linux/amd64 \
    -v "$PWD/$dossier:/config" -v "$PWD/$dossier/db:/var/lib/xrpld/db" -v "$PWD/$dossier/log:/var/log/xrpld" "$@" >/dev/null
}
A() { noeud xrplife-l2-a noeud-a noeud-a -p 127.0.0.1:5005:5005 -p 127.0.0.1:6006:6006 -p 6005:6005 -p 51235:51235 $IMAGE "$@"; }
B() { noeud xrplife-l2-b noeud-b noeud-b -p 127.0.0.1:6016:6006 -p 6015:6005 $IMAGE "$@"; }
arreter() {
  for n in xrplife-l2-a xrplife-l2-b; do
    port=6006; [ "$n" = xrplife-l2-b ] && port=6016
    docker ps --format '{{.Names}}' | grep -q "^$n$" || continue
    node -e "const {Client}=require('xrpl');(async()=>{const c=new Client('ws://127.0.0.1:$port');await c.connect();await c.request({command:'stop'});})().catch(()=>{})" 2>/dev/null || true
    for i in $(seq 1 30); do docker ps -a --filter "name=$n" --format '{{.Status}}' | grep -q '^Exited' && break; sleep 2; done
    docker rm -f "$n" >/dev/null 2>&1 || true
  done
}
case "$1" in
  genese)
    [ -d noeud-a/db ] && { echo "noeud-a/db existe déjà : supprime-le d'abord si tu veux vraiment une genèse neuve"; exit 1; }
    grep -q '^\[validator_token\]' noeud-a/rippled.cfg || { echo "noeud-a/rippled.cfg sans [validator_token] : voir PROCEDURE.md"; exit 1; }
    A --start; echo "validateur A : genèse en cours (compter 60 s)"; sleep 60; B; echo "suiveur B lancé"
    echo "Ensuite : node ../l2-genese.mjs (trésor, trou noir de la genèse)";;
  demarrer) A --load; B; echo "A (--load) et B lancés ; registre dès que B est pair de A (~60 s)";;
  arreter) arreter; echo "arrêtés";;
  etat) for p in 6006 6016; do node -e "const {Client}=require('xrpl');(async()=>{const c=new Client('ws://127.0.0.1:$p');await c.connect();const i=(await c.request({command:'server_info'})).result.info;console.log('$p',i.server_state,'registre',i.validated_ledger?.seq,'pairs',i.peers,'réseau',i.network_id);await c.disconnect()})().catch(e=>console.log('$p injoignable'))"; done;;
  *) echo "usage : $0 genese | demarrer | arreter | etat"; exit 1;;
esac
