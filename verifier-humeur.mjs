// Relit le registre : ancrages, trustlines de récepteurs, soldes par humeur (dernier état), échantillon d'influx.
import { Client } from 'xrpl';
import { readFileSync } from 'node:fs';
const e = JSON.parse(readFileSync(new URL('./humeur-etat.json', import.meta.url), 'utf8'));
const vie = JSON.parse(readFileSync(new URL('./vie-etat.json', import.meta.url), 'utf8'));
const ver = vie.vers[e.ver];
const c = new Client('wss://s.altnet.rippletest.net:51233'); await c.connect();
const hexs = (s) => Buffer.from(s, 'ascii').toString('hex').toUpperCase();
const lire = async (h) => { try { const r = await c.request({ command: 'tx', transaction: h }); return r.result; } catch { return null; } };
const memoDe = (t) => ((t?.tx_json ?? t)?.Memos ?? []).map((m) => Buffer.from(m.Memo.MemoData, 'hex').toString()).join(' | ');
console.log('ancrage récepteurs', e.recepteurs.ancrage.slice(0, 12), (await lire(e.recepteurs.ancrage))?.meta?.TransactionResult, '|', memoDe(await lire(e.recepteurs.ancrage)).slice(0, 120));
for (const j of e.journal.filter((j) => j.type === 'humeur' || j.type === 'fin')) { const t = await lire(j.hash); console.log(j.type.padEnd(7), j.hash.slice(0, 12), t?.meta?.TransactionResult, '|', memoDe(t).slice(0, 160)); }
// Trustlines de récepteurs : recompte sur le registre
let lignes5 = 0, lignesP = 0, actifsP = 0;
for (const n of Object.keys(ver.neurones)) {
  let L = [], m; do { const r = await c.request({ command: 'account_lines', account: ver.neurones[n].adresse, limit: 400, marker: m }); L.push(...r.result.lines); m = r.result.marker; } while (m);
  for (const l of L) { if (l.currency.startsWith(hexs('5HT.')) && Number(l.limit) > 0) lignes5++; if (l.currency.startsWith(hexs('PDF1.')) && Number(l.limit) > 0) { lignesP++; if (Number(l.balance) > 0) actifsP++; } }
}
console.log(`récepteurs sur le registre : 5HT ${lignes5} lignes (${e.modulateurs['5HT'].aretes} arêtes, doublons de récepteur partagent une ligne), PDF1 ${lignesP} lignes (${e.modulateurs.PDF1.aretes} arêtes), PDF1 actives maintenant ${actifsP} (dernier état : affamé)`);
// Échantillon d'influx : 10 paiements par essai
for (const s of e.essais) {
  const ech = s.hachages.filter((_, i) => i % Math.ceil(s.hachages.length / 10) === 0);
  let ok = 0; const memos = [];
  for (const h of ech) { const t = await lire(h); if (t?.meta?.TransactionResult === 'tesSUCCESS') ok++; if (memos.length < 1) memos.push(memoDe(t)); }
  console.log(`${s.etat.padEnd(7)} ${s.depart.padEnd(10)} ${ok}/${ech.length} paiements vérifiés | ${memos[0]?.slice(0, 110)}`);
}
await c.disconnect();
