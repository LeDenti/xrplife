// Le réseau mitochondrial de E1 sur la chaîne 7302 (réserve 0, actif natif = énergie).
//   Un neurone n'a pas d'énergie propre : ses mitochondries (N par neurone, des comptes) tiennent l'ATP
//   (l'actif natif) et le lui avancent juste avant chaque dépense. Une mitochondrie mutée ne convertit plus :
//   elle ne donne rien. Fusion = une mitochondrie verse tout à une sœur et s'éteint ; fission = elle en crée
//   une nouvelle avec la moitié de son stock (même génome). Paliers : la part de mutées monte de 0 à 100 % ;
//   à chaque palier, chaque neurone doit payer son entretien (BESOIN unités) avec au plus CAPACITE unités par
//   mitochondrie saine : s'il n'y arrive pas, il est silencieux. Le seuil de panne est lu, pas fixé.
//   Tout est tiré d'une graine fixée (GRAINE) : même graine → mêmes clés, mêmes mutations, mêmes fusions.
//   node mito.mjs [tout|creer|palier <p>|verifier]      XRPL_WS=ws://127.0.0.1:6006
import { Wallet, xrpToDrops } from 'xrpl';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { client, memo, log, dormir, soumettre, lots, solde, registre, NETWORK_ID, compterCodes } from './commun.mjs';

if (NETWORK_ID !== 7302) throw new Error(`cette expérience vit sur la chaîne 7302 (ici network_id ${NETWORK_ID}) : XRPL_WS=ws://127.0.0.1:6006`);
export const PARAMS = {
  ver: process.env.VER ?? 'E1',
  graine: process.env.GRAINE ?? 'xrplife-mito-2026-11-05',
  N: Number(process.env.MITO_N ?? 6),           // mitochondries par neurone à la naissance
  UNITE: 1000,                                  // 1 unité d'ATP = 1 000 drops
  BESOIN: 4,                                    // unités d'entretien par neurone et par palier
  CAPACITE: 2,                                  // unités qu'une mitochondrie saine peut avancer par palier (réserve ~1/3 : 6×2 = 12 pour un besoin de 4)
  STOCK: 50,                                    // unités reçues à la naissance par mitochondrie
  PALIERS: (process.env.PALIERS ?? '0,10,20,30,40,50,60,70,80,90,100').split(',').map(Number),
  FUSIONS: 8, FISSIONS: 8,                      // événements par palier, tirés
};
const VIE = JSON.parse(readFileSync(new URL('./vie-etat.json', import.meta.url), 'utf8'));
const CLES_VIE = JSON.parse(readFileSync(new URL('./.cles-vie.json', import.meta.url), 'utf8'));
const ver = VIE.vers[PARAMS.ver]; const clesVer = CLES_VIE.vers[PARAMS.ver];
const NEURONES = Object.keys(ver.neurones).sort();
const ETAT = new URL('./mito-etat.json', import.meta.url);
const etat = existsSync(ETAT) ? JSON.parse(readFileSync(ETAT, 'utf8')) : { params: PARAMS, ver: PARAMS.ver, organisme: ver.adresse, neurones: {}, mitos: {}, paliers: [], journal: [], ancrages: {} };
const sauver = () => { etat.rng = rng; writeFileSync(ETAT, JSON.stringify(etat, null, 1)); };
const sha = (s) => createHash('sha256').update(s).digest('hex');
// Générateur déterministe (xorshift32) nourri par la graine
let rng = parseInt(sha(PARAMS.graine).slice(0, 8), 16) || 1;
if (etat.rng) rng = etat.rng;   // reprise : le générateur repart exactement où il s'était arrêté
const alea = () => { rng ^= rng << 13; rng >>>= 0; rng ^= rng >>> 17; rng ^= rng << 5; rng >>>= 0; return rng / 4294967296; };
const tresor = Wallet.fromSeed(JSON.parse(readFileSync(new URL('./l2/cles/tresor.json', import.meta.url), 'utf8')).seed);
const wOrg = Wallet.fromSeed(clesVer.organisme);
const wN = (n) => Wallet.fromSeed(clesVer.neurones[n]);
const adrN = (n) => ver.neurones[n].adresse;
// Une mitochondrie : clé dérivée de la graine (reproductible), sans fichier de clés
const wM = (id) => Wallet.fromEntropy(Buffer.from(sha(`${PARAMS.graine}/${id}`).slice(0, 32), 'hex'));
const drops = (u) => String(u * PARAMS.UNITE);
function journal(type, detail, hash) { etat.journal.push({ t: new Date().toISOString(), type, detail, hash }); log(type, detail, hash ? hash.slice(0, 8) + '…' : ''); sauver(); }
const ancrer = async (type, obj) => (await soumettre(wOrg, { TransactionType: 'AccountSet', Memos: [memo(type, JSON.stringify(obj))] })).hash;
const existe = async (a) => { try { await client.request({ command: 'account_info', account: a }); return true; } catch { return false; } };

