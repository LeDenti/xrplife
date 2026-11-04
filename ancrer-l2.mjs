// Ancre l'empreinte du dernier registre de la chaîne L2 (l2/dernier-registre.json) sur le testnet
// public, dans un AccountSet de l'organisme E1 : c'est le « sommeil », le règlement périodique L2 → L1.
//   node ancrer-l2.mjs            (lit l2/dernier-registre.json, écrit par le test ou par un cron)
import { Client, Wallet, convertStringToHex } from 'xrpl';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
const VER = process.env.VER ?? 'E1';
const d = JSON.parse(readFileSync(new URL('./l2/dernier-registre.json', import.meta.url), 'utf8'));
const cles = JSON.parse(readFileSync(new URL('./.cles-vie.json', import.meta.url), 'utf8'));
const w = Wallet.fromSeed(cles.vers[VER].organisme);
const c = new Client(process.env.XRPL_WS ?? 'wss://s.altnet.rippletest.net:51233'); await c.connect();
const memo = (t, x) => ({ Memo: { MemoType: convertStringToHex(t), MemoData: convertStringToHex(x) } });
const tx = await c.autofill({ TransactionType: 'AccountSet', Account: w.classicAddress, Memos: [
  memo('xrplife/l2-anchor', JSON.stringify({ network_id: d.network_id, ledger_index: d.ledger_index, ledger_hash: d.ledger_hash, close_time: d.close_time_iso, validator: d.validateur })),
] });
const r = await c.submitAndWait(w.sign(tx).tx_blob);
const j = new URL('./l2/ancrages.json', import.meta.url); const liste = existsSync(j) ? JSON.parse(readFileSync(j, 'utf8')) : [];
liste.push({ t: new Date().toISOString(), l2: d, testnet: { hash: r.result.hash, ledger_index: r.result.ledger_index, code: r.result.meta.TransactionResult } });
writeFileSync(j, JSON.stringify(liste, null, 1));
console.log(`ancrage L2 registre ${d.ledger_index} (${d.ledger_hash.slice(0, 16)}…) → testnet ${r.result.meta.TransactionResult} tx ${r.result.hash} registre ${r.result.ledger_index}`);
await c.disconnect();
