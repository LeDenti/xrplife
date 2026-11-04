// Cycle de vie de vers C. elegans sur le registre XRPL (testnet).
//   milieu      = compte qui tient la nourriture (XRP du robinet) et reçoit ce que la mort rend
//   organisme   = un compte par ver, qui mange (Payment du milieu) et nourrit ses neurones
//   naissance   = la mère (ou le milieu pour les fondateurs) finance un compte « œuf »
//                 qui construit le stade L1 0 h de Witvliet (anneau nerveux)
//   croissance  = les stades suivants : neurones nouveaux (comptes), synapses posées,
//                 renforcées ou élaguées (TrustSet), chaque stade ancré par un AccountSet
//   accouplement= le mâle émet un Check vers l'hermaphrodite, elle l'encaisse
//   ponte       = la mère nourrie pond un œuf ; fécondé par le mâle : sexe tiré au sort
//   mort        = synapses remises à zéro, comptes supprimés (0,2 XRP brûlés chacun),
//                 le reste des XRP revient au milieu
// Relançable : l'état est sauvé après chaque étape et ce qui est fait n'est pas refait.
import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stades } from './stades.mjs';
import { monnaie } from './connectome.mjs';

const RESEAU = process.env.XRPL_WS ?? 'wss://s.altnet.rippletest.net:51233';
const PREFIXE = process.env.ETAT ?? 'vie';                 // vie-etat.json / .cles-vie.json
const MINI = Number(process.env.MINI ?? 0);                 // répétition : ne garder que N neurones
const PARALLELE = Number(process.env.PARALLELE ?? 48);      // comptes qui soumettent en même temps, tous vers confondus
const TAILLE_LOT = 8;                                       // file de rippled par compte
const NO_RIPPLE = 0x00020000;
const ETAT = new URL(`./${PREFIXE}-etat.json`, import.meta.url);
const CLES = new URL(`./.cles-${PREFIXE}.json`, import.meta.url);

const lireJson = (u, def) => (existsSync(u) ? JSON.parse(readFileSync(u, 'utf8')) : def);
const etat = lireJson(ETAT, { reseau: RESEAU, mini: MINI, milieu: null, vers: {}, journal: [] });
const cles = lireJson(CLES, { milieu: null, vers: {} });
const sauver = () => { writeFileSync(ETAT, JSON.stringify(etat, null, 1)); writeFileSync(CLES, JSON.stringify(cles, null, 1)); chmodSync(CLES, 0o600); };
const memo = (type, data) => ({ Memo: { MemoType: convertStringToHex(type), MemoData: convertStringToHex(String(data).slice(0, 900)) } });
const hhmmss = () => new Date().toISOString().slice(11, 19);
const log = (...a) => console.log(hhmmss(), ...a);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => createHash('sha256').update(s).digest('hex');

const client = new Client(RESEAU);
await client.connect();
const si = await client.request({ command: 'server_info' });
const RESERVE_BASE = si.result.info.validated_ledger.reserve_base_xrp;
const RESERVE_OBJ = si.result.info.validated_ledger.reserve_inc_xrp;
const registre = () => client.getLedgerIndex();

// Journal des événements de vie (lisible après coup, et dans le compte rendu).
function ev(ver, type, detail, hash) {
  const e = { t: new Date().toISOString(), type, detail, hash };
  if (ver) { etat.vers[ver].evenements.push(e); } else etat.journal.push(e);
  log(`[${ver ?? 'milieu'}] ${type} ${detail}${hash ? ' ' + hash.slice(0, 8) + '…' : ''}`);
  sauver();
}

// ---- Soumission ----
// Un sémaphore global : au plus PARALLELE comptes soumettent en même temps.
let enCours = 0; const file = [];
const prendre = () => new Promise((r) => { if (enCours < PARALLELE) { enCours++; r(); } else file.push(r); });
const rendre = () => { enCours--; const r = file.shift(); if (r) { enCours++; r(); } };

// Un compte à la fois : deux transactions concurrentes du même compte se voleraient la séquence.
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
    try {
      const prep = await client.autofill(tx);
      const r = await client.submitAndWait(wallet.sign(prep).tx_blob);
      const code = r.result.meta.TransactionResult;
      if (code !== 'tesSUCCESS') { const e = new Error(code); e.code = code; e.meta = r.result.meta; throw e; }
      return { hash: r.result.hash, meta: r.result.meta };
    } catch (e) {
      if (i >= essais || /^tec/.test(e.message)) throw e;
      await dormir(2500 * i);
    }
  }
}

