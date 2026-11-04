// Le troisième L1 du ver : l'immunité innée, avec ses L2 et L3, sur E3 (testnet).
//   L1 (le soi) : 20 cellules intestinales + l'épiderme hyp7 (WormAtlas), chacune un compte ;
//     la membrane = DepositAuth (aucun dépôt non sollicité) ; le soi = la liste des émetteurs
//     pré-autorisés (DepositPreauth) : le milieu, qui émet la nourriture « FOOD ».
//   L2 (l'état) : le solde de nourriture, le solde toxique, les peptides antimicrobiens NLP-29
//     émis par hyp7, la sérotonine d'ADF (le messager vers l'autre L1, Zhang et al. 2005), les ancrages.
//   L3 (les actes) : l'agent de défense : vérifier l'émetteur, expulser, désautoriser, fermer, sécréter.
//   Pathogène : un compte « PA14 » qui émet une monnaie au même code que la nourriture (mimétisme).
//   Test : l'influx depuis AWC/AWB avant et après l'infection ; prédiction : la part qui va au recul
//   augmente après (aversion apprise). Peut échouer.
//   node immun.mjs poser | nourrir | fuite <etiquette> [stimulus] | attaque | defense | tout
import { Wallet, xrpToDrops } from 'xrpl';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stades } from './stades.mjs';
import { monnaie } from './connectome.mjs';
import { client, memo, log, dormir, soumettre, lots, lignes, solde, registre, RESERVE_BASE, RESERVE_OBJ, NO_RIPPLE, compterCodes } from './commun.mjs';

const VER = process.env.VER ?? 'E3';
const SAUTS = Number(process.env.SAUTS ?? 3);
const VIE = JSON.parse(readFileSync(new URL('./vie-etat.json', import.meta.url), 'utf8'));
const CLES_VIE = JSON.parse(readFileSync(new URL('./.cles-vie.json', import.meta.url), 'utf8'));
const ETAT = new URL(`./immun${VER === 'E3' ? '' : '-' + VER}-etat.json`, import.meta.url);
const CLES = new URL(`./.cles-immun${VER === 'E3' ? '' : '-' + VER}.json`, import.meta.url);
const ver = VIE.vers[VER]; const clesVer = CLES_VIE.vers[VER];
const NEURONES = new Set(Object.keys(ver.neurones));
const etat = existsSync(ETAT) ? JSON.parse(readFileSync(ETAT, 'utf8')) : { ver: VER, organisme: ver.adresse, milieu: VIE.milieu.adresse, cellules: {}, pathogene: null, soi: [VIE.milieu.adresse], essais: [], journal: [] };
const cles = existsSync(CLES) ? JSON.parse(readFileSync(CLES, 'utf8')) : { cellules: {}, pathogene: null };
const sauver = () => { writeFileSync(ETAT, JSON.stringify(etat, null, 1)); writeFileSync(CLES, JSON.stringify(cles, null, 1)); chmodSync(CLES, 0o600); };
const sha = (s) => createHash('sha256').update(s).digest('hex');
const wMil = Wallet.fromSeed(CLES_VIE.milieu);
const wOrg = Wallet.fromSeed(clesVer.organisme);
const wN = (n) => Wallet.fromSeed(clesVer.neurones[n]);
const adrN = (n) => ver.neurones[n].adresse;
const wC = (c) => Wallet.fromSeed(cles.cellules[c]);
const adrC = (c) => etat.cellules[c].adresse;

