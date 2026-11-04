// Relit le registre : ancrages du L1 immunitaire, membrane (DepositAuth) sur chaque cellule, pré-autorisations,
// absence de ligne vers PA14 après la défense, NLP-29 reçu, sérotonine d'ADF active, échantillon d'influx.
//   VER=E3 node verifier-immun.mjs   (VER=E5 pour l'enfant)
import { Client } from 'xrpl';
import { readFileSync } from 'node:fs';
const VER = process.env.VER ?? 'E3';
const e = JSON.parse(readFileSync(new URL(`./immun${VER === 'E3' ? '' : '-' + VER}-etat.json`, import.meta.url), 'utf8'));
const vie = JSON.parse(readFileSync(new URL('./vie-etat.json', import.meta.url), 'utf8')); const ver = vie.vers[VER];
const c = new Client('wss://s.altnet.rippletest.net:51233'); await c.connect();
const hexs = (s) => Buffer.from(s, 'ascii').toString('hex').toUpperCase();
const lire = async (h) => { try { return (await c.request({ command: 'tx', transaction: h })).result; } catch { return null; } };
const memoDe = (t) => ((t?.tx_json ?? t)?.Memos ?? []).map((m) => Buffer.from(m.Memo.MemoData, 'hex').toString()).join(' | ');
for (const [k, h] of Object.entries(e.ancrages ?? {})) { const t = await lire(h); console.log(`ancrage ${k.padEnd(9)} ${h.slice(0, 12)} ${t?.meta?.TransactionResult} | ${memoDe(t).slice(0, 150)}`); }
let membrane = 0, preauthMilieu = 0, lignesPA = 0, nlp = 0, food = 0;
const PA = e.pathogene?.adresse;
for (const [nom, cel] of Object.entries(e.cellules)) {
  if (cel.type !== 'intestin') continue;
  const ai = await c.request({ command: 'account_info', account: cel.adresse }); if (ai.result.account_data.Flags & 0x01000000) membrane++;
  const ao = await c.request({ command: 'account_objects', account: cel.adresse, type: 'deposit_preauth' }); if (ao.result.account_objects.some((o) => o.Authorize === e.milieu)) preauthMilieu++; if (ao.result.account_objects.some((o) => o.Authorize === PA)) lignesPA += 1000;
  const L = (await c.request({ command: 'account_lines', account: cel.adresse })).result.lines;
  if (L.some((l) => l.account === PA)) lignesPA++;
  if (L.some((l) => l.currency === hexs('NLP29.hyp7').padEnd(40, '0') && Number(l.balance) >= 1)) nlp++;
  if (L.some((l) => l.currency === hexs('FOOD').padEnd(40, '0') && l.account === e.milieu && Number(l.balance) >= 5)) food++;
}
if (PA) console.log(`cellules intestinales : membrane DepositAuth ${membrane}/20, milieu pré-autorisé ${preauthMilieu}/20, nourriture ≥ 5 : ${food}/20, NLP-29 reçu : ${nlp}/20, lignes ou pré-autorisations vers PA14 restantes : ${lignesPA} (attendu 0)`);
let actifs = 0, lignes5 = 0;
for (const n of Object.keys(ver.neurones)) { const L = (await c.request({ command: 'account_lines', account: ver.neurones[n].adresse })).result.lines; for (const l of L) if (l.currency.startsWith(hexs('5HT.')) && Number(l.limit) > 0) { lignes5++; if (Number(l.balance) > 0) actifs++; } } // côté récepteur seulement (limite > 0)
console.log(`sérotonine : ${lignes5} lignes de récepteurs sur ${VER}, ${actifs} actives (solde > 0)`);
for (const s of e.essais) { const ech = s.hachages.filter((_, i) => i % Math.ceil(s.hachages.length / 10) === 0); let ok = 0; for (const h of ech) if ((await lire(h))?.meta?.TransactionResult === 'tesSUCCESS') ok++; console.log(`${s.etat.padEnd(8)} ${s.depart.padEnd(10)} ${ok}/${ech.length} paiements vérifiés, index de fuite ${s.index_fuite.toFixed(3)}`); }
await c.disconnect();