// Attend qu'une transaction (par hash) soit validée, ou que son dernier registre soit passé.
async function attendre(hash, dernierRegistre) {
  for (;;) {
    try { const r = await client.request({ command: 'tx', transaction: hash }); if (r.result.validated) return r.result.meta.TransactionResult; } catch { /* pas encore */ }
    if ((await registre()) > dernierRegistre + 1) return 'expirée';
    await dormir(1500);
  }
}

// Soumet une liste de transactions d'un même compte par lots de TAILLE_LOT avec séquence
// manuelle ; renvoie les hachages. La vérification se fait ensuite sur le registre.
const lots = (wallet, txs) => avecVerrou(wallet.classicAddress, () => lotsSeul(wallet, txs));
async function lotsSeul(wallet, txs) {
  const hachages = [];
  for (let i = 0; i < txs.length; i += TAILLE_LOT) {
    const lot = txs.slice(i, i + TAILLE_LOT);
    let info;
    for (let k = 0; ; k++) {
      try { info = await client.request({ command: 'account_info', account: wallet.classicAddress, ledger_index: 'current' }); break; }
      catch (e) { if (k > 4) throw e; await dormir(2000); }
    }
    let seq = info.result.account_data.Sequence;
    const dernier = (await registre()) + 40;
    const signes = lot.map((tx) => wallet.sign({ ...tx, Account: wallet.classicAddress, Sequence: seq++, LastLedgerSequence: dernier, Fee: tx.Fee ?? '12' }));
    for (const s of signes) {
      try { const r = await client.submit(s.tx_blob); const code = r.result.engine_result; if (!/^(tes|ter)/.test(code)) log('  prélim', wallet.classicAddress.slice(0, 6), code); }
      catch (e) { log('  submit', e.message); }
      hachages.push(s.hash);
    }
    await attendre(signes.at(-1).hash, dernier);
  }
  return hachages;
}

async function solde(adresse) {
  try { return Number(await client.getXrpBalance(adresse)); } catch { return 0; }
}

// ---- Le milieu ----
const milieu = (besoinXrp) => avecVerrou('milieu', () => milieuSeul(besoinXrp));
async function milieuSeul(besoinXrp) {
  let w;
  if (cles.milieu) w = Wallet.fromSeed(cles.milieu);
  else { w = Wallet.generate(); cles.milieu = w.seed; etat.milieu = { adresse: w.classicAddress, robinet: 0, recycle: 0 }; sauver(); ev(null, 'milieu', `créé ${w.classicAddress}`); }
  let s = await solde(w.classicAddress);
  while (s < besoinXrp) {
    const r = await client.fundWallet(w, { amount: '1000' });
    etat.milieu.robinet += 1000; s = Number(r.balance);
    ev(null, 'robinet', `+1000 XRP (total robinet ${etat.milieu.robinet}), milieu ${s.toFixed(1)} XRP`);
  }
  return w;
}

// ---- Les vers ----
const STADES = { herm: stades('herm'), male: stades('male') };
function stadeDe(ver, idx) {
  const s = STADES[etat.vers[ver].sexe][idx];
  if (!MINI) return s;
  // Répétition : les MINI neurones les plus connectés de l'adulte, sous-graphe induit à chaque stade.
  const adulte = STADES[etat.vers[ver].sexe].at(-1);
  const deg = new Map();
  for (const p of adulte.synapses.values()) { deg.set(p.source, (deg.get(p.source) ?? 0) + 1); deg.set(p.cible, (deg.get(p.cible) ?? 0) + 1); }
  const garde = new Set([...deg].sort((a, b) => b[1] - a[1]).slice(0, MINI).map((x) => x[0]));
  const synapses = new Map([...s.synapses].filter(([, p]) => garde.has(p.source) && garde.has(p.cible)));
  const neurones = new Set(); for (const p of synapses.values()) { neurones.add(p.source); neurones.add(p.cible); }
  return { ...s, synapses, neurones };
}
const besoinNeurone = (nbLignes) => RESERVE_BASE + RESERVE_OBJ * nbLignes + 0.5;
const age = (ver) => `${Math.max(0, etat.vers[ver].registreCourant - etat.vers[ver].ne.registre)}h`; // 1 registre = 1 heure de vie