// ---- 1. Naissance : l'organisme et les neurones sur la L2, puis leurs mitochondries ----
async function creer() {
  const reg0 = await registre(); etat.registreDepart = reg0; etat.hashDepart = (await client.request({ command: 'ledger', ledger_index: 'validated' })).result.ledger.ledger_hash;
  if (!(await existe(wOrg.classicAddress))) { const r = await soumettre(tresor, { TransactionType: 'Payment', Destination: wOrg.classicAddress, Amount: xrpToDrops('1'), Memos: [memo('xrplife/organism', `${PARAMS.ver} on chain 7302 (same keys as testnet)`)] }); journal('organisme', `${wOrg.classicAddress} sur la L2`, r.hash); }
  // Les neurones reçoivent du trésor (le soleil) de quoi construire leurs mitochondries, et rien d'autre
  const aCreer = []; for (const n of NEURONES) if (!etat.neurones[n]?.cree) aCreer.push(n);
  const parNeurone = PARAMS.N * PARAMS.STOCK * PARAMS.UNITE + PARAMS.N * 12 + 12; // stock des N mitochondries + frais de leur création
  for (let i = 0; i < aCreer.length; i += 8) {
    const lot = aCreer.slice(i, i + 8);
    const res = await lots(tresor, lot.map((n) => ({ TransactionType: 'Payment', Destination: adrN(n), Amount: String(parNeurone), Memos: [memo('xrplife/neuron', `${PARAMS.ver} ${n} born on chain 7302, builds ${PARAMS.N} mitochondria`)] })));
    res.forEach((r, k) => { if (r.code === 'tesSUCCESS') etat.neurones[lot[k]] = { adresse: adrN(lot[k]), cree: true, mitos: [] }; });
    sauver(); log(`neurones créés ${Math.min(i + 8, aCreer.length)}/${aCreer.length}`);
  }
  // Chaque neurone crée ses N mitochondries (comptes dérivés de la graine), génome sain, en parallèle
  await Promise.all(NEURONES.map(async (n) => {
    const ids = Array.from({ length: PARAMS.N }, (_, k) => `${n}/m${k}`).filter((id) => !etat.mitos[id]?.cree);
    if (!ids.length) return;
    const res = await lots(wN(n), ids.map((id) => ({ TransactionType: 'Payment', Destination: wM(id).classicAddress, Amount: drops(PARAMS.STOCK), Memos: [memo('xrplife/mitochondrion', `${id} genome=wt stock=${PARAMS.STOCK} (maternal lineage ${ver.parents.join('+') || 'founder'})`)] })));
    res.forEach((r, k) => { if (r.code === 'tesSUCCESS') { etat.mitos[ids[k]] = { adresse: wM(ids[k]).classicAddress, neurone: n, genome: 'wt', cree: true, vivante: true }; etat.neurones[n].mitos.push(ids[k]); } });
  }));
  const vivantes = Object.values(etat.mitos).filter((m) => m.vivante).length;
  const h = await ancrer('xrplife/mito-birth', { ver: PARAMS.ver, chain: 7302, seed_hash: sha(PARAMS.graine), params: { N: PARAMS.N, BESOIN: PARAMS.BESOIN, CAPACITE: PARAMS.CAPACITE, STOCK: PARAMS.STOCK }, neurons: NEURONES.length, mitochondria: vivantes, ledger: await registre() });
  etat.ancrages.naissance = h; journal('naissance', `${NEURONES.length} neurones, ${vivantes} mitochondries sur la L2`, h);
}

