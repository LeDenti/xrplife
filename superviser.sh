#!/bin/zsh
# Relance vie.mjs tant qu'il ne finit pas proprement (l'état est repris à chaque fois).
cd "$(dirname "$0")"
export ETAT=${ETAT:-vie} PARALLELE=${PARALLELE:-16}
for i in {1..40}; do
  echo "$(date -u +%H:%M:%S) superviseur : lancement $i" >> "$ETAT.log"
  node vie.mjs >> "$ETAT.log" 2>&1; rc=$?
  [ $rc -eq 0 ] && { echo "$(date -u +%H:%M:%S) superviseur : fini proprement" >> "$ETAT.log"; exit 0; }
  echo "$(date -u +%H:%M:%S) superviseur : sortie $rc , relance dans 20 s" >> "$ETAT.log"
  sleep 20
done
echo "$(date -u +%H:%M:%S) superviseur : abandon après 40 lancements" >> "$ETAT.log"; exit 1
