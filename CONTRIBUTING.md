# Contributing to qsafe

qsafe scores blockchains and on-chain products against a fixed **30-component** quantum-resistance framework. The whole app is driven by the JSON in `data/` — so contributing is just **editing data and opening a PR**. Anyone (or any AI agent) can do it, and CI checks every PR automatically.

## What you can contribute

- **A new chain** — assessed against the 30 components.
- **A new product / sub-project** — something built on an existing chain (a shielded pool, a DEX, an L2), assessed as a branch of its host chain.
- **A correction** — fix a verdict, scheme, `why`, or source on an existing project.

## The model (read this first)

- **5 fixed core sections → 30 components.** These are frozen — you never add, rename, or remove them. The full list with descriptions is in [`docs/taxonomy.md`](docs/taxonomy.md), and the component ids (`1.1` … `5.5`) are the keys you fill in.
- **Each component gets one verdict: `pass` · `fail` · `na`.**
  - **pass** — as deployed *by default*, this uses post-quantum-secure crypto (hash-based, lattice, or NIST PQC; hash-based PoW).
  - **fail** — it relies on crypto a quantum computer breaks: ECDSA / EdDSA / Schnorr over any elliptic curve, ECDH key-exchange, pairing-based BLS / KZG / Groth16, or discrete-log / EC commitments (Pedersen, IPA over Pasta curves). Opt-in-but-not-default PQ still counts as **fail**.
  - **na** — the component genuinely isn't part of this project.
- **Score = passes ÷ applicable**, where `applicable = 30 − na`. Each core also shows its own %.

## Scoring conventions (please be consistent)

- **Current default mainnet reality** — score what ships *by default today*, not the roadmap. Mention roadmap in the `why`.
- **Canonical bridge only (4.4)** — score a chain's *own* canonical / in-protocol bridge. If it has none (most monolithic L1s), 4.4 = `na`. Third-party / custodial bridges are scored against their operator, not the chain.
- **Proof-of-work (3.1, 4.1)** — hash-based PoW ordering / consensus has no Shor-breakable signing key → `pass`.
- **Products inherit Settlement** — see below.

## Add a chain (top-level project)

1. Copy `data/projects/_template.json` → `data/projects/<id>.json`.
2. Fill `id`, `name`, `type`, `reviewed` (a date), `summary`, `links`, and — for each of the 30 components — a `verdict` plus `scheme`, `why`, and `sources`.
3. Register it in `data/projects/index.json`:
   ```json
   { "id": "<id>", "name": "...", "type": "...", "status": "assessed", "reviewed": "YYYY-MM-DD" }
   ```
   (Use `"status": "queued"` with no file to list a project as not-yet-assessed.)
4. Run `python3 scripts/build_projects.py` — it validates everything and regenerates `data/projects/bundle.js`.
5. Commit the data **and** the regenerated `bundle.js`, and open a PR.

## Add a product / sub-project (something built on a chain)

Everything above, plus:

- Set `"parent": "<host-chain-id>"` in **both** `index.json` and the project file. It renders as a branch under its parent.
- **Settlement (4.3) = the host chain.** If the host chain isn't quantum-safe, `4.3 = fail` — set `"inherited": true`.
- **Chain infrastructure the product only rides on** — sequencing (3.1), data availability (3.4), VM (3.6), consensus (4.1), light clients (4.2), networking (5.1/5.2/5.3) — is `na`. It's captured once, via Settlement.
- **Score only what the product itself wields** — its keys, proofs, commitments, note encryption, contract checks. Tag anything it borrows from the host chain with `"inherited": true`.

Worked examples: [`data/projects/strk20.json`](data/projects/strk20.json) (a product on Starknet) and [`data/projects/zcash.json`](data/projects/zcash.json) (a chain).

## Component fields

| field | required | value |
|---|---|---|
| `verdict` | yes | `pass` \| `fail` \| `na` |
| `why` | for pass/fail | one plain-language sentence |
| `scheme` | recommended | the crypto/primitive in use, e.g. `"secp256k1 ECDSA"` |
| `sources` | recommended | list of URLs — primary sources (specs, audits, docs) preferred |
| `inherited` | sub-projects | `true` if borrowed from the parent chain |

## Validate before you PR

```sh
python3 scripts/build_projects.py          # prints each project's %, regenerates bundle.js
python3 scripts/build_projects.py --check   # what CI runs: fails if anything is invalid or bundle.js is stale
```

A GitHub Action (**Validate projects**) runs `--check` on every PR that touches `data/` or `scripts/`, so you'll get a green/red signal automatically. Keep `data/projects/bundle.js` committed and current.