// ---- 2. Un palier : mutations, fusions, fissions, puis l'entretien de chaque neurone ----
const vivantesDe = (n) => etat.neurones[n].mitos.filter((id) => etat.mitos[id].vivante);
async function palier(p) {
  if (etat.paliers.some((x) => x.p === p)) return;
  const t0 = Date.now(); let mutations = 0, fusions = 0, fissions = 0; const codes = {};
  // Mutations : dans chaque neurone, la part p (monotone : une mutée le reste), dans un ordre tiré par la graine
  await Promise.all(NEURONES.map(async (n) => {
    const liste = vivantesDe(n); const cible = Math.round(p / 100 * liste.length);
    const dejaMutees = liste.filter((id) => etat.mitos[id].genome === 'mut');
    const saines = liste.filter((id) => etat.mitos[id].genome === 'wt').sort((a, b) => (etat.mitos[a].ordre ?? 0) - (etat.mitos[b].ordre ?? 0));
    const aMuter = saines.slice(0, Math.max(0, cible - dejaMutees.length));
    for (const id of aMuter) { const r = await soumettre(wM(id), { TransactionType: 'AccountSet', Memos: [memo('xrplife/mitochondrion', `${id} genome=mut at step ${p}% (mtDNA deletion, no conversion)`)] }); codes[r.code] = (codes[r.code] ?? 0) + 1; if (r.code === 'tesSUCCESS') { etat.mitos[id].genome = 'mut'; mutations++; } }
  }));
  // Fusions et fissions, tirées
  for (let k = 0; k < PARAMS.FUSIONS; k++) {
    const n = NEURONES[Math.floor(alea() * NEURONES.length)]; const v = vivantesDe(n); if (v.length < 2) continue;
    const a = v[Math.floor(alea() * v.length)]; let b = v[Math.floor(alea() * v.length)]; if (a === b) continue;
    const s = await solde(etat.mitos[a].adresse); const montant = Math.floor(s * 1e6) - 12; if (montant <= 0) continue;
    const r = await soumettre(wM(a), { TransactionType: 'Payment', Destination: etat.mitos[b].adresse, Amount: String(montant), Memos: [memo('xrplife/fusion', `${a} fuses into ${b} (${etat.mitos[a].genome}+${etat.mitos[b].genome})`)] });
    codes[r.code] = (codes[r.code] ?? 0) + 1; if (r.code === 'tesSUCCESS') { etat.mitos[a].vivante = false; etat.mitos[a].fusionneeDans = b; fusions++; if (etat.mitos[a].genome === 'mut') etat.mitos[b].genome = 'mut'; } // un génome muté se propage à la fusion
  }
  for (let k = 0; k < PARAMS.FISSIONS; k++) {
    const n = NEURONES[Math.floor(alea() * NEURONES.length)]; const v = vivantesDe(n); if (!v.length) continue;
    const a = v[Math.floor(alea() * v.length)]; const s = await solde(etat.mitos[a].adresse); const moitie = Math.floor(s * 1e6 / 2) - 12; if (moitie < PARAMS.UNITE) continue;
    const id = `${n}/f${p}-${k}`; const r = await soumettre(wM(a), { TransactionType: 'Payment', Destination: wM(id).classicAddress, Amount: String(moitie), Memos: [memo('xrplife/fission', `${a} divides into ${id} (genome ${etat.mitos[a].genome})`)] });
    codes[r.code] = (codes[r.code] ?? 0) + 1; if (r.code === 'tesSUCCESS') { etat.mitos[id] = { adresse: wM(id).classicAddress, neurone: n, genome: etat.mitos[a].genome, cree: true, vivante: true, ordre: alea() }; etat.neurones[n].mitos.push(id); fissions++; }
  }
  sauver();
  // L'entretien : chaque neurone demande BESOIN unités à ses mitochondries saines (au plus CAPACITE chacune), puis paie
  let silencieux = 0, actifs = 0; const detail = {};
  await Promise.all(NEURONES.map(async (n) => {
    const saines = vivantesDe(n).filter((id) => etat.mitos[id].genome === 'wt'); let recu = 0;
    // Les mitochondries saines donnent en parallèle, chacune au plus CAPACITE, jusqu'au besoin (soldes lus en parallèle)
    const soldes = await Promise.all(saines.map((id) => solde(etat.mitos[id].adresse)));
    const dons = []; let reste = PARAMS.BESOIN;
    saines.forEach((id, k) => { if (reste <= 0) return; const donne = Math.min(PARAMS.CAPACITE, reste, Math.floor(soldes[k] * 1e6 / PARAMS.UNITE) - 1); if (donne > 0) { dons.push([id, donne]); reste -= donne; } });
    const res = await Promise.all(dons.map(([id, donne]) => soumettre(wM(id), { TransactionType: 'Payment', Destination: adrN(n), Amount: drops(donne), Memos: [memo('xrplife/atp', `${id} gives ${donne} ATP to ${n} at step ${p}%`)] })));
    res.forEach((r, k) => { codes[r.code] = (codes[r.code] ?? 0) + 1; if (r.code === 'tesSUCCESS') recu += dons[k][1]; });
    const total = vivantesDe(n).length; detail[n] = { saines: saines.length, total, recu };
    if (recu >= PARAMS.BESOIN) {
      const r = await soumettre(wN(n), { TransactionType: 'Payment', Destination: wOrg.classicAddress, Amount: drops(PARAMS.BESOIN), Memos: [memo('xrplife/alive', `${n} step=${p} maintained with ${recu} ATP from ${saines.length}/${total} healthy mitochondria`)] });
      codes[r.code] = (codes[r.code] ?? 0) + 1; if (r.code === 'tesSUCCESS') { actifs++; detail[n].vivant = true; } else { silencieux++; detail[n].vivant = false; }
    } else { silencieux++; detail[n].vivant = false; }
  }));
  const mutees = Object.values(etat.mitos).filter((m) => m.vivante && m.genome === 'mut').length, vivantes = Object.values(etat.mitos).filter((m) => m.vivante).length;
  const h = await ancrer('xrplife/mito-step', { ver: PARAMS.ver, step: p, mutated: mutees, alive_mitochondria: vivantes, fusions, fissions, silent_neurons: silencieux, active_neurons: actifs, ledger: await registre() });
  etat.paliers.push({ p, mutations, fusions, fissions, mutees, vivantes, part_mutees: vivantes ? mutees / vivantes : 0, actifs, silencieux, part_silencieux: silencieux / NEURONES.length, codes, detail, duree_s: Math.round((Date.now() - t0) / 1000), ancrage: h });
  journal('palier', `${p} % : ${mutees}/${vivantes} mitochondries mutées (${(100 * mutees / vivantes).toFixed(0)} %), ${fusions} fusions, ${fissions} fissions → ${silencieux}/${NEURONES.length} neurones silencieux`, h);
}