// ---- Les cellules de défense (WormAtlas : int1 = 4 cellules, int2..int9 = 2 chacune ; hyp7 = syncytium) ----
const INTESTIN = ['int1DL', 'int1DR', 'int1VL', 'int1VR', ...[2, 3, 4, 5, 6, 7, 8, 9].flatMap((i) => [`int${i}L`, `int${i}R`])];
const EPIDERME = 'hyp7';
const FOOD = monnaie('FOOD');                 // la nourriture du milieu ; le pathogène émet le MÊME code
const NLP29 = monnaie('NLP29.hyp7');          // peptide antimicrobien de l'épiderme
const SIGNE = { 'mod-1': -1, 'ser-4': -1, 'ser-1': +1, 'ser-5': +1, 'ser-7': +1 };
const nz = (n) => n.replace(/^(DA|DB|DD|VA|VB|VD|AS|VC)(\d)$/, '$10$2');
function aretes5HT() {
  const rows = readFileSync(new URL('./data/bentley2016_monoamines.csv', import.meta.url), 'utf8').trim().split('\n').map((l) => l.split(',').map((x) => x.trim()));
  return rows.filter((r) => r[2] === 'serotonin').map(([pre, post, , rec]) => ({ pre: nz(pre), post: nz(post), rec })).filter((a) => NEURONES.has(a.pre) && NEURONES.has(a.post) && a.pre !== a.post && SIGNE[a.rec] !== undefined);
}
const code5HT = (pre) => monnaie(`5HT.${pre}`);
const stade = stades(ver.sexe)[ver.stade];
const sortantes = new Map();
for (const s of stade.synapses.values()) { if (s.chimique <= 0 || !NEURONES.has(s.source) || !NEURONES.has(s.cible)) continue; if (!sortantes.has(s.source)) sortantes.set(s.source, []); sortantes.get(s.source).push({ cible: s.cible, w: s.chimique }); }
const COMMANDES = { avant: ['AVBL', 'AVBR', 'PVCL', 'PVCR'], recul: ['AVAL', 'AVAR', 'AVDL', 'AVDR', 'AVEL', 'AVER', 'RIML', 'RIMR'] };
function journal(type, detail, hash) { etat.journal.push({ t: new Date().toISOString(), type, detail, hash }); log(type, detail, hash ? hash.slice(0, 8) + '…' : ''); sauver(); }
const ancrer = async (type, obj) => (await soumettre(wOrg, { TransactionType: 'AccountSet', Memos: [memo(type, JSON.stringify(obj))] })).hash;

async function poserRecepteurs() {
  const A = aretes5HT(); const parPost = new Map(); for (const a of A) { if (!parPost.has(a.post)) parPost.set(a.post, []); parPost.get(a.post).push(a); }
  const manque = new Map(); const aPoser = new Map();
  await Promise.all([...parPost].map(async ([n, liste]) => {
    const L = await lignes(adrN(n)); const vues = new Set(L.map((l) => `${l.account}/${l.currency}`));
    const nouvelles = liste.filter((a) => !vues.has(`${adrN(a.pre)}/${code5HT(a.pre)}`)); aPoser.set(n, nouvelles);
    const besoin = RESERVE_BASE + RESERVE_OBJ * (L.length + nouvelles.length) + 0.05; const s = await solde(adrN(n)); if (s < besoin) manque.set(n, besoin - s);
  }));
  const total = [...manque.values()].reduce((a, b) => a + b, 0);
  if (total > 0) {
    const f = await soumettre(wMil, { TransactionType: 'Payment', Destination: wOrg.classicAddress, Amount: xrpToDrops((total + 0.5).toFixed(6)), Memos: [memo('xrplife/feed', `${VER} eats ${total.toFixed(1)} XRP to grow serotonin receptors`)] });
    journal('mange', `${total.toFixed(1)} XRP pour les récepteurs 5HT`, f.hash);
    await lots(wOrg, [...manque].map(([n, x]) => ({ TransactionType: 'Payment', Destination: adrN(n), Amount: xrpToDrops(x.toFixed(6)), Memos: [memo('xrplife/neuron', `${VER} ${n} reserve for receptors`)] })));
  }
  let posees = 0;
  await Promise.all([...aPoser].map(async ([n, nouvelles]) => { if (!nouvelles.length) return; const res = await lots(wN(n), nouvelles.map((a) => ({ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: code5HT(a.pre), issuer: adrN(a.pre), value: '10' }, Memos: [memo('xrplife/receptor', `${VER} ${n} expresses ${a.rec} for 5HT from ${a.pre} (Bentley 2016)`)] }))); posees += res.filter((r) => r.code === 'tesSUCCESS').length; }));
  etat.recepteurs5HT = { aretes: A.length, poses: posees + (etat.recepteurs5HT?.poses ?? 0) };
}

