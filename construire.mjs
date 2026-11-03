// Matérialise le connectome de C. elegans sur le testnet XRPL :
//   neurone  = compte XRPL          (financé par le compte « organisme »)
//   synapse  = trustline            (posée par le neurone POST-synaptique vers
//                                    la monnaie SYN du neurone PRÉ-synaptique,
//                                    limite = poids chimique + électrique)
//   empreinte du jeu de données = mémo d'un AccountSet du compte organisme
// Relançable : chaque phase ne refait que ce qui manque.
import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { lireConnectome, SOURCE_URL, monnaie } from './connectome.mjs';

const RESEAU = process.env.XRPL_WS ?? 'wss://s.altnet.rippletest.net:51233';
const ETAT = new URL('./etat.json', import.meta.url);       // adresses publiques, hachages
const CLES = new URL('./.cles.json', import.meta.url);      // graines (testnet), 0600, hors git
const PARALLELE = Number(process.env.PARALLELE ?? 40);
const NO_RIPPLE = 0x00020000; // tfSetNoRipple : chaque synapse reste isolée

const lireJson = (u, def) => (existsSync(u) ? JSON.parse(readFileSync(u, 'utf8')) : def);
const ecrireJson = (u, o, mode) => { writeFileSync(u, JSON.stringify(o, null, 1)); if (mode) chmodSync(u, mode); };
const memo = (type, data) => ({ Memo: { MemoType: convertStringToHex(type), MemoData: convertStringToHex(data) } });
const hhmmss = () => new Date().toISOString().slice(11, 19);
const log = (...a) => console.log(hhmmss(), ...a);

const etat = lireJson(ETAT, { reseau: RESEAU, neurones: {}, synapses: {}, journal: [] });
const cles = lireJson(CLES, { organisme: null, neurones: {} });
const sauver = () => { ecrireJson(ETAT, etat); ecrireJson(CLES, cles, 0o600); };

const connectome = lireConnectome();
const entrees = new Map(); // neurone -> nombre de trustlines qu'il devra porter
for (const s of connectome.synapses) entrees.set(s.cible, (entrees.get(s.cible) ?? 0) + 1);
// Réserve XRPL : 1 XRP de base + 0,2 par trustline portée ; + 0,3 pour les frais et l'influx.
const besoin = (n) => 1 + 0.2 * (entrees.get(n) ?? 0) + 0.3;

const client = new Client(RESEAU);
await client.connect();

