// La couche « sentiments » (L2) du ver E1 : neuromodulation sur le registre.
//   Données : Bentley et al. 2016 (connectome multicouche) — une arête = l'émetteur
//   exprime l'enzyme de synthèse du modulateur, le récepteur exprime un récepteur nommé.
//   Correspondance : émetteur = compte qui émet une monnaie « 5HT.<nom> » ou « PDF1.<nom> »
//   (une par émetteur : avec une monnaie commune, deux émetteurs qui se modulent l'un l'autre
//   partageraient un objet RippleState et leurs sécrétions s'annuleraient — mesuré à l'essai 1) ;
//   récepteur = trustline du neurone récepteur vers cette monnaie (mémo = nom du récepteur) ;
//   concentration = solde ; sécrétion = paiement ; recapture = paiement retour à l'émetteur.
//   L'agent d'influx (L3, hors chaîne) lit les soldes et multiplie le gain du neurone :
//   mod-1, ser-4 inhibiteurs ; ser-1, ser-5, pdfr-1 excitateurs.
//   Test : même stimulus en trois états — base (rien), repu (5HT), affamé (PDF-1 après
//   recapture de la 5HT) — et part de l'activité qui atteint les commandes de marche avant
//   (AVB, PVC) contre les commandes d'arrêt/recul/virage (AVA, AVD, AVE, RIM, RIV, SMD).
//   Flavell 2013 : la sérotonine fait brouter (ralentir, tourner), PDF fait errer (avancer).
//   node humeur.mjs poser | etat base|repu|affame | influx <neurone> <etat> | tout
import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stades } from './stades.mjs';
import { monnaie } from './connectome.mjs';

const RESEAU = process.env.XRPL_WS ?? 'wss://s.altnet.rippletest.net:51233';
const VER = process.env.VER ?? 'E1';
const PARALLELE = Number(process.env.PARALLELE ?? 16);
const TAILLE_LOT = 8;
const NO_RIPPLE = 0x00020000;
const SAUTS = Number(process.env.SAUTS ?? 3);
const ETAT = new URL('./humeur-etat.json', import.meta.url);
const VIE = JSON.parse(readFileSync(new URL('./vie-etat.json', import.meta.url), 'utf8'));
const CLES = JSON.parse(readFileSync(new URL('./.cles-vie.json', import.meta.url), 'utf8'));
const ver = VIE.vers[VER]; const clesVer = CLES.vers[VER];
if (!ver || !clesVer) throw new Error(`${VER} inconnu`);
const NEURONES = new Set(Object.keys(ver.neurones));
const etat = existsSync(ETAT) ? JSON.parse(readFileSync(ETAT, 'utf8')) : { ver: VER, organisme: ver.adresse, modulateurs: {}, gains: {}, essais: [], journal: [] };
const sauver = () => writeFileSync(ETAT, JSON.stringify(etat, null, 1));
const memo = (type, data) => ({ Memo: { MemoType: convertStringToHex(type), MemoData: convertStringToHex(String(data).slice(0, 900)) } });
const hhmmss = () => new Date().toISOString().slice(11, 19);
const log = (...a) => console.log(hhmmss(), ...a);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const wOrg = Wallet.fromSeed(clesVer.organisme);
const wN = (n) => Wallet.fromSeed(clesVer.neurones[n]);
const adr = (n) => ver.neurones[n].adresse;