// ---- L1 : poser le soi ----
async function poser() {
  // Comptes des cellules et du pathogène
  for (const c of [...INTESTIN, EPIDERME]) if (!cles.cellules[c]) { const w = Wallet.generate(); cles.cellules[c] = w.seed; etat.cellules[c] = { adresse: w.classicAddress, type: c === EPIDERME ? 'epiderme' : 'intestin', cree: false }; }
  if (!cles.pathogene) { const w = Wallet.generate(); cles.pathogene = w.seed; etat.pathogene = { nom: 'PA14', adresse: w.classicAddress, cree: false }; }
  sauver();
  const besoinInt = RESERVE_BASE + RESERVE_OBJ * 6 + 0.3, besoinHyp = RESERVE_BASE + 0.5, besoinPA = RESERVE_BASE + 0.5;
  // Nourrir l'organisme depuis le milieu, puis créer les cellules
  const aCreer = [...INTESTIN, EPIDERME].filter((c) => !etat.cellules[c].cree);
  if (aCreer.length) {
    const total = aCreer.reduce((s, c) => s + (c === EPIDERME ? besoinHyp : besoinInt), 0) + 1;
    const f = await soumettre(wMil, { TransactionType: 'Payment', Destination: wOrg.classicAddress, Amount: xrpToDrops(total.toFixed(6)), Memos: [memo('xrplife/feed', `${VER} eats ${total.toFixed(1)} XRP to grow intestine and epidermis`)] });
    journal('mange', `${total.toFixed(1)} XRP pour l'intestin et l'épiderme`, f.hash);
    const res = await lots(wOrg, aCreer.map((c) => ({ TransactionType: 'Payment', Destination: adrC(c), Amount: xrpToDrops((c === EPIDERME ? besoinHyp : besoinInt).toFixed(6)), Memos: [memo('xrplife/cell', `${VER} ${c} born (${etat.cellules[c].type}, WormAtlas)`)] })));
    res.forEach((r, i) => { if (r.code === 'tesSUCCESS') etat.cellules[aCreer[i]].cree = true; });
    journal('cellules', `${res.filter((r) => r.code === 'tesSUCCESS').length}/${aCreer.length} créées`);
  }
  if (!etat.pathogene.cree) {
    const r = await soumettre(wMil, { TransactionType: 'Payment', Destination: etat.pathogene.adresse, Amount: xrpToDrops(besoinPA.toFixed(6)), Memos: [memo('xrplife/pathogen', 'PA14 appears in the environment (Pseudomonas aeruginosa, mimics food)')] });
    if (r.code === 'tesSUCCESS') etat.pathogene.cree = true; journal('pathogène', `PA14 ${etat.pathogene.adresse} dans le milieu`, r.hash);
  }
  if (!etat.soi.includes(adrC(EPIDERME))) etat.soi.push(adrC(EPIDERME));   // le soi = le milieu (nourriture) et l'épiderme (peptides)
  // La membrane et le soi : DepositAuth + pré-autorisation du milieu ; nourriture et peptides acceptés
  let codes = {};
  await Promise.all(INTESTIN.map(async (c) => {
    const L = await lignes(adrC(c)); const vues = new Set(L.map((l) => `${l.account}/${l.currency}`));
    const info = await client.request({ command: 'account_info', account: adrC(c) });
    const txs = [];
    if (!(info.result.account_data.Flags & 0x01000000)) txs.push({ TransactionType: 'AccountSet', SetFlag: 9, Memos: [memo('xrplife/membrane', `${c} refuses unsolicited deposits (DepositAuth)`)] });
    if (!etat.cellules[c].soi) txs.push({ TransactionType: 'DepositPreauth', Authorize: wMil.classicAddress, Memos: [memo('xrplife/self', `${c} recognises the environment's food as self`)] });
    if (!etat.cellules[c].soi) txs.push({ TransactionType: 'DepositPreauth', Authorize: adrC(EPIDERME), Memos: [memo('xrplife/self', `${c} recognises its own epidermis as self`)] });
    if (!vues.has(`${wMil.classicAddress}/${FOOD}`)) txs.push({ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: FOOD, issuer: wMil.classicAddress, value: '100' }, Memos: [memo('xrplife/food', `${c} can hold food from the environment`)] });
    if (!vues.has(`${adrC(EPIDERME)}/${NLP29}`)) txs.push({ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: NLP29, issuer: adrC(EPIDERME), value: '10' }, Memos: [memo('xrplife/receptor', `${c} receives antimicrobial peptide NLP-29 from hyp7`)] });
    if (!txs.length) return;
    const res = await lots(wC(c), txs); for (const r of res) codes[r.code] = (codes[r.code] ?? 0) + 1;
    if (res.every((r) => r.code === 'tesSUCCESS' || r.code === 'tecDUPLICATE')) etat.cellules[c].soi = true;
  }));
  journal('soi', `membrane, pré-autorisation du milieu, lignes FOOD et NLP-29 : ${JSON.stringify(codes)}`);
  await poserRecepteurs();
  const h = await ancrer('xrplife/immune-l1', { ver: VER, self: etat.soi, cells: INTESTIN.length + 1, membrane: 'DepositAuth', food: 'FOOD from environment', amp: 'NLP29.hyp7', serotonin_receptor_edges: A.length, dataset: sha(readFileSync(new URL('./data/bentley2016_monoamines.csv', import.meta.url))) });
  etat.ancrages = { ...(etat.ancrages ?? {}), l1: h }; journal('L1 immunitaire', `ancré : ${INTESTIN.length + 1} cellules, soi = milieu, ${A.length} arêtes 5HT`, h);
}

