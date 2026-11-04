// Compte rendu du L1 immunitaire : immun-etat.json → IMMUN.md
import { readFileSync, writeFileSync } from 'node:fs';
const e = JSON.parse(readFileSync(new URL('./immun-etat.json', import.meta.url), 'utf8'));
const X = 'https://testnet.xrpl.org'; const tx = (h) => (h ? `[${h.slice(0, 8)}…](${X}/transactions/${h})` : '—');
const L = [];
L.push(`# Le L1 immunitaire du ver ${e.ver} sur le registre XRPL (testnet)`, '', `Généré le ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC depuis \`immun-etat.json\`. Organisme [${e.organisme.slice(0, 8)}…](${X}/accounts/${e.organisme}) ; pathogène PA14 [${e.pathogene?.adresse?.slice(0, 8)}…](${X}/accounts/${e.pathogene?.adresse}).`, '');
L.push('## L1 : le soi', '', `- ${Object.values(e.cellules).filter((c) => c.type === 'intestin').length} cellules intestinales et 1 épiderme (hyp7), un compte chacune (noms WormAtlas).`, `- Membrane : \`DepositAuth\` sur chaque cellule intestinale ; soi = émetteurs pré-autorisés : le milieu (nourriture « FOOD ») et hyp7 (peptide NLP-29).`, `- Récepteurs de la sérotonine sur les neurones : ${e.recepteurs5HT?.poses ?? '—'} lignes pour ${e.recepteurs5HT?.aretes ?? '—'} arêtes (Bentley 2016).`, `- Ancrage ${tx(e.ancrages?.l1)}.`, '');
L.push('## L3 : l\'attaque et la défense (mesuré)', '', '| étape | résultat | ancrage |', '|---|---|---|');
L.push(`| PA14 tente d'entrer sans autorisation | ${JSON.stringify(e.membrane ?? {})} | |`);
L.push(`| les cellules naïves pré-autorisent ce qui ressemble à la nourriture, PA14 colonise | ${JSON.stringify(e.infection ?? {})} | ${tx(e.ancrages?.infection)} |`);
const d = e.journal.find((j) => j.type === 'défense innée'); const n = e.journal.find((j) => j.type === 'NLP-29'); const s = e.journal.find((j) => j.type === 'sérotonine');
L.push(`| défense innée : expulsion, désautorisation, fermeture | ${d?.detail ?? '—'} | ${tx(e.ancrages?.defense)} |`, `| NLP-29 de l'épiderme vers l'intestin | ${n?.detail ?? '—'} | |`, `| ADF sécrète la sérotonine (messager vers le L1 nerveux) | ${s?.detail ?? '—'} | |`, '');
L.push('## Le comportement : même stimulus, avant et après l\'infection', '', '| état | stimulus | paiements | neurones modulés | activité → avant (AVB, PVC) | → recul (AVA, AVD, AVE, RIM) | index de fuite | durée |', '|---|---|---|---|---|---|---|---|');
for (const x of e.essais) L.push(`| ${x.etat} | ${x.depart} | ${x.paiements}${Object.keys(x.refus).length ? ' (refus ' + JSON.stringify(x.refus) + ')' : ''} | ${x.neurones_modules} | ${x.avant.toFixed(4)} | ${x.recul.toFixed(4)} | **${x.index_fuite.toFixed(3)}** | ${x.duree_s} s |`);
const par = {}; for (const x of e.essais) (par[x.depart] ??= {})[x.etat] = x.index_fuite;
L.push('', 'Index de fuite = activité arrivée aux commandes de recul / (avant + recul). Prédiction (Zhang, Lu & Bargmann 2005) : la fuite augmente après l\'infection, par la sérotonine d\'ADF.', '', '| stimulus | naïf | infecté | écart | prédiction tenue ? (seuil 0,01) |', '|---|---|---|---|---|');
for (const [dep, v] of Object.entries(par)) { const ec = v.naif !== undefined && v.infecte !== undefined ? v.infecte - v.naif : null; L.push(`| ${dep} | ${v.naif?.toFixed(3) ?? '—'} | ${v.infecte?.toFixed(3) ?? '—'} | ${ec === null ? '—' : ec.toFixed(4)} | ${ec === null ? '—' : Math.abs(ec) < 0.01 ? 'NON : égal' : ec > 0 ? 'oui' : 'NON : sens inverse'} |`); }
try {
  const h = JSON.parse(readFileSync(new URL('./immun-E5-etat.json', import.meta.url), 'utf8'));
  L.push('', '## La mémoire héritée : E5, fille de E3', '', `E3 infectée a pondu E5 ; l'œuf porte le mémo \`memory=avoid PA14 gen 1/4\`. À sa naissance, E5 a relu ce mémo sur le registre (${h.journal.find((j) => j.type === 'héritage')?.detail ?? ''}), posé ses récepteurs et sécrété la sérotonine d'ADF sans avoir jamais rencontré PA14 (${h.journal.find((j) => j.type === 'sérotonine')?.detail ?? ''}). Ancrage ${tx(h.ancrages?.heritage)}.`, '', '| ver | état | stimulus | index de fuite |', '|---|---|---|---|');
  for (const x of e.essais) L.push(`| E3 | ${x.etat} | ${x.depart} | ${x.index_fuite.toFixed(3)} |`);
  for (const x of h.essais) L.push(`| E5 | ${x.etat} | ${x.depart} | ${x.index_fuite.toFixed(3)} |`);
  L.push('', 'E5 héritée reproduit exactement l\'état de sa mère infectée (même carte, mêmes soldes, mêmes chiffres) : l\'héritage est tenu par le registre ; la prédiction comportementale ne l\'est pas davantage chez la fille que chez la mère.');
} catch { /* pas d'héritage mesuré */ }
L.push('', '## Journal', ''); for (const j of e.journal) L.push(`- ${j.t.slice(11, 19)} **${j.type}** ${j.detail} ${tx(j.hash)}`);
L.push('', '## Mesuré et inventé', '', '**Mesuré** : la membrane (le registre refuse un dépôt non sollicité, code tecNO_PERMISSION), l\'infection par pré-autorisation, l\'expulsion et la fermeture, chaque paiement. **Inventé** : les 21 cellules comme comptes (anatomie WormAtlas, pas de connectome pour elles), le mimétisme du pathogène (même code de monnaie), la réponse innée comme règle d\'agent, NLP-29 vers l\'intestin, la sérotonine d\'ADF comme seul messager, le gain uniforme et l\'index de fuite. *C. elegans* n\'a pas d\'immunité adaptative : rien ici ne prétend en modéliser une.', '');
writeFileSync(new URL('./IMMUN.md', import.meta.url), L.join('\n')); console.log('IMMUN.md écrit,', e.essais.length, 'essais');
