// Relit le registre après le cycle : les vivants existent avec leurs synapses, les morts n'existent plus.
import { Client } from 'xrpl';
import { readFileSync } from 'node:fs';
const PREFIXE = process.env.ETAT ?? 'vie';
const etat = JSON.parse(readFileSync(new URL(`./${PREFIXE}-etat.json`, import.meta.url), 'utf8'));
const c = new Client(etat.reseau); await c.connect();
let enVol = 0; const file = [];
const limite = (fn) => new Promise((res, rej) => { const go = async () => { enVol++; try { res(await fn()); } catch (e) { rej(e); } finally { enVol--; const n = file.shift(); if (n) n(); } }; enVol < 8 ? go() : file.push(go); });
const existe = (a) => limite(() => c.request({ command: 'account_info', account: a, ledger_index: 'validated' }).then(() => true, (e) => { if (/actNotFound/.test(e.message) || e.data?.error === 'actNotFound' || /not found/i.test(e.message)) return false; throw e; }));
const lignes = (a) => limite(() => c.request({ command: 'account_lines', account: a, limit: 400 }).then((r) => r.result.lines.filter((l) => Number(l.limit) > 0).length));
console.log(`milieu ${etat.milieu.adresse} : ${await c.getXrpBalance(etat.milieu.adresse)} XRP (robinet ${etat.milieu.robinet}, recyclé ${etat.milieu.recycle.toFixed(1)})`);
for (const [nom, v] of Object.entries(etat.vers)) {
  const adresses = Object.values(v.neurones).map((x) => x.adresse);
  const ex = await Promise.all(adresses.map(existe));
  const vivants = ex.filter(Boolean).length;
  const org = await existe(v.adresse);
  let syn = 0;
  if (!v.mort) syn = (await Promise.all(adresses.filter((_, i) => ex[i]).map(lignes))).reduce((a, b) => a + b, 0);
  const attendu = v.mort ? 'tous supprimés' : `${Object.keys(v.synapses).length} synapses attendues`;
  console.log(`${nom} (${v.sexe}) ${v.mort ? 'MORT' : 'VIVANT'} : organisme ${org ? 'existe' : 'supprimé'}, neurones ${vivants}/${adresses.length} existent, ${v.mort ? '' : syn + ' synapses sur le registre, '}${attendu}`);
}
for (const [nom, v] of Object.entries(etat.vers)) for (const e of v.evenements) if (['parade', 'fécondation', 'œuf', 'mort'].includes(e.type) && /^[0-9A-F]{64}$/.test(e.hash ?? '')) {
  const t = await c.request({ command: 'tx', transaction: e.hash }); const j = t.result.tx_json ?? t.result;
  console.log(`  ${nom} ${e.type.padEnd(11)} ${j.TransactionType.padEnd(13)} ${t.result.meta.TransactionResult} ${e.hash.slice(0, 12)}…`);
}
await c.disconnect();