// ---- Données de modulation (Bentley 2016) ----
const SIGNE = { 'mod-1': -1, 'ser-4': -1, 'ser-1': +1, 'ser-5': +1, 'ser-7': +1, 'pdfr-1': +1 };
const MODULATEURS = {
  '5HT': { fichier: 'bentley2016_monoamines.csv', molecule: 'serotonin' },
  PDF1: { fichier: 'bentley2016_neuropeptides.csv', molecule: 'pdf-1' },
};
const code = (mod, pre) => monnaie(`${mod}.${pre}`);            // une monnaie par (modulateur, émetteur)
const prefixe = (mod) => convertStringToHex(`${mod}.`);         // pour reconnaître ses lignes
const nz = (n) => n.replace(/^(DA|DB|DD|VA|VB|VD|AS|VC)(\d)$/, '$10$2');
function aretes(mod) {
  const m = MODULATEURS[mod];
  const txt = readFileSync(new URL(`./data/${m.fichier}`, import.meta.url), 'utf8');
  const rows = txt.trim().split('\n').map((l) => l.split(',').map((x) => x.trim()));
  return rows.filter((r) => r[2] === m.molecule).map(([pre, post, , rec]) => ({ pre: nz(pre), post: nz(post), rec }))
    .filter((a) => NEURONES.has(a.pre) && NEURONES.has(a.post) && a.pre !== a.post && SIGNE[a.rec] !== undefined);
}
const SHA_DONNEES = Object.fromEntries(Object.values(MODULATEURS).map((m) => [m.fichier, sha(readFileSync(new URL(`./data/${m.fichier}`, import.meta.url)))]));

// ---- Le graphe filaire de E1 : stade courant, synapses chimiques ----
const stade = stades(ver.sexe)[ver.stade];
const sortantes = new Map();
for (const s of stade.synapses.values()) {
  if (s.chimique <= 0 || !NEURONES.has(s.source) || !NEURONES.has(s.cible)) continue;
  if (!sortantes.has(s.source)) sortantes.set(s.source, []);
  sortantes.get(s.source).push({ cible: s.cible, w: s.chimique });
}
const COMMANDES = {
  avant: ['AVBL', 'AVBR', 'PVCL', 'PVCR'],
  arret: ['AVAL', 'AVAR', 'AVDL', 'AVDR', 'AVEL', 'AVER', 'RIML', 'RIMR', 'RIVL', 'RIVR', 'SMDDL', 'SMDDR', 'SMDVL', 'SMDVR'],
};

// ---- Connexion et soumission (mêmes garde-fous que vie.mjs) ----
const client = new Client(RESEAU, { timeout: 30000 });
await client.connect();
const erreurConnexion = (e) => /websocket|NotConnected|Disconnected|Timeout|connection|"command"/i.test(e?.message ?? '') || /NotConnected|Disconnected|Timeout/.test(e?.name ?? '');
async function avecConnexion(fn, essais = 8) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      if (!erreurConnexion(e) || i >= essais) throw e;
      log('connexion :', (e.message ?? '').slice(0, 60), '→ reprise', i);
      await dormir(3000 * i);
      if (!client.isConnected()) { try { await client.connect(); } catch { /* on réessaiera */ } }
    }
  }
}
const EN_VOL = Number(process.env.EN_VOL ?? 10);
let vol = 0; const fileVol = [];
const prendreVol = () => new Promise((r) => { if (vol < EN_VOL) { vol++; r(); } else fileVol.push(r); });
const rendreVol = () => { vol--; const r = fileVol.shift(); if (r) { vol++; r(); } };
{ const brut = client.request.bind(client); client.request = async (...a) => { await prendreVol(); try { return await avecConnexion(() => brut(...a)); } finally { rendreVol(); } }; }
for (const k of ['submit', 'autofill', 'getXrpBalance', 'getLedgerIndex']) { const brut = client[k].bind(client); client[k] = (...a) => avecConnexion(() => brut(...a)); }
const si = await client.request({ command: 'server_info' });
const RESERVE_BASE = si.result.info.validated_ledger.reserve_base_xrp;
const RESERVE_OBJ = si.result.info.validated_ledger.reserve_inc_xrp;
const registre = () => client.getLedgerIndex();