function nouveauVer(nom, sexe, parents) {
  const w = Wallet.generate();
  cles.vers[nom] = { organisme: w.seed, neurones: {} };
  etat.vers[nom] = { sexe, adresse: w.classicAddress, parents, generation: parents.length ? Math.max(...parents.map((p) => etat.vers[p].generation)) + 1 : 0, ne: null, stade: -1, neurones: {}, synapses: {}, evenements: [], mort: null, mange: 0 };
  sauver();
  return w;
}
const walletVer = (nom) => Wallet.fromSeed(cles.vers[nom].organisme);
const walletNeurone = (nom, n) => Wallet.fromSeed(cles.vers[nom].neurones[n]);

// Coût d'un stade pour un ver qui n'existe pas encore (pour dimensionner l'œuf).
function coutStade(sexe, idx) {
  const faux = '__calcul__'; etat.vers[faux] = { sexe }; const s = stadeDe(faux, idx); delete etat.vers[faux];
  const indeg = new Map(); for (const p of s.synapses.values()) indeg.set(p.cible, (indeg.get(p.cible) ?? 0) + 1);
  let total = 0; for (const n of s.neurones) total += besoinNeurone(indeg.get(n) ?? 0);
  return total + 0.000012 * (s.synapses.size + s.neurones.size) + 2;
}

// Nourrit l'organisme depuis le milieu.
async function nourrir(mil, nom, xrp, pourquoi) {
  const v = etat.vers[nom];
  if (xrp <= 0) return;
  await milieu(xrp + 5);
  const { hash } = await soumettre(mil, { TransactionType: 'Payment', Account: mil.classicAddress, Destination: v.adresse, Amount: xrpToDrops(xrp.toFixed(6)), Memos: [memo('xrplife/feed', `${nom} eats ${xrp.toFixed(2)} XRP for ${pourquoi}`)] });
  v.mange += xrp;
  ev(nom, 'mange', `${xrp.toFixed(1)} XRP pour ${pourquoi}`, hash);
}

// Pond un œuf : la mère (ou le milieu) finance le compte de l'enfant.
async function pondre(mil, nom, sexe, parents, pondeuse) {
  if (etat.vers[nom]) return;
  const w = nouveauVer(nom, sexe, parents);
  const cout = coutStade(sexe, 0) + 3;
  let payeur = mil, quoi = 'founder laid by the environment';
  if (pondeuse) { await nourrir(mil, pondeuse, cout + 0.5, `laying egg ${nom}`); payeur = walletVer(pondeuse); quoi = `egg laid by ${pondeuse}${parents.length > 1 ? ' fertilised by ' + parents[1] : ' (self-fertilised)'}`; }
  const { hash } = await soumettre(payeur, { TransactionType: 'Payment', Account: payeur.classicAddress, Destination: w.classicAddress, Amount: xrpToDrops(cout.toFixed(6)), Memos: [memo('xrplife/egg', `${nom} sex=${sexe} gen=${etat.vers[nom].generation} parents=${parents.join('+') || 'none'} ${quoi}`)] });
  const r = await registre();
  etat.vers[nom].ne = { registre: r, date: new Date().toISOString() }; etat.vers[nom].registreCourant = r;
  ev(nom, 'œuf', `${quoi}, ${cout.toFixed(1)} XRP`, hash);
}

