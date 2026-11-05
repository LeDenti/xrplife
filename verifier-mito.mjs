// Relit la chaîne 7302 sans le fichier d'état pour les mesures : les paiements « alive » reçus par l'organisme
// (un par neurone et par palier), les génomes des mitochondries (dernier mémo), les soldes ; recompte le seuil.
//   XRPL_WS=ws://127.0.0.1:6006 node verifier-mito.mjs
import { Client } from 'xrpl';
import { readFileSync } from 'node:fs';
const e = JSON.parse(readFileSync(new URL('./mito-etat.json', import.meta.url), 'utf8'));
const c = new Client(process.env.XRPL_WS ?? 'ws://127.0.0.1:6006'); await c.connect();
const txt = (m) => Buffer.from(m.Memo.MemoData, 'hex').toString();
const memosDe = (t) => ((t.tx_json ?? t.tx ?? t).Memos ?? []).map(txt);
// 1. Ancrages
for (const [k, h] of Object.entries(e.ancrages)) { const t = (await c.request({ command: 'tx', transaction: h })).result; console.log(`ancrage ${k.padEnd(10)} ${h.slice(0, 12)} ${t.meta.TransactionResult} | ${memosDe(t).join(' ').slice(0, 140)}`); }
// 2. Les paiements « alive » reçus par l'organisme, par palier, neurones distincts
const vivants = {}; let marker;
do { const r = await c.request({ command: 'account_tx', account: e.organisme, limit: 400, marker, ledger_index_min: -1 }); for (const x of r.result.transactions) { const t = x.tx_json ?? x.tx; if (t.TransactionType !== 'Payment' || t.Destination !== e.organisme || x.meta.TransactionResult !== 'tesSUCCESS') continue; const m = memosDe(x).join(' '); const s = m.match(/^(\S+) step=(\d+) maintained/); if (s) (vivants[s[2]] ??= new Set()).add(s[1]); } marker = r.result.marker; } while (marker);
// 3. Génomes et soldes des mitochondries vivantes (dernier mémo de chaque compte = son génome courant)
let mut = 0, wt = 0, soldeTotal = 0;
const vivantes = Object.entries(e.mitos).filter(([, m]) => m.vivante);
for (const [id, m] of vivantes) {
  const r = await c.request({ command: 'account_tx', account: m.adresse, limit: 100 });
  const genomes = r.result.transactions.map((x) => memosDe(x).join(' ')).map((s) => s.match(/genome[= ](\w+)/)?.[1]).filter(Boolean);
  const g = genomes[0] ?? 'wt'; // account_tx est du plus récent au plus ancien
  if (g === 'mut') mut++; else wt++;
  soldeTotal += Number(await c.getXrpBalance(m.adresse));
}
console.log(`mitochondries vivantes : ${vivantes.length} (génome lu sur la chaîne : ${wt} saines, ${mut} mutées), ATP total ${soldeTotal.toFixed(3)} unités natives`);
console.log('palier | mutées (fichier) | neurones vivants (chaîne) | silencieux (chaîne)');
const N = Object.keys(e.neurones).length;
for (const p of e.paliers) { const v = vivants[String(p.p)]?.size ?? 0; console.log(`${String(p.p).padStart(4)} % | ${(100 * p.part_mutees).toFixed(0).padStart(3)} % | ${String(v).padStart(3)}/${N} | ${String(N - v).padStart(3)} ${N - v === p.silencieux ? '' : '(≠ fichier : ' + p.silencieux + ')'}`); }
await c.disconnect();
