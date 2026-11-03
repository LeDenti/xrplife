// Lit le connectome public de C. elegans (Cook et al. 2019, via OpenWorm) et
// n'en garde que le sous-graphe neurone -> neurone.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const FICHIER = new URL('./data/herm_full_edgelist.csv', import.meta.url);
export const SOURCE_URL = 'https://raw.githubusercontent.com/openworm/c302/master/c302/data/herm_full_edgelist.csv';
// Les deux neurones CAN n'ont aucune synapse connue : ils existent, isolés.
const SANS_SYNAPSE = ['CANL', 'CANR'];

export function lireConnectome() {
  const brut = readFileSync(FICHIER);
  const sha256 = createHash('sha256').update(brut).digest('hex');
  const lignes = brut.toString('utf8').trim().split(/\r?\n/).slice(1);
  const estNeurone = (n) => /^[A-Z]/.test(n);
  const paires = new Map(); // "A>B" -> {source, cible, chimique, electrique}
  const neurones = new Set(SANS_SYNAPSE);
  for (const l of lignes) {
    const [s, c, w, t] = l.split(',').map((x) => x.trim());
    if (!estNeurone(s) || !estNeurone(c)) continue; // muscles, hypoderme, intestin : hors périmètre
    neurones.add(s); neurones.add(c);
    const k = `${s}>${c}`;
    const p = paires.get(k) ?? { source: s, cible: c, chimique: 0, electrique: 0 };
    p[t === 'chemical' ? 'chimique' : 'electrique'] += Number(w);
    paires.set(k, p);
  }
  // Autapses (un neurone sur lui-même) : XRPL refuse une trustline vers soi-même ; écartées, comptées.
  const autapses = [...paires.values()].filter((p) => p.source === p.cible).length;
  const synapses = [...paires.values()].filter((p) => p.source !== p.cible).map((p) => ({ ...p, poids: p.chimique + p.electrique }));
  return { sha256, neurones: [...neurones].sort(), synapses, autapses };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const c = lireConnectome();
  const entrees = new Map();
  for (const s of c.synapses) entrees.set(s.cible, (entrees.get(s.cible) ?? 0) + 1);
  console.log('sha256', c.sha256);
  console.log(c.neurones.length, 'neurones,', c.synapses.length, 'trustlines à poser,', c.autapses, 'autapses écartées,',
    'poids total', c.synapses.reduce((a, s) => a + s.poids, 0));
  console.log('réserve estimée', (c.neurones.length + 0.2 * c.synapses.length).toFixed(1), 'XRP');
}

// Chaque neurone émet sa propre monnaie : son nom en ASCII sur 20 octets (code non standard XRPL).
export const monnaie = (nom) => Buffer.from(nom, 'ascii').toString('hex').toUpperCase().padEnd(40, '0');