// Fait passer le ver au stade idx (construit la différence avec son état actuel).
async function grandir(mil, nom, idx) {
  const v = etat.vers[nom];
  if (v.stade >= idx) return;
  const org = walletVer(nom);
  const s = stadeDe(nom, idx);
  v.registreCourant = await registre();
  log(`[${nom}] → ${s.nom} : ${s.neurones.size} neurones, ${s.synapses.size} synapses (${s.source})`);

  // 1. Différences.
  const indegCible = new Map(); for (const p of s.synapses.values()) indegCible.set(p.cible, (indegCible.get(p.cible) ?? 0) + 1);
  const indegActuel = new Map(); for (const k of Object.keys(v.synapses)) { const c = k.split('>')[1]; indegActuel.set(c, (indegActuel.get(c) ?? 0) + 1); }
  const nouveaux = [...s.neurones].filter((n) => !v.neurones[n]);
  for (const n of nouveaux) { const w = Wallet.generate(); cles.vers[nom].neurones[n] = w.seed; v.neurones[n] = { adresse: w.classicAddress, cree: false, stade: s.nom }; }
  const aPoser = [...s.synapses.values()].filter((p) => v.synapses[`${p.source}>${p.cible}`] !== p.poids);
  const aElaguer = Object.keys(v.synapses).filter((k) => !s.synapses.has(k)).map((k) => { const [source, cible] = k.split('>'); return { source, cible, poids: 0 }; });
  sauver();

  // 2. Nourriture : ce que coûtent les nouveaux comptes et les compléments de réserve.
  const besoins = new Map();
  for (const n of new Set([...s.neurones, ...Object.keys(v.neurones)])) besoins.set(n, besoinNeurone(Math.max(indegActuel.get(n) ?? 0, indegCible.get(n) ?? 0)));
  const soldes = new Map();
  await Promise.all([...besoins.keys()].map(async (n) => soldes.set(n, v.neurones[n].cree ? await solde(v.neurones[n].adresse) : 0)));
  const complements = [...besoins].map(([n, b]) => [n, Math.max(0, b - soldes.get(n))]).filter(([, x]) => x > 0.000001);
  const aManger = complements.reduce((a, [, x]) => a + x, 0) + 0.000012 * (aPoser.length + aElaguer.length + complements.length) + 1;
  const soldeOrg = await solde(org.classicAddress);
  if (soldeOrg < aManger) await nourrir(mil, nom, aManger - soldeOrg + 1, `growing to ${s.nom}`);

  // 3. Les neurones nouveaux et les compléments (paiements de l'organisme, par lots).
  if (complements.length) {
    await lots(org, complements.map(([n, x]) => ({ TransactionType: 'Payment', Destination: v.neurones[n].adresse, Amount: xrpToDrops(x.toFixed(6)), Memos: [memo('xrplife/neuron', `${nom} ${n} ${v.neurones[n].cree ? 'reserve' : 'born'} ${s.nom}`)] })));
    for (const n of nouveaux) {
      for (let k = 0; k < 5 && !v.neurones[n].cree; k++) { if ((await solde(v.neurones[n].adresse)) > 0) v.neurones[n].cree = true; else await dormir(3000); }
      if (!v.neurones[n].cree) throw new Error(`neurone ${n} non créé`);
    }
    sauver();
    log(`[${nom}] ${nouveaux.length} neurones nés, ${complements.length - nouveaux.length} réserves complétées`);
  }

  // 4. Les synapses, posées par le neurone post-synaptique ; puis vérification sur le registre.
  for (let passe = 1; passe <= 4; passe++) {
    const parCible = new Map();
    for (const p of [...aPoser, ...aElaguer]) { if (!parCible.has(p.cible)) parCible.set(p.cible, []); parCible.get(p.cible).push(p); }
    if (!parCible.size) break;
    const total = aPoser.length + aElaguer.length;
    log(`[${nom}] passe ${passe} : ${aPoser.length} synapses à poser, ${aElaguer.length} à élaguer, ${parCible.size} neurones`);
    await Promise.all([...parCible].map(async ([cible, liste]) => {
      await prendre();
      try {
        const w = walletNeurone(nom, cible);
        await lots(w, liste.map((p) => ({ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: monnaie(p.source), issuer: v.neurones[p.source].adresse, value: String(p.poids) }, Memos: [memo('xrplife/synapse', `${nom} ${s.nom} ${p.source}>${p.cible} w=${p.poids}`)] })));
      } catch (e) { log(`[${nom}] ${cible} :`, e.message); } finally { rendre(); }
    }));
    // Vérification : relit les lignes de chaque neurone touché.
    const restePoser = [], resteElaguer = [];
    await Promise.all([...parCible.keys()].map(async (cible) => {
      await prendre();
      try {
        const al = await client.request({ command: 'account_lines', account: v.neurones[cible].adresse, limit: 400 });
        const vues = new Map(al.result.lines.map((l) => [`${l.account}/${l.currency}`, Number(l.limit)]));
        for (const p of parCible.get(cible)) {
          const lim = vues.get(`${v.neurones[p.source].adresse}/${monnaie(p.source)}`) ?? 0;
          const k = `${p.source}>${p.cible}`;
          if (lim === p.poids) { if (p.poids) v.synapses[k] = p.poids; else delete v.synapses[k]; }
          else (p.poids ? restePoser : resteElaguer).push(p);
        }
      } finally { rendre(); }
    }));
    aPoser.length = 0; aPoser.push(...restePoser); aElaguer.length = 0; aElaguer.push(...resteElaguer);
    sauver();
    log(`[${nom}] passe ${passe} : ${total - aPoser.length - aElaguer.length}/${total} confirmées`);
    if (aPoser.length + aElaguer.length) await dormir(4000);
  }
  if (aPoser.length + aElaguer.length) throw new Error(`[${nom}] ${aPoser.length + aElaguer.length} synapses non confirmées au stade ${s.nom}`);

  // 5. Le stade est ancré par l'organisme.
  v.registreCourant = await registre();
  const { hash } = await soumettre(org, { TransactionType: 'AccountSet', Account: org.classicAddress, Memos: [
    memo('xrplife/stage', `${nom} sex=${v.sexe} stage=${s.nom} age=${age(nom)} neurons=${Object.keys(v.neurones).length} synapses=${Object.keys(v.synapses).length} eaten=${v.mange.toFixed(1)}XRP`),
    memo('xrplife/dataset', `${s.source} ${s.fichier} sha256=${s.sha256}`)] });
  v.stade = idx;
  ev(nom, 'stade', `${s.nom} atteint : ${Object.keys(v.neurones).length} neurones, ${Object.keys(v.synapses).length} synapses, âge ${age(nom)}, mangé ${v.mange.toFixed(1)} XRP`, hash);
}