async function soumettre(wallet, tx, essais = 3) {
  for (let i = 1; ; i++) {
    try {
      const prep = await client.autofill(tx);
      const r = await client.submitAndWait(wallet.sign(prep).tx_blob);
      const code = r.result.meta.TransactionResult;
      if (code !== 'tesSUCCESS') throw new Error(code);
      return r.result.hash;
    } catch (e) {
      if (i >= essais || /^tec/.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function enParallele(items, n, fn) {
  let i = 0, fautes = 0;
  const ouvriers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const it = items[i++];
      try { await fn(it); } catch (e) { fautes++; log('ÉCHEC', JSON.stringify(it).slice(0, 80), e.message); }
    }
  });
  await Promise.all(ouvriers);
  return fautes;
}

// ---- Phase 1 : l'organisme (compte maître, financé par le robinet) ----
async function phaseOrganisme() {
  let w;
  if (cles.organisme) w = Wallet.fromSeed(cles.organisme);
  else {
    w = Wallet.generate(); cles.organisme = w.seed; etat.organisme = w.classicAddress; sauver();
  }
  const total = connectome.neurones.reduce((a, n) => a + besoin(n), 0) + 20;
  let solde = 0;
  try { solde = Number(await client.getXrpBalance(w.classicAddress)); } catch { /* compte inexistant */ }
  while (solde < total) {
    log(`organisme ${w.classicAddress} : ${solde.toFixed(1)} XRP, besoin ${total.toFixed(1)} → robinet`);
    const r = await client.fundWallet(w, { amount: '1000' });
    solde = Number(r.balance);
  }
  log(`organisme ${w.classicAddress} : ${solde.toFixed(1)} XRP`);
  return w;
}

// ---- Phase 2 : les neurones (302 comptes créés par paiement de l'organisme) ----
async function phaseNeurones(org) {
  const manquants = [];
  for (const n of connectome.neurones) {
    if (!cles.neurones[n]) { const w = Wallet.generate(); cles.neurones[n] = w.seed; etat.neurones[n] = { adresse: w.classicAddress }; }
    if (!etat.neurones[n].cree) manquants.push(n);
  }
  sauver();
  log(`neurones : ${connectome.neurones.length - manquants.length} déjà créés, ${manquants.length} à créer`);
  // Paiements de l'organisme : séquence manuelle, 8 par lot (taille de la file rippled), le dernier attendu.
  for (let i = 0; i < manquants.length; i += 8) {
    const lot = manquants.slice(i, i + 8);
    const info = await client.request({ command: 'account_info', account: org.classicAddress, ledger_index: 'current' });
    let seq = info.result.account_data.Sequence;
    const li = (await client.getLedgerIndex()) + 60;
    const blobs = [];
    for (const n of lot) {
      const tx = {
        TransactionType: 'Payment', Account: org.classicAddress, Destination: etat.neurones[n].adresse,
        Amount: xrpToDrops(besoin(n).toFixed(6)), Sequence: seq++, LastLedgerSequence: li, Fee: '12',
        Memos: [memo('xrplife/neuron', n)],
      };
      blobs.push({ n, blob: org.sign(tx).tx_blob });
    }
    for (const b of blobs.slice(0, -1)) await client.submit(b.blob);
    const dernier = blobs.at(-1);
    const r = await client.submitAndWait(dernier.blob);
    if (r.result.meta.TransactionResult !== 'tesSUCCESS') log('lot : dernier paiement', r.result.meta.TransactionResult);
    for (const b of blobs) {
      try {
        const ai = await client.request({ command: 'account_info', account: etat.neurones[b.n].adresse, ledger_index: 'validated' });
        etat.neurones[b.n].cree = true; etat.neurones[b.n].solde = Number(ai.result.account_data.Balance) / 1e6;
      } catch { log('non créé (sera repris) :', b.n); }
    }
    sauver();
    log(`neurones créés : ${Object.values(etat.neurones).filter((x) => x.cree).length}/${connectome.neurones.length}`);
  }
  const restants = connectome.neurones.filter((n) => !etat.neurones[n].cree);
  if (restants.length) { log('reprise de', restants.length, 'neurones'); return phaseNeurones(org); }
}

// ---- Phase 3 : les synapses (trustlines posées par le neurone post-synaptique) ----
async function phaseSynapses() {
  const parCible = new Map();
  for (const s of connectome.synapses) {
    const k = `${s.source}>${s.cible}`;
    if (etat.synapses[k]) continue;
    if (!parCible.has(s.cible)) parCible.set(s.cible, []);
    parCible.get(s.cible).push(s);
  }
  // Vérifie d'abord ce que le registre connaît déjà (relance après coupure).
  for (const [cible, liste] of parCible) {
    const lignes = await client.request({ command: 'account_lines', account: etat.neurones[cible].adresse, limit: 400 });
    const vues = new Map(lignes.result.lines.map((l) => [`${l.account}/${l.currency}`, l]));
    for (const s of [...liste]) {
      const l = vues.get(`${etat.neurones[s.source].adresse}/${monnaie(s.source)}`);
      if (l && Number(l.limit) === s.poids) { etat.synapses[`${s.source}>${s.cible}`] = { hash: 'déjà posée', poids: s.poids }; liste.splice(liste.indexOf(s), 1); }
    }
    if (!liste.length) parCible.delete(cible);
  }
  sauver();
  const total = [...parCible.values()].reduce((a, l) => a + l.length, 0);
  log(`synapses : ${Object.keys(etat.synapses).length} déjà posées, ${total} à poser sur ${parCible.size} neurones`);
  let faites = 0;
  const fautes = await enParallele([...parCible.entries()], PARALLELE, async ([cible, liste]) => {
    const w = Wallet.fromSeed(cles.neurones[cible]);
    for (const s of liste) {
      const hash = await soumettre(w, {
        TransactionType: 'TrustSet', Account: w.classicAddress, Flags: NO_RIPPLE,
        LimitAmount: { currency: monnaie(s.source), issuer: etat.neurones[s.source].adresse, value: String(s.poids) },
        Memos: [memo('xrplife/synapse', `${s.source}>${s.cible} chem=${s.chimique} elec=${s.electrique}`)],
      });
      etat.synapses[`${s.source}>${s.cible}`] = { hash, poids: s.poids };
      if (++faites % 100 === 0) { sauver(); log(`synapses posées : ${faites}/${total}`); }
    }
  });
  sauver();
  log(`synapses : ${Object.keys(etat.synapses).length}/${connectome.synapses.length} posées, ${fautes} neurones en échec`);
  if (fautes) { log('reprise'); return phaseSynapses(); }
}

// ---- Phase 4 : l'empreinte du jeu de données, ancrée par l'organisme ----
async function phaseAncrage(org) {
  if (etat.ancrage) { log('ancrage déjà fait', etat.ancrage.hash); return; }
  const hash = await soumettre(org, {
    TransactionType: 'AccountSet', Account: org.classicAddress,
    Memos: [
      memo('xrplife/dataset', `sha256=${connectome.sha256}`),
      memo('xrplife/source', SOURCE_URL),
      memo('xrplife/connectome', `C. elegans hermaphrodite, Cook et al. 2019 ; ${connectome.neurones.length} neurons = accounts, ${connectome.synapses.length} directed synaptic pairs = trustlines (${connectome.autapses} autapses excluded: a ledger account cannot trust itself ; limit = chemical+electrical weight, currency = presynaptic neuron's name, issued by it)`),
    ],
  });
  etat.ancrage = { hash, sha256: connectome.sha256, date: new Date().toISOString() };
  sauver();
  log('ancrage', hash);
}

const phases = process.argv.slice(2).length ? process.argv.slice(2) : ['organisme', 'neurones', 'synapses', 'ancrage'];
const org = await phaseOrganisme();
if (phases.includes('neurones')) await phaseNeurones(org);
if (phases.includes('synapses')) await phaseSynapses();
if (phases.includes('ancrage')) await phaseAncrage(org);
await client.disconnect();
log('fini');
