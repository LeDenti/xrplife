// Rédige CYCLE.md (ou <prefixe>-CYCLE.md) à partir de l'état du cycle de vie.
import { readFileSync, writeFileSync } from 'node:fs';
const PREFIXE = process.env.ETAT ?? 'vie';
const etat = JSON.parse(readFileSync(new URL(`./${PREFIXE}-etat.json`, import.meta.url), 'utf8'));
const explorateur = (h) => `[${h.slice(0, 8)}…](https://testnet.xrpl.org/transactions/${h})`;
const compte = (a) => `[${a.slice(0, 8)}…](https://testnet.xrpl.org/accounts/${a})`;
const f1 = (x) => (Math.round(x * 10) / 10).toLocaleString('fr-FR');
const L = [];
L.push(`# Cycle de vie de ${Object.keys(etat.vers).length} vers sur le registre XRPL (testnet)`, '');
L.push(`Généré le ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC depuis \`${PREFIXE}-etat.json\`.${etat.mini ? ` **Répétition à ${etat.mini} neurones par ver.**` : ''}`, '');
L.push(`Milieu : ${compte(etat.milieu.adresse)} — tiré du robinet : ${f1(etat.milieu.robinet)} XRP, rendu par les morts : ${f1(etat.milieu.recycle)} XRP.`, '');
L.push('| ver | sexe | gén. | parents | né (registre) | dernier stade | neurones | synapses | mangé (XRP) | mort |', '|---|---|---|---|---|---|---|---|---|---|');
for (const [nom, v] of Object.entries(etat.vers)) {
  const stade = v.evenements.filter((e) => e.type === 'stade').at(-1)?.detail.split(' atteint')[0] ?? '—';
  const mort = v.mort ? `oui, ${f1(v.mort.rendu)} XRP rendus, ${f1(v.mort.brule)} brûlés` : 'vivant';
  L.push(`| ${nom} ${compte(v.adresse)} | ${v.sexe === 'male' ? 'mâle' : 'hermaphrodite'} | ${v.generation} | ${v.parents.join(' + ') || 'milieu'} | ${v.ne?.registre ?? '—'} | ${stade} | ${Object.keys(v.neurones).length} | ${Object.keys(v.synapses).length} | ${f1(v.mange)} | ${mort} |`);
}
L.push('');
for (const [nom, v] of Object.entries(etat.vers)) {
  L.push(`## ${nom} (${v.sexe === 'male' ? 'mâle' : 'hermaphrodite'})`, '');
  for (const e of v.evenements) L.push(`- ${e.t.slice(11, 19)} **${e.type}** ${e.detail}${e.hash && /^[0-9A-F]{64}$/.test(e.hash) ? ' ' + explorateur(e.hash) : ''}`);
  L.push('');
}
L.push('## Journal du milieu', '');
for (const e of etat.journal) L.push(`- ${e.t.slice(11, 19)} **${e.type}** ${e.detail}`);
L.push('', '## Ce qui est mesuré, ce qui est inventé', '',
  '- **Mesuré** : les connectomes de chaque stade (Witvliet et al. 2021 pour la croissance de l\'anneau nerveux, Cook et al. 2019 pour les adultes hermaphrodite et mâle), la réserve XRPL qui fait office de nourriture, les codes de refus du registre.',
  '- **Inventé, et assumé** : l\'horloge (un registre = une heure de vie), un à deux descendants par mère au lieu de 300, aucune variation génétique (chaque enfant reçoit le connectome de l\'espèce), les larves mâles qui suivent les stades mesurés sur des hermaphrodites jusqu\'à L3, le passage de l\'anneau nerveux (Witvliet) au corps entier (Cook) qui joint deux animaux différents.', '');
const sortie = new URL(`./${PREFIXE === 'vie' ? '' : PREFIXE + '-'}CYCLE.md`, import.meta.url);
writeFileSync(sortie, L.join('\n'));
console.log('écrit', sortie.pathname);
