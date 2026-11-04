// Compte rendu de la couche « sentiments » : humeur-etat.json → HUMEUR.md
import { readFileSync, writeFileSync } from 'node:fs';
const e = JSON.parse(readFileSync(new URL('./humeur-etat.json', import.meta.url), 'utf8'));
const X = 'https://testnet.xrpl.org';
const tx = (h) => (h ? `[${h.slice(0, 8)}…](${X}/transactions/${h})` : '');
const L = [];
L.push(`# La couche « sentiments » du ver ${e.ver} sur le registre XRPL (testnet)`, '', `Généré le ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC depuis \`humeur-etat.json\`. Organisme [${e.organisme.slice(0, 8)}…](${X}/accounts/${e.organisme}).`, '');
L.push('## Le connectome sans fil posé', '');
L.push('| modulateur | arêtes (Bentley 2016, restreintes aux neurones de E1) | émetteurs | neurones récepteurs |', '|---|---|---|---|');
for (const [m, v] of Object.entries(e.modulateurs)) L.push(`| ${m} | ${v.aretes} | ${v.emetteurs.length} (${v.emetteurs.slice(0, 6).join(', ')}${v.emetteurs.length > 6 ? ', …' : ''}) | ${v.recepteurs} |`);
if (e.recepteurs) L.push('', `Trustlines de récepteurs vérifiées sur le registre : **${e.recepteurs.poses}/${e.recepteurs.attendu}**, ancrage ${tx(e.recepteurs.ancrage)}.`);
L.push('', '## Les trois états', '', '| état | registre | entrées excitatrices actives | inhibitrices actives | neurones modulés |', '|---|---|---|---|---|');
for (const [n, g] of Object.entries(e.gains)) L.push(`| ${n} | ${g.registre} | ${g.actifs.exc} | ${g.actifs.inh} | ${Object.values(g.gains).filter((x) => x.gain !== 1).length} |`);
L.push('', 'Gain d\'un neurone = exp(0,5 × (part des entrées excitatrices actives − part des inhibitrices actives)), lu sur les soldes du registre.', '');
L.push('## Le test : même stimulus, trois humeurs', '');
L.push('| état | stimulus | sauts | paiements | neurones atteints | activité → marche avant (AVB, PVC) | → arrêt/recul/virage (AVA, AVD, AVE, RIM, RIV, SMD) | index d\'errance | durée |', '|---|---|---|---|---|---|---|---|---|');
for (const s of e.essais) L.push(`| ${s.etat} | ${s.depart} | ${s.sauts} | ${s.paiements}${Object.keys(s.refus).length ? ' (refus ' + JSON.stringify(s.refus) + ')' : ''} | ${s.atteints} | ${s.avant.toFixed(4)} | ${s.arret.toFixed(4)} | **${s.index_errance.toFixed(3)}** | ${s.duree_s} s |`);
L.push('', 'Index d\'errance = activité arrivée aux commandes de marche avant / (avant + arrêt). Prédiction Flavell 2013 : repu (sérotonine) < base < affamé (PDF-1).', '');
const par = {}; for (const s of e.essais) { (par[s.depart] ??= {})[s.etat] = s.index_errance; }
L.push('| stimulus | base | repu (5HT) | affamé (PDF-1) | sens prédit tenu ? |', '|---|---|---|---|---|');
for (const [d, v] of Object.entries(par)) { const ecart = v.repu !== undefined && v.affame !== undefined ? v.affame - v.repu : null; const ok = ecart === null ? '—' : Math.abs(ecart) < 0.01 ? `NON : égal (écart ${ecart.toFixed(4)}, sous le seuil de 0,01)` : ecart > 0 ? `oui (écart ${ecart.toFixed(3)})` : `NON : sens inverse (écart ${ecart.toFixed(3)})`; L.push(`| ${d} | ${v.base?.toFixed(3) ?? '—'} | ${v.repu?.toFixed(3) ?? '—'} | ${v.affame?.toFixed(3) ?? '—'} | ${ok} |`); }
L.push('', '## Lecture', '', 'La modulation change l\'**activité totale** (sérotonine : ÷ 1,9 depuis AWC ; PDF-1 : × 1,8 depuis ALM) mais pas la **répartition** entre marche avant et arrêt : l\'index d\'errance bouge de moins de 0,015 dans les trois humeurs, et dans le sens inverse de la prédiction pour ALM. Dans ce modèle, un gain uniforme sur un neurone multiplie toutes ses sorties de la même façon ; la part qui atteint chaque commande ne dépend alors que de la carte, pas de l\'humeur. Pour que la sérotonine fasse brouter, il faut qu\'elle change **quelles** synapses transmettent, pas combien : un effet par récepteur et par synapse, ce que Bentley 2016 ne donne pas et que ce modèle n\'a pas. Le registre pouvait avoir tort ici, et il a eu tort : c\'est la première mesure du projet qui n\'est pas vraie par construction.', '');
L.push('', '## Journal', '');
for (const j of e.journal) L.push(`- ${j.t.slice(11, 19)} **${j.type}** ${j.detail} ${tx(j.hash)}`);
L.push('', '## Ce que le registre a enseigné', '', 'Essai 1 (monnaies communes « 5HT » et « PDF1 », résultats dans `HUMEUR-essai1.md`) : les quatre neurones RME se sécrètent PDF-1 mutuellement ; avec une monnaie commune, les deux sens partagent le même objet RippleState et les deux sécrétions s\'annulent (12 arêtes inactives sur 892, mesuré sur le registre). D\'où une monnaie par émetteur et par modulateur (« PDF1.RMED »), comme une monnaie par neurone pour les synapses. Les 16 « doublons » de la sérotonine (même paire, deux récepteurs, par exemple mod-1 et ser-4 sur AIB) partagent une ligne, ce qui est fidèle : une concentration, deux récepteurs. Un émetteur ne peut pas poser NoRipple sur une ligne où il est débiteur (tecNO_PERMISSION) : c\'est au récepteur de fermer sa ligne.', '');
L.push('', '## Mesuré et inventé', '', '**Mesuré** : la carte des émetteurs et récepteurs (Bentley 2016), les soldes et les paiements sur le registre, chaque transfert d\'activité est une transaction publique. **Inventé** : la fonction de gain (exp(0,5 × (E − I))), la répartition de l\'activité au prorata des poids, l\'index d\'errance comme lecture du comportement, la sécrétion « tout ou rien ». NSM, source principale de sérotonine chez l\'animal, est pharyngé et absent de l\'anneau nerveux de Witvliet : ADF tient ce rôle ici.', '');
writeFileSync(new URL('./HUMEUR.md', import.meta.url), L.join('\n'));
console.log('HUMEUR.md écrit,', e.essais.length, 'essais');
