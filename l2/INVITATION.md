# XRPLife L2 — an invitation to run a validator

*One page. What this chain is, what it is not, what we ask, what you get.*

## What it is

XRPLife put the complete connectome of *C. elegans* on the XRP Ledger testnet:
every neuron is an account, every synapse a trust line, a nerve impulse a chain
of payments. Four animals were born, grew, mated, reproduced and died on the
ledger ([github.com/LeDenti/xrplife](https://github.com/LeDenti/xrplife),
preprint in `paper/`). We then added the "wireless" connectome: serotonin and
PDF-1 as currencies issued by the neurons that secrete them, receptors as trust
lines, concentration as balance.

The public testnet closes a ledger every 3–4 seconds and resets from time to
time. Neuromodulation lives on a faster clock and must survive. **XRPLife L2**
is a dedicated ledger, same software as XRPL (`rippled` 3.3), separate network
(`network_id 7302`), zero reserve, 10-drop fees, where the neurons keep their
keys and their addresses and where serotonin can spread from one animal to
another: a neuron of worm E3 can hold a trust line to the serotonin of worm E1.
Every N ledgers, the state hash of L2 is anchored on the public ledger: the
sleep of the organism.

## What it is not

- **There is no token to buy, sell or earn.** The native asset exists only to
  pay fees and is created at genesis (100 billion units held by the project's
  treasury, genesis account black-holed). Serotonin is an IOU of a neuron,
  non-transferable by construction, worth nothing. Nobody will ever be paid in
  it and nobody should ever pay for it.
- **No funds are at stake.** A validator holds no money and signs no payments.
  It signs ledgers.
- **It is not a product.** It is a research instrument, published under MIT,
  with its results stated plainly, including the negative ones.

## What we ask

One server running one process:

| | |
|---|---|
| machine | 2 vCPU, 4–8 GB RAM, 50 GB SSD (a 20–40 €/month VPS, or a machine you already run) |
| software | `rippled` 3.3 (the XRPL Labs `xrpld` Docker image works out of the box) |
| network | TCP 51235 open for peers; admin ports kept on localhost |
| time | one hour to install, a few minutes a month to update |
| commitment | keep it up; tell us a week ahead if you stop |

You receive the network kit: `rippled.cfg`, `validators.txt` (the trusted list),
the genesis parameters and a five-step procedure. You generate your own
validator keys with `validator-keys`; we never see your secret, only your
public key, which is added to `validators.txt` and published in the README.

## What you get

- Your name and public key in the public list of validators of the first
  biological ledger, in the repository and in the next paper's acknowledgements
  (co-authorship if you contribute to the science).
- A seat in the only decision the chain ever takes: who joins the trusted list.
  New validators are added when the current validators agree, 80 % like any
  XRPL ledger.
- Read and write access for your own organisms: pose a worm, express a
  receptor, catch another worm's serotonin.

## Who already runs one

| validator | public key | since |
|---|---|---|
| XRPLife (Julien Cugny), Tokyo | `nHBdG1EX5awA6ZXr3z3hN1YbXdE6PGm45ZLoJKCcfM7ZTnJs3XfN` | November 2026 |

The second validator is the hardest to get; from the third on, they come
because the others are there. If you want to be the second, write to
[@Ju_l_C](https://x.com/Ju_l_C) or open an issue on the repository.

## Trust, stated plainly

A ledger is worth the list of those who hold it. With one validator this chain
is a signed database run by its author; with five it is a small network; with
twenty it is a public good. We will keep this list current, and we will say at
every step which of the three it is.