let enCours = 0; const file = [];
const prendre = () => new Promise((r) => { if (enCours < PARALLELE) { enCours++; r(); } else file.push(r); });
const rendre = () => { enCours--; const r = file.shift(); if (r) { enCours++; r(); } };
const verrous = new Map();
function avecVerrou(adresse, fn) {
  const precedent = verrous.get(adresse) ?? Promise.resolve();
  const suivant = precedent.catch(() => {}).then(fn);
  verrous.set(adresse, suivant);
  return suivant;
}
const soumettre = (wallet, tx, essais = 4) => avecVerrou(wallet.classicAddress, () => soumettreSeul(wallet, tx, essais));
async function soumettreSeul(wallet, tx, essais) {
  for (let i = 1; ; i++) {
    let signe, dernier;
    try {
      const prep = await client.autofill(tx); dernier = prep.LastLedgerSequence; signe = wallet.sign(prep);
      const r = await client.submitAndWait(signe.tx_blob);
      const code = r.result.meta.TransactionResult;
      if (code !== 'tesSUCCESS') { const e = new Error(code); e.code = code; throw e; }
      return { hash: r.result.hash, meta: r.result.meta };
    } catch (e) {
      if (/^tec/.test(e.message)) throw e;
      if (signe) {
        const sort = await attendre(signe.hash, dernier);
        if (sort === 'tesSUCCESS') { const t = await client.request({ command: 'tx', transaction: signe.hash }); return { hash: signe.hash, meta: t.result.meta }; }
        if (/^tec/.test(sort)) { const err = new Error(sort); err.code = sort; throw err; }
      }
      if (i >= essais) throw e;
      await dormir(2500 * i);
    }
  }
}
async function attendre(hash, dernierRegistre) {
  for (let i = 0; i < 200; i++) {
    try { const r = await client.request({ command: 'tx', transaction: hash }); if (r.result.validated) return r.result.meta.TransactionResult; } catch { /* pas encore */ }
    try { if ((await registre()) > dernierRegistre + 1) return 'expirée'; } catch { /* coupure */ }
    await dormir(1500);
  }
  return 'expirée';
}
// Lots d'un même compte, séquence manuelle ; renvoie [{hash, code}] après vérification, resoumet ce qui a expiré.
const lots = (wallet, txs) => avecVerrou(wallet.classicAddress, async () => { await prendre(); try { return await lotsSeul(wallet, txs); } finally { rendre(); } });
async function lotsSeul(wallet, txs, tour = 1) {
  const hachages = await lotsBrut(wallet, txs);
  const resultats = new Array(txs.length); const restants = [];
  for (let i = 0; i < txs.length; i++) {
    try { const r = await client.request({ command: 'tx', transaction: hachages[i] }); if (r.result.validated) { resultats[i] = { hash: hachages[i], code: r.result.meta.TransactionResult, meta: r.result.meta }; continue; } } catch { /* absente */ }
    restants.push(i);
  }
  if (restants.length && tour < 3) {
    log(`  lot ${wallet.classicAddress.slice(0, 6)} : ${restants.length}/${txs.length} expirées, tour ${tour + 1}`);
    const re = await lotsSeul(wallet, restants.map((i) => txs[i]), tour + 1);
    restants.forEach((i, k) => { resultats[i] = re[k]; });
  }
  for (const i of restants) if (!resultats[i]) resultats[i] = { hash: hachages[i], code: 'expirée' };
  return resultats;
}
async function lotsBrut(wallet, txs) {
  const hachages = [];
  for (let i = 0; i < txs.length; i += TAILLE_LOT) {
    const lot = txs.slice(i, i + TAILLE_LOT);
    let info;
    for (let k = 0; ; k++) { try { info = await client.request({ command: 'account_info', account: wallet.classicAddress, ledger_index: 'current' }); break; } catch (e) { if (k > 4) throw e; await dormir(2000); } }
    let seq = info.result.account_data.Sequence;
    const dernier = (await registre()) + 40;
    const signes = lot.map((tx) => wallet.sign({ ...tx, Account: wallet.classicAddress, Sequence: seq++, LastLedgerSequence: dernier, Fee: tx.Fee ?? '12' }));
    for (const s of signes) {
      try { const r = await client.submit(s.tx_blob); const code = r.result.engine_result; if (!/^(tes|ter)/.test(code)) log('  prélim', wallet.classicAddress.slice(0, 6), code); } catch (e) { log('  submit', e.message); }
      hachages.push(s.hash);
    }
    await attendre(signes.at(-1).hash, dernier);
  }
  return hachages;
}
const solde = async (a) => { try { return Number(await client.getXrpBalance(a)); } catch { return 0; } };
async function lignes(n) { // toutes les trustlines du neurone n
  const out = []; let marker;
  do { const r = await client.request({ command: 'account_lines', account: adr(n), ledger_index: 'validated', limit: 400, marker }); out.push(...r.result.lines); marker = r.result.marker; } while (marker);
  return out;
}
function journal(type, detail, hash) { etat.journal.push({ t: new Date().toISOString(), type, detail, hash }); log(type, detail, hash ? hash.slice(0, 8) + '…' : ''); sauver(); }