// Accouplement : le mâle propose (Check), l'hermaphrodite accepte (CheckCash).
async function accoupler(male, herm) {
  const m = etat.vers[male]; const h = etat.vers[herm];
  if (h.evenements.some((e) => e.type === 'fécondation' && e.detail.includes(male))) return;
  const genome = STADES.male.at(-1).sha256;
  const wm = walletVer(male), wh = walletVer(herm);
  const c = await soumettre(wm, { TransactionType: 'CheckCreate', Account: wm.classicAddress, Destination: wh.classicAddress, SendMax: xrpToDrops('1'), Memos: [memo('xrplife/mating', `${male} courts ${herm} genome=${genome}`)] });
  const checkId = c.meta.AffectedNodes.find((n) => n.CreatedNode?.LedgerEntryType === 'Check').CreatedNode.LedgerIndex;
  ev(male, 'parade', `Check vers ${herm} (${checkId.slice(0, 8)}…)`, c.hash);
  const f = await soumettre(wh, { TransactionType: 'CheckCash', Account: wh.classicAddress, CheckID: checkId, Amount: xrpToDrops('1'), Memos: [memo('xrplife/fertilisation', `${herm} accepts ${male}`)] });
  ev(herm, 'fécondation', `Check de ${male} encaissé`, f.hash);
  h.fecondeePar = male; sauver();
}

