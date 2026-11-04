// Les stades de vie, d'après les données réelles :
//  - croissance : les 8 connectomes de l'anneau nerveux de Witvliet et al. 2021
//    (8 animaux, de L1 à 0 h à l'adulte à 50 h), via OpenWorm ;
//  - adulte complet : Cook et al. 2019 (hermaphrodite = fichier ancré le 03/11,
//    mâle = matrices SI 5).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const lireCsv = (nom) => {
  const brut = readFileSync(new URL(`./data/${nom}`, import.meta.url));
  const sha256 = createHash('sha256').update(brut).digest('hex');
  const lignes = brut.toString('utf8').trim().split(/\r?\n/).slice(1);
  // Witvliet écrit DB1 là où Cook écrit DB01 : même neurone.
  const norm = (n) => n.replace(/^(DA|DB|DD|VA|VB|VD|AS|VC)(\d)$/, '$10$2');
  return { sha256, aretes: lignes.map((l) => { const [s, c, w, t] = l.split(',').map((x) => x.trim()); return { s: norm(s), c: norm(c), w: Number(w), t }; }) };
};
const lireListe = (nom) => readFileSync(new URL(`./data/${nom}`, import.meta.url), 'utf8').trim().split(/\r?\n/).map((x) => x.trim());

export const NEURONES = {
  herm: new Set([...lireListe('herm_neurones.txt'), 'CANL', 'CANR']),
  male: new Set(lireListe('male_neurones.txt')),
};

// Agrège un fichier d'arêtes en paires orientées {source, cible, chimique, electrique, poids},
// restreintes aux neurones connus du sexe, sans autapse.
function graphe(nom, sexe) {
  const { sha256, aretes } = lireCsv(nom);
  const paires = new Map(); const exclus = new Set();
  for (const a of aretes) {
    if (!NEURONES[sexe].has(a.s) || !NEURONES[sexe].has(a.c)) { exclus.add(NEURONES[sexe].has(a.s) ? a.c : a.s); continue; }
    if (a.s === a.c) continue;
    const k = `${a.s}>${a.c}`;
    const p = paires.get(k) ?? { source: a.s, cible: a.c, chimique: 0, electrique: 0 };
    p[a.t === 'chemical' ? 'chimique' : 'electrique'] += a.w;
    paires.set(k, p);
  }
  const synapses = new Map([...paires].map(([k, p]) => [k, { ...p, poids: p.chimique + p.electrique }]));
  const neurones = new Set(); for (const p of synapses.values()) { neurones.add(p.source); neurones.add(p.cible); }
  return { fichier: nom, sha256, synapses, neurones, exclus: [...exclus] };
}

const WITVLIET = ['L1 0h', 'L1 5h', 'L1 8h', 'L1 16h', 'L2 23h', 'L3 27h', 'adulte 45h', 'adulte 50h'];
// Heures de vie (à 20 °C) auxquelles chaque stade est atteint.
const HEURES = [0, 5, 8, 16, 23, 27, 45, 50];

export function stades(sexe) {
  const liste = [];
  const n = sexe === 'herm' ? 8 : 6; // les larves mâles partagent l'anneau nerveux larvaire ; dès L4 le mâle diverge
  for (let i = 1; i <= n; i++) liste.push({ nom: WITVLIET[i - 1], heure: HEURES[i - 1], source: 'Witvliet 2021', ...graphe(`witvliet_${i}.csv`, sexe) });
  if (sexe === 'herm') liste.push({ nom: 'adulte complet', heure: 60, source: 'Cook 2019 (fichier ancré le 03/11)', ...graphe('herm_full_edgelist.csv', 'herm') });
  else liste.push({ nom: 'adulte mâle complet', heure: 60, source: 'Cook 2019 (SI 5)', ...graphe('male_cook_edgelist.csv', 'male') });
  return liste;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const sexe of ['herm', 'male']) {
    console.log(`== ${sexe}`);
    for (const s of stades(sexe)) console.log(`  ${s.nom.padEnd(20)} ${String(s.neurones.size).padStart(3)} neurones ${String(s.synapses.size).padStart(5)} synapses  exclus: ${s.exclus.slice(0, 6).join(' ')}${s.exclus.length > 6 ? ' …' + s.exclus.length : ''}`);
  }
}