// ---- 1. Poser : récepteurs = trustlines, nourries par le milieu ----
async function poser() {
  const mil = Wallet.fromSeed(CLES.milieu);
  const parRecepteur = new Map(); // neurone récepteur → [{mod, pre, rec}]
  for (const mod of Object.keys(MODULATEURS)) {
    const A = aretes(mod); etat.modulateurs[mod] = { aretes: A.length, emetteurs: [...new Set(A.map((a) => a.pre))], recepteurs: [...new Set(A.map((a) => a.post))].length };
    for (const a of A) { if (!parRecepteur.has(a.post)) parRecepteur.set(a.post, []); parRecepteur.get(a.post).push({ mod, ...a }); }
  }
  sauver();
  log(`récepteurs à poser : ${[...parRecepteur.values()].reduce((s, l) => s + l.length, 0)} trustlines sur ${parRecepteur.size} neurones`);
  // Ce qui existe déjà (reprise), puis besoin de réserve par neurone
  const manque = new Map(); const aPoser = new Map();
  await Promise.all([...parRecepteur].map(async ([n, liste]) => {
    const L = await lignes(n); const vues = new Set(L.map((l) => `${l.account}/${l.currency}`));
    const nouvelles = liste.filter((a) => !vues.has(`${adr(a.pre)}/${code(a.mod, a.pre)}`));
    aPoser.set(n, nouvelles);
    const besoin = RESERVE_BASE + RESERVE_OBJ * (L.length + nouvelles.length) + 0.05;
    const s = await solde(adr(n)); if (s < besoin) manque.set(n, besoin - s);
  }));
  const total = [...manque.values()].reduce((a, b) => a + b, 0);
  if (total > 0) {
    log(`nourriture : ${total.toFixed(1)} XRP du milieu pour ${manque.size} neurones`);
    const { hash } = await soumettre(mil, { TransactionType: 'Payment', Account: mil.classicAddress, Destination: wOrg.classicAddress, Amount: xrpToDrops((total + 0.5).toFixed(6)), Memos: [memo('xrplife/food', `${VER} eats ${total.toFixed(1)} XRP to grow modulator receptors`)] });
    journal('mange', `${total.toFixed(1)} XRP pour les récepteurs`, hash);
    await lots(wOrg, [...manque].map(([n, x]) => ({ TransactionType: 'Payment', Destination: adr(n), Amount: xrpToDrops(x.toFixed(6)), Memos: [memo('xrplife/neuron', `${VER} ${n} reserve for receptors`)] })));
  }
  let posees = 0, refus = {};
  await Promise.all([...aPoser].map(async ([n, nouvelles]) => {
    if (!nouvelles.length) return;
    const res = await lots(wN(n), nouvelles.map((a) => ({ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: code(a.mod, a.pre), issuer: adr(a.pre), value: '10' }, Memos: [memo('xrplife/receptor', `${VER} ${n} expresses ${a.rec} for ${a.mod} from ${a.pre} (Bentley 2016)`)] })));
    for (const r of res) { if (r.code === 'tesSUCCESS') posees++; else refus[r.code] = (refus[r.code] ?? 0) + 1; }
  }));
  log(`récepteurs posés : ${posees}, refus ${JSON.stringify(refus)}`);
  // Vérification sur le registre
  let ok = 0, attendu = 0;
  for (const [n, liste] of parRecepteur) { const L = new Set((await lignes(n)).map((l) => `${l.account}/${l.currency}`)); attendu += liste.length; ok += liste.filter((a) => L.has(`${adr(a.pre)}/${code(a.mod, a.pre)}`)).length; }
  const { hash } = await soumettre(wOrg, { TransactionType: 'AccountSet', Account: wOrg.classicAddress, Memos: [memo('xrplife/wireless', `${VER} wireless connectome: ${ok}/${attendu} receptor lines (5HT ${etat.modulateurs['5HT'].aretes}, PDF1 ${etat.modulateurs.PDF1.aretes}) after Bentley et al. 2016`), memo('xrplife/dataset', JSON.stringify(SHA_DONNEES))] });
  etat.recepteurs = { attendu, poses: ok, ancrage: hash }; journal('récepteurs', `${ok}/${attendu} vérifiés sur le registre`, hash);
}