// ---- Programme ----
const [cmd = 'tout', a1] = process.argv.slice(2);
try {
  // ordre de mutation tiré une fois pour toutes (déterministe)
  if (cmd === 'creer' || cmd === 'tout') { if (!etat.ancrages.naissance) await creer(); for (const id of Object.keys(etat.mitos)) if (etat.mitos[id].ordre === undefined) etat.mitos[id].ordre = alea(); sauver(); }
  if (cmd === 'palier') await palier(Number(a1));
  if (cmd === 'tout') {
    for (const p of PARAMS.PALIERS) await palier(p);
    const h = await ancrer('xrplife/mito-test', etat.paliers.map((x) => ({ p: x.p, mut: Number(x.part_mutees.toFixed(3)), silent: Number(x.part_silencieux.toFixed(3)) })));
    etat.ancrages.test = h; journal('fin', 'résultats ancrés sur la L2', h);
    const lv = await client.request({ command: 'ledger', ledger_index: 'validated' });
    writeFileSync(new URL('./l2/dernier-registre.json', import.meta.url), JSON.stringify({ network_id: 7302, ledger_index: lv.result.ledger.ledger_index, ledger_hash: lv.result.ledger.ledger_hash, close_time_iso: lv.result.ledger.close_time_iso, validateur: 'nHBdG1EX5awA6ZXr3z3hN1YbXdE6PGm45ZLoJKCcfM7ZTnJs3XfN', experience: 'mito' }, null, 1));
  }
} finally { sauver(); await client.disconnect(); }