// Mort : synapses à zéro, comptes supprimés vers le milieu.
async function mourir(mil, nom) {
  const v = etat.vers[nom];
  if (v.mort) return;
  v.registreCourant = await registre();
  const avant = await solde(mil.classicAddress);
  // 1. Les synapses s'effacent (chaque neurone remet à zéro les lignes qu'il porte).
  for (let passe = 1; passe <= 4; passe++) {
    const parCible = new Map();
    for (const k of Object.keys(v.synapses)) { const [source, cible] = k.split('>'); if (!parCible.has(cible)) parCible.set(cible, []); parCible.get(cible).push({ source, cible }); }
    if (!parCible.size) break;
    log(`[${nom}] mort, passe ${passe} : ${Object.keys(v.synapses).length} synapses à effacer`);
    await Promise.all([...parCible].map(async ([cible, liste]) => {
      await prendre();
      try {
        await lots(walletNeurone(nom, cible), liste.map((p) => ({ TransactionType: 'TrustSet', Flags: NO_RIPPLE, LimitAmount: { currency: monnaie(p.source), issuer: v.neurones[p.source].adresse, value: '0' }, Memos: [memo('xrplife/synapse', `${nom} dies ${p.source}>${p.cible} w=0`)] })));
        const al = await client.request({ command: 'account_lines', account: v.neurones[cible].adresse, limit: 400 });
        const restantes = new Set(al.result.lines.filter((l) => Number(l.limit) > 0).map((l) => `${l.account}/${l.currency}`));
        for (const p of liste) if (!restantes.has(`${v.neurones[p.source].adresse}/${monnaie(p.source)}`)) delete v.synapses[`${p.source}>${p.cible}`];
      } catch (e) { log(`[${nom}] ${cible} :`, e.message); } finally { rendre(); }
    }));
    sauver();
  }
  if (Object.keys(v.synapses).length) throw new Error(`[${nom}] ${Object.keys(v.synapses).length} synapses résistent`);
  // 2. Les neurones meurent : AccountDelete vers le milieu (0,2 XRP brûlés chacun).
  //    Un compte ne peut être supprimé que 256 registres après sa création : on attend s'il le faut.
  const fee = xrpToDrops(String(RESERVE_OBJ));
  const supprimer = async (w, quoi) => {
    for (let k = 0; k < 40; k++) {
      try {
        const info = await client.request({ command: 'account_info', account: w.classicAddress, ledger_index: 'validated' });
        const attendu = info.result.account_data.Sequence + 256; const r = await registre();
        if (r <= attendu) { await dormir((attendu - r + 2) * 3500); }
        const prep = await client.autofill({ TransactionType: 'AccountDelete', Account: w.classicAddress, Destination: mil.classicAddress, Fee: fee, Memos: [memo('xrplife/death', `${nom} ${quoi} dies, remains return to the environment`)] });
        const res = await client.submitAndWait(w.sign(prep).tx_blob);
        const code = res.result.meta.TransactionResult;
        if (code === 'tesSUCCESS') return res.result.hash;
        if (code === 'tecTOO_SOON') { await dormir(20000); continue; }
        throw new Error(code);
      } catch (e) { if (/actNotFound/.test(e.message)) return 'déjà supprimé'; if (k >= 39 || /^tec(?!TOO_SOON)/.test(e.message)) throw e; await dormir(5000); }
    }
  };
  const neurones = Object.entries(v.neurones).filter(([, x]) => x.cree && !x.mort);
  log(`[${nom}] mort : ${neurones.length} neurones à supprimer`);
  let faits = 0;
  await Promise.all(neurones.map(async ([n]) => {
    await prendre();
    try { const h = await supprimer(walletNeurone(nom, n), n); v.neurones[n].mort = h; if (++faits % 50 === 0) { sauver(); log(`[${nom}] ${faits}/${neurones.length} neurones supprimés`); } }
    catch (e) { log(`[${nom}] ${n} :`, e.message); } finally { rendre(); }
  }));
  sauver();
  const restants = Object.entries(v.neurones).filter(([, x]) => x.cree && !x.mort);
  if (restants.length) throw new Error(`[${nom}] ${restants.length} neurones non supprimés`);
  const h = await supprimer(walletVer(nom), 'organism');
  const apres = await solde(mil.classicAddress);
  v.mort = { date: new Date().toISOString(), registre: await registre(), hash: h, rendu: apres - avant, brule: RESERVE_OBJ * (neurones.length + 1) };
  etat.milieu.recycle += v.mort.rendu;
  ev(nom, 'mort', `âge ${age(nom)}, ${neurones.length} neurones supprimés, ${v.mort.rendu.toFixed(1)} XRP rendus au milieu, ${v.mort.brule.toFixed(1)} brûlés`, h);
}

// ---- Le cycle ----
async function cycle() {
  const mil = await milieu(50);
  const fondateurs = [['V1', 'herm'], ['V2', 'herm'], ['V3', 'herm'], ['V4', 'male']];
  // Naissance et croissance des quatre fondateurs, en parallèle.
  await Promise.all(fondateurs.map(async ([nom, sexe]) => {
    await pondre(mil, nom, sexe, [], null);
    for (let i = 0; i < STADES[sexe].length; i++) await grandir(mil, nom, i);
  }));
  // Accouplement : V4 courtise V1.
  await accoupler('V4', 'V1');
  // Ponte : V1 fécondée pond deux œufs (le croisement double la ponte), V2 et V3 s'autofécondent.
  const sexeTire = (nom) => (parseInt(sha(etat.vers.V1.adresse + etat.vers.V4.adresse + nom).slice(0, 2), 16) % 2 ? 'male' : 'herm');
  const pontes = [['E1', sexeTire('E1'), ['V1', 'V4'], 'V1'], ['E2', sexeTire('E2'), ['V1', 'V4'], 'V1'], ['E3', 'herm', ['V2'], 'V2'], ['E4', 'herm', ['V3'], 'V3']];
  for (const [nom, sexe, parents, mere] of pontes) await pondre(mil, nom, sexe, parents, mere); // une mère pond l'un après l'autre
  await Promise.all(pontes.map(([nom]) => grandir(mil, nom, 0)));            // les enfants naissent (L1 0 h) et restent vivants
  // Mort des fondateurs, en parallèle ; leurs XRP reviennent au milieu.
  await Promise.all(fondateurs.map(([nom]) => mourir(mil, nom)));
  ev(null, 'fin', `milieu ${(await solde(mil.classicAddress)).toFixed(1)} XRP, robinet ${etat.milieu.robinet} XRP, recyclé ${etat.milieu.recycle.toFixed(1)} XRP`);
}

try { await cycle(); } finally { sauver(); await client.disconnect(); }
log('fini');