// ---- 2. État : sécrétion et recapture ----
async function secreter(mod, quantite) { // chaque émetteur paie `quantite` à chacun de ses récepteurs
  const A = aretes(mod); const parPre = new Map();
  for (const a of A) { if (!parPre.has(a.pre)) parPre.set(a.pre, []); parPre.get(a.pre).push(a); }
  let ok = 0, refus = {};
  await Promise.all([...parPre].map(async ([pre, liste]) => {
    const res = await lots(wN(pre), liste.map((a) => ({ TransactionType: 'Payment', Destination: adr(a.post), Amount: { currency: code(mod, pre), issuer: adr(pre), value: String(quantite) }, Memos: [memo('xrplife/secretion', `${VER} ${pre} releases ${mod} onto ${a.post} (${a.rec})`)] })));
    for (const r of res) { if (r.code === 'tesSUCCESS') ok++; else refus[r.code] = (refus[r.code] ?? 0) + 1; }
  }));
  journal('sécrétion', `${mod} : ${ok}/${A.length} paiements, refus ${JSON.stringify(refus)}`);
}
async function recapturer(mod) { // chaque récepteur rend tout son solde à l'émetteur (transporteur de recapture)
  const A = aretes(mod); const recepteurs = [...new Set(A.map((a) => a.post))];
  let ok = 0, refus = {}, n0 = 0;
  await Promise.all(recepteurs.map(async (n) => {
    const L = (await lignes(n)).filter((l) => l.currency.startsWith(prefixe(mod)) && Number(l.balance) > 0);
    if (!L.length) return; n0 += L.length;
    const res = await lots(wN(n), L.map((l) => ({ TransactionType: 'Payment', Destination: l.account, Amount: { currency: l.currency, issuer: l.account, value: l.balance }, Memos: [memo('xrplife/reuptake', `${VER} ${n} clears ${mod} back to emitter`)] })));
    for (const r of res) { if (r.code === 'tesSUCCESS') ok++; else refus[r.code] = (refus[r.code] ?? 0) + 1; }
  }));
  journal('recapture', `${mod} : ${ok}/${n0} lignes vidées, refus ${JSON.stringify(refus)}`);
}
// Les gains se lisent sur le registre : pour chaque neurone, fraction des entrées excitatrices
// et inhibitrices actives (solde > 0) ; gain = exp(0,5 × (E − I)) ∈ [0,61 ; 1,65].
async function lireGains(nomEtat) {
  const entrees = new Map(); // neurone → [{mod, pre, rec, signe}]
  for (const mod of Object.keys(MODULATEURS)) for (const a of aretes(mod)) { if (!entrees.has(a.post)) entrees.set(a.post, []); entrees.get(a.post).push({ mod, ...a, signe: SIGNE[a.rec] }); }
  const gains = {}; const actifs = { exc: 0, inh: 0 };
  await dormir(6000); // un registre de plus : les derniers lots doivent être dans le registre validé
  await Promise.all([...entrees].map(async ([n, liste]) => {
    const L = await lignes(n); const solde = new Map(L.map((l) => [`${l.account}/${l.currency}`, Number(l.balance)]));
    let E = 0, I = 0, nE = 0, nI = 0;
    for (const a of liste) { const actif = (solde.get(`${adr(a.pre)}/${code(a.mod, a.pre)}`) ?? 0) > 0; if (a.signe > 0) { nE++; if (actif) E++; } else { nI++; if (actif) I++; } }
    actifs.exc += E; actifs.inh += I;
    gains[n] = { gain: Math.exp(0.5 * ((nE ? E / nE : 0) - (nI ? I / nI : 0))), E, nE, I, nI };
  }));
  const reg = await registre();
  etat.gains[nomEtat] = { registre: reg, actifs, gains };
  const modules = Object.values(gains).filter((g) => g.gain !== 1).length;
  journal('gains', `${nomEtat} : registre ${reg}, ${actifs.exc} entrées excitatrices et ${actifs.inh} inhibitrices actives, ${modules} neurones modulés`);
  return gains;
}
async function mettreEtat(nom) {
  if (nom === 'base') { await recapturer('5HT'); await recapturer('PDF1'); }
  else if (nom === 'repu') { await recapturer('PDF1'); await secreter('5HT', 1); }
  else if (nom === 'affame') { await recapturer('5HT'); await secreter('PDF1', 1); }
  else throw new Error('état inconnu : base | repu | affame');
  const g = await lireGains(nom);
  const { hash } = await soumettre(wOrg, { TransactionType: 'AccountSet', Account: wOrg.classicAddress, Memos: [memo('xrplife/mood', `${VER} state=${nom} ledger=${etat.gains[nom].registre} exc=${etat.gains[nom].actifs.exc} inh=${etat.gains[nom].actifs.inh}`)] });
  journal('humeur', `${nom} ancré`, hash);
  return g;
}