// ---- L2 : nourrir ----
async function nourrir() {
  const res = await lots(wMil, INTESTIN.map((c) => ({ TransactionType: 'Payment', Destination: adrC(c), Amount: { currency: FOOD, issuer: wMil.classicAddress, value: '5' }, Memos: [memo('xrplife/food', `${VER} ${c} eats 5 FOOD (E. coli OP50)`)] })));
  journal('nourriture', `milieu → intestin : ${JSON.stringify(compterCodes(res))}`);
}

// ---- L3 : l'attaque (membrane puis ingestion) ----
async function attaque() {
  const wPA = Wallet.fromSeed(cles.pathogene);
  // 1. Les cellules « voient » la nourriture du pathogène : trustline au même code FOOD, émetteur PA14
  let c1 = {}; await Promise.all(INTESTIN.map(async (c) => { const r = await lots(wC(c), [{ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: FOOD, issuer: wPA.classicAddress, value: '100' }, Memos: [memo('xrplife/food', `${c} sees PA14 as food`)] }]); c1[r[0].code] = (c1[r[0].code] ?? 0) + 1; }));
  journal('mimétisme', `lignes FOOD vers PA14 : ${JSON.stringify(c1)}`);
  // 2. Le pathogène tente d'entrer sans autorisation : la membrane doit refuser (tecNO_PERMISSION)
  const r2 = await lots(wPA, INTESTIN.map((c) => ({ TransactionType: 'Payment', Destination: adrC(c), Amount: { currency: FOOD, issuer: wPA.classicAddress, value: '3' }, Memos: [memo('xrplife/pathogen', `PA14 tries to enter ${c} uninvited`)] })));
  etat.membrane = compterCodes(r2); journal('membrane', `PA14 sans autorisation : ${JSON.stringify(etat.membrane)}`);
  // 3. Ingestion : la cellule naïve pré-autorise ce qui a l'air de nourriture
  let c3 = {}; await Promise.all(INTESTIN.map(async (c) => { const r = await lots(wC(c), [{ TransactionType: 'DepositPreauth', Authorize: wPA.classicAddress, Memos: [memo('xrplife/ingestion', `${c} swallows PA14 (looks like food)`)] }]); c3[r[0].code] = (c3[r[0].code] ?? 0) + 1; }));
  journal('ingestion', `pré-autorisation de PA14 : ${JSON.stringify(c3)}`);
  // 4. Infection
  const r4 = await lots(wPA, INTESTIN.map((c) => ({ TransactionType: 'Payment', Destination: adrC(c), Amount: { currency: FOOD, issuer: wPA.classicAddress, value: '3' }, Memos: [memo('xrplife/infection', `PA14 colonises ${c}`)] })));
  etat.infection = compterCodes(r4);
  const h = await ancrer('xrplife/infection', { ver: VER, pathogen: wPA.classicAddress, membrane_refusals: etat.membrane, colonised: etat.infection, ledger: await registre() });
  etat.ancrages = { ...(etat.ancrages ?? {}), infection: h }; journal('infection', `PA14 dans l'intestin : ${JSON.stringify(etat.infection)}`, h);
}

