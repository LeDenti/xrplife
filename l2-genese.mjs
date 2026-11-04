// Après `./l2/lancer.sh genese` : vide le compte de genèse (phrase secrète publique) vers le trésor
// et le neutralise (clé régulière = trou noir, clé maître désactivée). À faire une seule fois.
import { Client, Wallet } from 'xrpl';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const c = new Client(process.env.L2_WS ?? 'ws://127.0.0.1:6006'); await c.connect();
const gen = Wallet.fromSeed('snoPBrXtMeMyMHUVTgbuqAfg1SUTb');
const p = new URL('./l2/cles/tresor.json', import.meta.url);
const t = existsSync(p) ? Wallet.fromSeed(JSON.parse(readFileSync(p, 'utf8')).seed) : Wallet.generate();
if (!existsSync(p)) writeFileSync(p, JSON.stringify({ adresse: t.classicAddress, seed: t.seed }), { mode: 0o600 });
const env = async (w, tx, label) => { const r = await c.submitAndWait(w.sign(await c.autofill(tx)).tx_blob); console.log(label, r.result.meta.TransactionResult, r.result.hash.slice(0, 12)); };
const bal = Number((await c.request({ command: 'account_info', account: gen.classicAddress })).result.account_data.Balance);
await env(gen, { TransactionType: 'Payment', Account: gen.classicAddress, Destination: t.classicAddress, Amount: String(bal - 100e6) }, `trésor ${t.classicAddress} reçoit ${((bal - 100e6) / 1e6).toLocaleString('fr')} XRP :`);
await env(gen, { TransactionType: 'SetRegularKey', Account: gen.classicAddress, RegularKey: 'rrrrrrrrrrrrrrrrrrrrBZbvji' }, 'genèse : clé régulière → trou noir :');
await env(gen, { TransactionType: 'AccountSet', Account: gen.classicAddress, SetFlag: 4 }, 'genèse : clé maître désactivée :');
await c.disconnect();