// ---- 3. Influx modulé ----
// Activité a(n) ; un neurone actif répartit a × gain sur ses synapses chimiques au prorata des poids.
// Chaque transfert est un paiement réel dans la monnaie du neurone pré-synaptique.
async function influx(depart, nomEtat) {
  const gains = etat.gains[nomEtat]?.gains ?? (await lireGains(nomEtat));
  const g = (n) => gains[n]?.gain ?? 1;
  const departs = depart.split('+');
  let a = Object.fromEntries(departs.map((d) => [d, 1 / departs.length]));
  const total = {}; const hachages = []; let paiements = 0, refus = {}; const t0 = Date.now();
  const masse = (liste) => liste.reduce((s, n) => s + (total[n] ?? 0), 0);
  for (let saut = 1; saut <= SAUTS; saut++) {
    const suivant = {}; const envois = new Map();
    for (const [src, act] of Object.entries(a)) {
      const L = sortantes.get(src) ?? []; const W = L.reduce((s, x) => s + x.w, 0); if (!W) continue;
      for (const x of L) {
        const q = act * g(src) * x.w / W; if (q < 1e-9) continue;
        suivant[x.cible] = (suivant[x.cible] ?? 0) + q;
        if (!envois.has(src)) envois.set(src, []); envois.get(src).push({ cible: x.cible, q, w: x.w });
      }
    }
    await Promise.all([...envois].map(async ([src, liste]) => {
      const res = await lots(wN(src), liste.map((e) => ({ TransactionType: 'Payment', Destination: adr(e.cible), Amount: { currency: monnaie(src), issuer: adr(src), value: (e.q * 1e-3).toFixed(12).replace(/0+$/, '') }, Memos: [memo('xrplife/spike', `${VER} state=${nomEtat} origin=${depart} hop=${saut} ${src}>${e.cible} w=${e.w} gain=${g(src).toFixed(3)} a=${e.q.toExponential(3)}`)] })));
      res.forEach((r, i) => { hachages.push(r.hash); if (r.code === 'tesSUCCESS') { paiements++; total[liste[i].cible] = (total[liste[i].cible] ?? 0) + liste[i].q; } else refus[r.code] = (refus[r.code] ?? 0) + 1; });
    }));
    a = suivant;
    log(`  ${nomEtat} ${depart} saut ${saut} : ${Object.keys(a).length} neurones actifs, ${paiements} paiements`);
  }
  const avant = masse(COMMANDES.avant), arret = masse(COMMANDES.arret);
  const essai = { etat: nomEtat, depart, sauts: SAUTS, paiements, refus, duree_s: Math.round((Date.now() - t0) / 1000), avant, arret, index_errance: avant / (avant + arret || 1), atteints: Object.keys(total).length, hachages, registre: await registre() };
  etat.essais.push(essai);
  journal('influx', `${nomEtat} depuis ${depart} : ${paiements} paiements, ${essai.atteints} neurones, avant ${avant.toFixed(4)} / arrêt ${arret.toFixed(4)} → index d'errance ${essai.index_errance.toFixed(3)}`);
  return essai;
}