// ---- L3 : la défense innée, puis le messager vers l'autre L1 ----
async function defense() {
  const wPA = Wallet.fromSeed(cles.pathogene); const soi = new Set(etat.soi);
  let expulses = 0, fermees = 0, toxiques = 0, codes = {};
  await Promise.all(INTESTIN.map(async (c) => {
    const L = (await lignes(adrC(c))).filter((l) => l.currency === FOOD && !soi.has(l.account));   // nourriture d'un émetteur hors du soi
    for (const l of L) {
      const txs = [];
      if (Number(l.balance) > 0) { toxiques++; txs.push({ TransactionType: 'Payment', Destination: l.account, Amount: { currency: FOOD, issuer: l.account, value: l.balance }, Memos: [memo('xrplife/expel', `${c} expels ${l.balance} of PA14`)] }); }
      txs.push({ TransactionType: 'DepositPreauth', Unauthorize: l.account, Memos: [memo('xrplife/immune', `${c} revokes PA14`)] });
      txs.push({ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: FOOD, issuer: l.account, value: '0' }, Memos: [memo('xrplife/immune', `${c} closes the line to PA14`)] });
      const res = await lots(wC(c), txs); for (const r of res) codes[r.code] = (codes[r.code] ?? 0) + 1;
      if (res[0].code === 'tesSUCCESS' && Number(l.balance) > 0) expulses++; if (res.at(-1).code === 'tesSUCCESS') fermees++;
    }
  }));
  journal('défense innée', `${toxiques} cellules infectées, ${expulses} expulsions, ${fermees} lignes fermées, codes ${JSON.stringify(codes)}`);
  const amp = await lots(wC(EPIDERME), INTESTIN.map((c) => ({ TransactionType: 'Payment', Destination: adrC(c), Amount: { currency: NLP29, issuer: adrC(EPIDERME), value: '1' }, Memos: [memo('xrplife/amp', `hyp7 secretes NLP-29 onto ${c}`)] })));
  journal('NLP-29', `épiderme → intestin : ${JSON.stringify(compterCodes(amp))}`);
  const ok = await secreterADF('after infection');
  const h = await ancrer('xrplife/immune-response', { ver: VER, infected_cells: toxiques, expelled: expulses, lines_closed: fermees, nlp29: compterCodes(amp), adf_serotonin: ok, ledger: await registre() });
  etat.ancrages = { ...(etat.ancrages ?? {}), defense: h }; journal('réponse', 'ancrée', h);
}

