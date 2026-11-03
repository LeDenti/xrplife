// Fait traverser un influx dans le réseau matérialisé : depuis un neurone
// de départ, chaque synapse chimique transmet un paiement (monnaie du neurone
// pré-synaptique, montant = poids / 1 000 000) au neurone post-synaptique,
// sur `profondeur` sauts. Le registre enregistre le chemin ; l'agent (ce
// script) décide qui tire — le registre ne calcule pas.
//   node influx.mjs [neurone=ALML] [profondeur=2] [max_par_saut=0 = tous]
import { Client, Wallet, convertStringToHex } from 'xrpl';
import { readFileSync } from 'node:fs';
import { lireConnectome, monnaie } from './connectome.mjs';

const [depart = 'ALML', profondeur = 2, maxParSaut = 0] = process.argv.slice(2);
const etat = JSON.parse(readFileSync(new URL('./etat.json', import.meta.url), 'utf8'));
const cles = JSON.parse(readFileSync(new URL('./.cles.json', import.meta.url), 'utf8'));
const { synapses } = lireConnectome();
const sortantes = new Map();
for (const s of synapses) if (s.chimique > 0) { if (!sortantes.has(s.source)) sortantes.set(s.source, []); sortantes.get(s.source).push(s); }
for (const l of sortantes.values()) l.sort((a, b) => b.chimique - a.chimique);

const client = new Client(etat.reseau);
await client.connect();
const memo = (type, data) => ({ Memo: { MemoType: convertStringToHex(type), MemoData: convertStringToHex(data) } });
const t0 = Date.now();
let front = [depart]; const atteints = new Set(front); let total = 0;
for (let saut = 1; saut <= Number(profondeur); saut++) {
  const suivant = new Set();
  await Promise.all(front.map(async (src) => {
    let liste = sortantes.get(src) ?? [];
    if (Number(maxParSaut) > 0) liste = liste.slice(0, Number(maxParSaut));
    const w = Wallet.fromSeed(cles.neurones[src]);
    for (const s of liste) {
      const tx = await client.autofill({
        TransactionType: 'Payment', Account: w.classicAddress, Destination: etat.neurones[s.cible].adresse,
        Amount: { currency: monnaie(src), issuer: w.classicAddress, value: (s.chimique / 1e6).toFixed(6) },
        Memos: [memo('xrplife/spike', `origin=${depart} hop=${saut} ${src}>${s.cible} w=${s.chimique}`)],
      });
      const r = await client.submitAndWait(w.sign(tx).tx_blob);
      const code = r.result.meta.TransactionResult;
      console.log(`saut ${saut}  ${src.padEnd(6)} → ${s.cible.padEnd(6)} poids ${String(s.chimique).padStart(3)}  ${code}  ${r.result.hash.slice(0, 8)}…`);
      if (code === 'tesSUCCESS') { total++; if (!atteints.has(s.cible)) suivant.add(s.cible); }
    }
  }));
  for (const n of suivant) atteints.add(n);
  front = [...suivant];
  console.log(`— saut ${saut} : ${front.length} neurones nouvellement atteints`);
}
console.log(`${total} influx transmis, ${atteints.size - 1} neurones atteints depuis ${depart}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await client.disconnect();