// ---- Nettoyage des lignes de l'essai 1 (monnaies communes « 5HT » et « PDF1 ») ----
async function nettoyer() {
  const anciens = new Set([monnaie('5HT'), monnaie('PDF1')]);
  const neurones = new Set(); for (const mod of Object.keys(MODULATEURS)) for (const a of aretes(mod)) neurones.add(a.post);
  let rendus = 0, fermees = 0;
  await Promise.all([...neurones].map(async (n) => {
    const L = (await lignes(n)).filter((l) => anciens.has(l.currency));
    if (!L.length) return;
    const retours = L.filter((l) => Number(l.balance) > 0).map((l) => ({ TransactionType: 'Payment', Destination: l.account, Amount: { currency: l.currency, issuer: l.account, value: l.balance }, Memos: [memo('xrplife/reuptake', `${VER} ${n} clears trial-1 modulator`)] }));
    if (retours.length) { const r1 = await lots(wN(n), retours); rendus += r1.filter((r) => r.code === 'tesSUCCESS').length; } // `+= await` perdrait des mises à jour en parallèle
    const r2 = await lots(wN(n), L.map((l) => ({ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: l.currency, issuer: l.account, value: '0' }, Memos: [memo('xrplife/receptor', `${VER} ${n} closes trial-1 line (shared currency netted out)`)] }))); fermees += r2.filter((r) => r.code === 'tesSUCCESS').length;
  }));
  journal('nettoyage', `essai 1 : ${rendus} soldes rendus, ${fermees} lignes fermées`);
}

// ---- Programme ----
const [cmd = 'tout', a1, a2] = process.argv.slice(2);
try {
  if (cmd === 'poser') await poser();
  else if (cmd === 'nettoyer') await nettoyer();
  else if (cmd === 'etat') await mettreEtat(a1);
  else if (cmd === 'influx') await influx(a1 ?? 'AWCL+AWCR', a2 ?? 'base');
  else if (cmd === 'tout') {
    if (!etat.recepteurs) await poser();
    const STIMULI = (process.env.STIMULI ?? 'AWCL+AWCR,ALML+ALMR').split(',');
    for (const nom of ['base', 'repu', 'affame']) {
      if (!etat.gains[nom]) await mettreEtat(nom);
      for (const st of STIMULI) if (!etat.essais.some((e) => e.etat === nom && e.depart === st)) await influx(st, nom);
    }
    const { hash } = await soumettre(wOrg, { TransactionType: 'AccountSet', Account: wOrg.classicAddress, Memos: [memo('xrplife/mood-test', JSON.stringify(etat.essais.map((e) => ({ s: e.etat, d: e.depart, i: Number(e.index_errance.toFixed(4)) }))))] });
    journal('fin', 'résultats ancrés', hash);
  }
} finally { sauver(); await client.disconnect(); }
