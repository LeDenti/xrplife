// Vérifie sur le registre, sans rien supposer de etat.json : chaque neurone
// existe-t-il, et combien de trustlines porte-t-il ? Compare au connectome.
import { Client } from 'xrpl';
import { readFileSync } from 'node:fs';
import { lireConnectome, monnaie } from './connectome.mjs';

const etat = JSON.parse(readFileSync(new URL('./etat.json', import.meta.url), 'utf8'));
const { neurones, synapses } = lireConnectome();
const attendu = new Map();
for (const s of synapses) attendu.set(`${s.source}>${s.cible}`, s.poids);
const client = new Client(etat.reseau);
await client.connect();
let comptes = 0, lignes = 0, bonnes = 0, soldeTotal = 0;
const manquantes = [];
const adr2nom = new Map(Object.entries(etat.neurones).map(([n, v]) => [v.adresse, n]));
for (const n of neurones) {
  const a = etat.neurones[n]?.adresse;
  try {
    const ai = await client.request({ command: 'account_info', account: a, ledger_index: 'validated' });
    comptes++; soldeTotal += Number(ai.result.account_data.Balance) / 1e6;
  } catch { manquantes.push(`compte ${n}`); continue; }
  const al = await client.request({ command: 'account_lines', account: a, limit: 400 });
  for (const l of al.result.lines) {
    if (Number(l.limit) === 0) continue; // ligne vue du côté émetteur
    lignes++;
    const src = adr2nom.get(l.account);
    const k = `${src}>${n}`;
    if (l.currency === monnaie(src) && attendu.get(k) === Number(l.limit)) bonnes++;
  }
}
for (const k of attendu.keys()) if (!etat.synapses[k]) manquantes.push(`synapse ${k}`);
const anc = etat.ancrage ? await client.request({ command: 'tx', transaction: etat.ancrage.hash }) : null;
console.log(`comptes : ${comptes}/${neurones.length}   trustlines sur le registre : ${lignes}, conformes au connectome : ${bonnes}/${synapses.length}`);
console.log(`XRP immobilisés dans les neurones : ${soldeTotal.toFixed(1)}   ancrage : ${anc ? anc.result.meta.TransactionResult + ' ' + etat.ancrage.hash : 'absent'}`);
if (manquantes.length) console.log('manquants :', manquantes.slice(0, 20).join(', '), manquantes.length > 20 ? `… (${manquantes.length})` : '');
await client.disconnect();
