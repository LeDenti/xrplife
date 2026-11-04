# Données

- `herm_full_edgelist.csv` : connectome de l'hermaphrodite *C. elegans*, synapses
  chimiques et jonctions électriques pondérées, d'après **Cook et al. 2019**,
  « Whole-animal connectomes of both Caenorhabditis elegans sexes », *Nature* 571,
  63-71. Fichier tel que distribué par le projet **OpenWorm** (dépôt `openworm/c302`,
  licence MIT), téléchargé le 03/11/2026.
  SHA-256 : `142693f17556148d7f962835b18ac6dd5af18b7467eef61815ebc1dd5474c0ca`
  (c'est l'empreinte ancrée sur le registre).
- `bentley2016_monoamines.csv` et `bentley2016_neuropeptides.csv` : connectome « sans fil »
  (extrasynaptique) de **Bentley et al. 2016**, « The multilayer connectome of Caenorhabditis
  elegans », *PLoS Computational Biology* 12(12), e1005283. Une ligne = émetteur, récepteur,
  molécule (dopamine, sérotonine, octopamine, tyramine ; flp-*, nlp-*, pdf-1, pdf-2, ntc-1),
  gène du récepteur. Fichiers `edgelist_MA.csv` et `edgelist_NP.csv` tels que distribués par le
  **ConnectomeToolbox** d'OpenWorm (`openworm/ConnectomeToolbox`, `cect/data/`), téléchargés le
  04/11/2026. SHA-256 : `5a206a67…fa2aa3` et `bec5f0c9…2389b` (ancrés dans l'AccountSet
  `xrplife/wireless` de E1). Utilisés pour la couche « sentiments » (`humeur.mjs`) : sérotonine
  (récepteurs mod-1 et ser-4 inhibiteurs, ser-1 et ser-5 excitateurs) et PDF-1 (pdfr-1 excitateur).
  La carte plus récente et plus complète des neuropeptides est celle de **Ripoll-Sánchez et al.
  2023** (*Neuron* 111, 3570-3589, https://doi.org/10.1016/j.neuron.2023.09.043, dépôt GitHub
  LidiaRipollSanchez/Neuropeptide-Connectome) ; ses matrices agrégées ne nomment pas le peptide par
  arête, Bentley 2016 a donc été préféré pour isoler pdf-1.
- `CElegansNeuronTables.xls` : tables de neurones d'OpenWorm, pour référence.

## Comment citer les données

- Bentley, B., Branicky, R., Barnes, C. L., Chew, Y. L., Yemini, E., Bullmore, E. T., Vértes, P. E. & Schafer, W. R. (2016). *The multilayer connectome of Caenorhabditis elegans.* PLoS Computational Biology 12(12), e1005283. https://doi.org/10.1371/journal.pcbi.1005283
- Flavell, S. W., Pokala, N., Macosko, E. Z., Albrecht, D. R., Larsch, J. & Bargmann, C. I. (2013). *Serotonin and the neuropeptide PDF initiate and extend opposing behavioral states in C. elegans.* Cell 154(5), 1023-1035. https://doi.org/10.1016/j.cell.2013.08.001

- Cook, S. J., Jarrell, T. A., Brittin, C. A., Wang, Y., Bloniarz, A. E., Yakovlev, M. A., Nguyen, K. C. Q., Tang, L. T.-H., Bayer, E. A., Duerr, J. S., Bülow, H. E., Hobert, O., Hall, D. H. & Emmons, S. W. (2019). *Whole-animal connectomes of both Caenorhabditis elegans sexes.* Nature 571, 63-71. https://doi.org/10.1038/s41586-019-1352-7
- Witvliet, D., Mulcahy, B., Mitchell, J. K., Meirovitch, Y., Berger, D. R., Wu, Y., Liu, Y., Koh, W. X., Parvathala, R., Holmyard, D., Schalek, R. L., Shavit, N., Chisholm, A. D., Lichtman, J. W., Samuel, A. D. T. & Zhen, M. (2021). *Connectomes across development reveal principles of brain maturation.* Nature 596, 257-261. https://doi.org/10.1038/s41586-021-03778-8
- White, J. G., Southgate, E., Thomson, J. N. & Brenner, S. (1986). *The structure of the nervous system of the nematode Caenorhabditis elegans.* Phil. Trans. R. Soc. Lond. B 314, 1-340. https://doi.org/10.1098/rstb.1986.0056
- OpenWorm Foundation, dépôt `openworm/c302` (licence MIT), fichiers `herm_full_edgelist.csv`, `witvliet_2020_1..8.xlsx`, `SI 5 Connectome adjacency matrices.xlsx`. https://github.com/openworm/c302 — https://openworm.org
