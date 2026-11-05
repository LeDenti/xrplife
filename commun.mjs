// Garde-fous communs pour parler au registre (repris de vie.mjs / humeur.mjs) :
// reconnexion, requêtes en vol bornées, verrou par compte, soumission sûre, lots à séquence manuelle.
import { Client, convertStringToHex } from 'xrpl';
export const RESEAU = process.env.XRPL_WS ?? 'wss://s.altnet.rippletest.net:51233';
export const PARALLELE = Number(process.env.PARALLELE ?? 16);
export const TAILLE_LOT = 8;
export const NO_RIPPLE = 0x00020000;
export const memo = (type, data) => ({ Memo: { MemoType: convertStringToHex(type), MemoData: convertStringToHex(String(data).slice(0, 900)) } });
export const hhmmss = () => new Date().toISOString().slice(11, 19);
export const log = (...a) => console.log(hhmmss(), ...a);
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
export const client = new Client(RESEAU, { timeout: 30000 });
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
export const RESERVE_BASE = si.result.info.validated_ledger.reserve_base_xrp;
export const RESERVE_OBJ = si.result.info.validated_ledger.reserve_inc_xrp;
export const NETWORK_ID = si.result.info.network_id ?? 0;   // > 1024 : chaque transaction doit porter NetworkID (chaîne 7302)
export const registre = () => client.getLedgerIndex();
let enCours = 0; const file = [];
const prendre = () => new Promise((r) => { if (enCours < PARALLELE) { enCours++; r(); } else file.push(r); });
const rendre = () => { enCours--; const r = file.shift(); if (r) { enCours++; r(); } };
const verrous = new Map();
export function avecVerrou(adresse, fn) {
  const precedent = verrous.get(adresse) ?? Promise.resolve();
  const suivant = precedent.catch(() => {}).then(fn);
  verrous.set(adresse, suivant);
  return suivant;
}
// Soumission unitaire : renvoie {hash, code} ; un code tec est renvoyé, pas levé (le registre a répondu).
export const soumettre = (wallet, tx, essais = 4) => avecVerrou(wallet.classicAddress, () => soumettreSeul(wallet, tx, essais));
async function soumettreSeul(wallet, tx, essais) {
  for (let i = 1; ; i++) {
    let signe, dernier;
    try {
      const prep = await client.autofill({ ...tx, Account: wallet.classicAddress, Fee: tx.Fee ?? '12' }); dernier = prep.LastLedgerSequence; signe = wallet.sign(prep); // frais fixes : l'auto-remplissage suivrait le facteur de charge
      const r = await client.submitAndWait(signe.tx_blob);
      return { hash: r.result.hash, code: r.result.meta.TransactionResult, meta: r.result.meta };
    } catch (e) {
      if (signe) {
        const sort = await attendre(signe.hash, dernier);
        if (sort !== 'expirée') { const t = await client.request({ command: 'tx', transaction: signe.hash }); return { hash: signe.hash, code: sort, meta: t.result.meta }; }
      }
      if (i >= essais) throw e;
      await dormir(2500 * i);
    }
  }
}
export async function attendre(hash, dernierRegistre) {
  for (let i = 0; i < 200; i++) {
    try { const r = await client.request({ command: 'tx', transaction: hash }); if (r.result.validated) return r.result.meta.TransactionResult; } catch { /* pas encore */ }
    try { if ((await registre()) > dernierRegistre + 1) return 'expirée'; } catch { /* coupure */ }
    await dormir(1500);
  }
  return 'expirée';
}
export const lots = (wallet, txs) => avecVerrou(wallet.classicAddress, async () => { await prendre(); try { return await lotsSeul(wallet, txs); } finally { rendre(); } });
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
    const signes = lot.map((tx) => wallet.sign({ ...tx, Account: wallet.classicAddress, Sequence: seq++, LastLedgerSequence: dernier, Fee: tx.Fee ?? '12', ...(NETWORK_ID > 1024 ? { NetworkID: NETWORK_ID } : {}) }));
    for (const s of signes) {
      try { const r = await client.submit(s.tx_blob); const code = r.result.engine_result; if (!/^(tes|ter)/.test(code)) log('  prélim', wallet.classicAddress.slice(0, 6), code); } catch (e) { log('  submit', e.message); }
      hachages.push(s.hash);
    }
    await attendre(signes.at(-1).hash, dernier);
  }
  return hachages;
}
export const solde = async (a) => { try { return Number(await client.getXrpBalance(a)); } catch { return 0; } };
export async function lignes(adresse) {
  const out = []; let marker;
  do { const r = await client.request({ command: 'account_lines', account: adresse, ledger_index: 'validated', limit: 400, marker }); out.push(...r.result.lines); marker = r.result.marker; } while (marker);
  return out;
}
export const compte = (code) => Object.values(code ?? {}).reduce((s, x) => s + x, 0);
export const compterCodes = (res) => res.reduce((a, r) => { a[r.code] = (a[r.code] ?? 0) + 1; return a; }, {});