// Le messager : ADF sécrète la sérotonine (Zhang, Lu & Bargmann 2005)
async function secreterADF(pourquoi) {
  const A = aretes5HT(); const parPre = new Map(); for (const a of A) { if (!parPre.has(a.pre)) parPre.set(a.pre, []); parPre.get(a.pre).push(a); }
  let ok = 0; await Promise.all([...parPre].map(async ([pre, liste]) => { const res = await lots(wN(pre), liste.map((a) => ({ TransactionType: 'Payment', Destination: adrN(a.post), Amount: { currency: code5HT(pre), issuer: adrN(pre), value: '1' }, Memos: [memo('xrplife/secretion', `${VER} ${pre} releases 5HT ${pourquoi} onto ${a.post} (${a.rec})`)] }))); ok += res.filter((r) => r.code === 'tesSUCCESS').length; }));
  journal('sérotonine', `ADF → ${ok}/${A.length} récepteurs (${pourquoi})`);
  return ok;
}

// ---- L2 hérité : l'enfant relit le mémo de son œuf sur le registre ----
async function heriter() {
  const oeuf = ver.evenements.find((e) => e.type === 'œuf');
  if (!oeuf) throw new Error(`${VER} n'a pas d'événement œuf`);
  const t = await client.request({ command: 'tx', transaction: oeuf.hash });
  const memos = ((t.result.tx_json ?? t.result).Memos ?? []).map((m) => Buffer.from(m.Memo.MemoData, 'hex').toString());
  const memoire = memos.join(' ').match(/memory=(.+)$/)?.[1] ?? null;
  journal('héritage', memoire ? `mémo de l'œuf lu sur le registre : « ${memoire} »` : "aucune mémoire dans le mémo de l'œuf", oeuf.hash);
  if (!memoire || !/avoid PA14/.test(memoire)) return;
  await poserRecepteurs();
  const ok = await secreterADF('at birth, inherited avoidance');
  const h = await ancrer('xrplife/inherited-immunity', { ver: VER, memory: memoire, mother: ver.parents[0], egg_tx: oeuf.hash, adf_serotonin: ok, ledger: await registre() });
  etat.ancrages = { ...(etat.ancrages ?? {}), heritage: h }; journal('immunité héritée', 'ancrée', h);
  for (const st of ['AWCL+AWCR', 'AWBL+AWBR']) await fuite('herite', st);
  const h2 = await ancrer('xrplife/immune-test', etat.essais.map((e) => ({ s: e.etat, d: e.depart, i: Number(e.index_fuite.toFixed(4)) })));
  etat.ancrages.test = h2; journal('fin', 'résultats ancrés', h2);
}

// ---- Le comportement : l'influx et la part qui va au recul ----
async function lireGains() {
  const entrees = new Map(); for (const a of aretes5HT()) { if (!entrees.has(a.post)) entrees.set(a.post, []); entrees.get(a.post).push({ ...a, signe: SIGNE[a.rec] }); }
  const gains = {}; await dormir(6000);
  await Promise.all([...entrees].map(async ([n, liste]) => { const L = await lignes(adrN(n)); const b = new Map(L.map((l) => [`${l.account}/${l.currency}`, Number(l.balance)])); let E = 0, I = 0, nE = 0, nI = 0; for (const a of liste) { const actif = (b.get(`${adrN(a.pre)}/${code5HT(a.pre)}`) ?? 0) > 0; if (a.signe > 0) { nE++; if (actif) E++; } else { nI++; if (actif) I++; } } gains[n] = Math.exp(0.5 * ((nE ? E / nE : 0) - (nI ? I / nI : 0))); }));
  return gains;
}
async function fuite(etiquette, depart = 'AWCL+AWCR') {
  const gains = await lireGains(); const g = (n) => gains[n] ?? 1; const modules = Object.values(gains).filter((x) => x !== 1).length;
  const departs = depart.split('+'); let a = Object.fromEntries(departs.map((d) => [d, 1 / departs.length]));
  const total = {}; const hachages = []; let paiements = 0; const refus = {}; const t0 = Date.now();
  for (let saut = 1; saut <= SAUTS; saut++) {
    const suivant = {}; const envois = new Map();
    for (const [src, act] of Object.entries(a)) { const L = sortantes.get(src) ?? []; const W = L.reduce((s, x) => s + x.w, 0); if (!W) continue; for (const x of L) { const q = act * g(src) * x.w / W; if (q < 1e-9) continue; suivant[x.cible] = (suivant[x.cible] ?? 0) + q; if (!envois.has(src)) envois.set(src, []); envois.get(src).push({ cible: x.cible, q, w: x.w }); } }
    await Promise.all([...envois].map(async ([src, liste]) => { const res = await lots(wN(src), liste.map((e) => ({ TransactionType: 'Payment', Destination: adrN(e.cible), Amount: { currency: monnaie(src), issuer: adrN(src), value: (e.q * 1e-3).toFixed(12).replace(/0+$/, '') }, Memos: [memo('xrplife/spike', `${VER} state=${etiquette} origin=${depart} hop=${saut} ${src}>${e.cible} w=${e.w} gain=${g(src).toFixed(3)}`)] }))); res.forEach((r, i) => { hachages.push(r.hash); if (r.code === 'tesSUCCESS') { paiements++; total[liste[i].cible] = (total[liste[i].cible] ?? 0) + liste[i].q; } else refus[r.code] = (refus[r.code] ?? 0) + 1; }); }));
    a = suivant;
  }
  const m = (l) => l.reduce((s, n) => s + (total[n] ?? 0), 0); const avant = m(COMMANDES.avant), recul = m(COMMANDES.recul);
  const essai = { etat: etiquette, depart, sauts: SAUTS, paiements, refus, neurones_modules: modules, duree_s: Math.round((Date.now() - t0) / 1000), avant, recul, index_fuite: recul / (avant + recul || 1), atteints: Object.keys(total).length, hachages, registre: await registre() };
  etat.essais.push(essai); journal('influx', `${etiquette} depuis ${depart} : ${paiements} paiements, ${modules} neurones modulés, avant ${avant.toFixed(4)} / recul ${recul.toFixed(4)} → index de fuite ${essai.index_fuite.toFixed(3)}`);
  return essai;
}

const [cmd = 'tout', a1, a2] = process.argv.slice(2);
try {
  if (cmd === 'poser') await poser();
  else if (cmd === 'nourrir') await nourrir();
  else if (cmd === 'attaque') await attaque();
  else if (cmd === 'defense') await defense();
  else if (cmd === 'fuite') await fuite(a1 ?? 'naif', a2);
  else if (cmd === 'heriter') await heriter();
  else if (cmd === 'tout') {
    const fait = (t) => etat.journal.some((j) => j.type === t);
    if (!etat.ancrages?.l1) await poser();
    if (!fait('nourriture')) await nourrir();
    for (const st of ['AWCL+AWCR', 'AWBL+AWBR']) if (!etat.essais.some((e) => e.etat === 'naif' && e.depart === st)) await fuite('naif', st);
    if (!etat.ancrages?.infection) await attaque();
    if (!etat.ancrages?.defense) await defense();
    for (const st of ['AWCL+AWCR', 'AWBL+AWBR']) if (!etat.essais.some((e) => e.etat === 'infecte' && e.depart === st)) await fuite('infecte', st);
    const h = await ancrer('xrplife/immune-test', etat.essais.map((e) => ({ s: e.etat, d: e.depart, i: Number(e.index_fuite.toFixed(4)) })));
    etat.ancrages.test = h; journal('fin', 'résultats ancrés', h);
  }
} finally { sauver(); await client.disconnect(); }
