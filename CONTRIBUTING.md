# Contributing to qsafe

qsafe scores blockchains and on-chain products against a fixed **30-component** quantum-resistance framework. Most contributions are one of two things:

1. **Update one component** for an existing chain or product.
2. **Add a full chain or product assessment**.

AI or coding agents should also read [`AGENTS.md`](AGENTS.md). It is the compact operational guide for the framework, scoring boundaries, and validation flow.

For a file-by-file map of the data folder, editable files, generated files, and schemas, see [`data/README.md`](data/README.md).

## Option 1: Update one component

Use this when a single scorecard row is wrong or has changed. Example: "Project X component 1.3 is now post-quantum."

1. **Find the project file.** Existing assessments live in `data/projects/<project-id>.json`.
2. **Find the component id.** Component ids are stable, such as `1.3` or `4.4`. The full list is in [`docs/taxonomy.md`](docs/taxonomy.md).
3. **Edit only that component block.** Update:
   - `verdict`: `pass`, `fail`, or `na`
   - `scheme`: the concrete crypto or mechanism used
   - `why`: one short, plain-language reason
   - `sources`: primary links where possible
4. **Send the update.** If you can edit files in GitHub, open a PR. If you do not want to edit JSON, use the [component update form](https://github.com/Calcutatator/qsafe/issues/new?template=component-update.yml) and include sources.

You do not need to run local commands for a component update. The automated check validates the project data when you open a PR.

Agent handoff: ask your agent to "Update qsafe `<project>` component `<id>`, edit only that assessment block, cite sources, validate it, and open a PR."

## Option 2: Add a chain or product

Use this when qsafe is missing a whole blockchain, L2, bridge, app, shielded pool, wallet system, or other on-chain product.

1. **Copy the template.**
   ```sh
   cp data/projects/_template.json data/projects/<id>.json
   ```
2. **Fill the top-level fields:** `id`, `name`, `type`, `reviewed`, `summary`, and `links`.
3. **Fill all 30 components.** Every component needs a `verdict`. Every `pass` or `fail` should also have `scheme`, `why`, and `sources`.
4. **Register the project** in `data/projects/index.json`:
   ```json
   { "id": "<id>", "name": "...", "type": "...", "status": "assessed", "reviewed": "YYYY-MM-DD" }
   ```
5. **For a product built on another chain, set `parent`.** Put `"parent": "<host-chain-id>"` in both `data/projects/index.json` and the project file.
6. **Open a PR** with the project JSON and updated index. The automated check validates the data; agents and local contributors can run `python3 scripts/build_projects.py` before sending.

Agent handoff: ask your agent to "Add `<project>` to qsafe, follow `AGENTS.md`, fill all 30 components, run `python3 scripts/build_projects.py`, and open a PR."

## The model

- qsafe has **5 fixed core sections and 30 fixed components**.
- Do not add, remove, or rename components unless the framework itself is being changed intentionally.
- The component ids (`1.1` through `5.5`) are the keys in every project assessment.
- The human-readable component list is [`docs/taxonomy.md`](docs/taxonomy.md).
- The canonical machine-readable taxonomy is [`data/taxonomy.json`](data/taxonomy.json).

## Verdicts

Each component gets one verdict:

| verdict | meaning |
|---|---|
| `pass` | The deployed default uses post-quantum-secure crypto: hash-based, lattice-based, NIST PQC, or hash-based PoW where applicable. |
| `fail` | The deployed default relies on crypto a quantum computer breaks: ECDSA, EdDSA, Schnorr, sr25519, BLS, ECDH/RSA, KZG, Groth16, pairings, or elliptic-curve discrete-log commitments. |
| `na` | The component is genuinely not part of this project architecture. |

Score = passes / applicable components. `na` is excluded.

## Scoring rules

- **Current default mainnet reality:** score what ships by default today, not the roadmap.
- **Roadmaps do not pass:** mention future or optional post-quantum work in `why`, but do not award `pass` for opt-in, experimental, or unreleased support.
- **Canonical bridge only for 4.4:** score the chain's own canonical or in-protocol bridge. Third-party bridges belong to their own project/operator.
- **Proof-of-work can pass for 3.1 or 4.1:** hash-based PoW ordering or consensus has no Shor-breakable signing key.
- **Products inherit Settlement 4.3:** if a product relies on a host chain for settlement, score `4.3` as the host chain and set `"inherited": true`.

## Product-specific notes

For a product or sub-project built on a chain:

- Set `"parent": "<host-chain-id>"` in both the project file and `data/projects/index.json`.
- `4.3` Settlement inherits the host chain. If the host chain is not quantum-safe, `4.3 = fail`.
- Infrastructure the product only rides on is usually `na`: sequencing `3.1`, data availability `3.4`, VM `3.6`, consensus `4.1`, light clients `4.2`, and networking `5.1`-`5.3`.
- Score what the product itself wields: keys, proofs, commitments, note encryption, contract checks, and inherited settlement.

Worked examples:

- [`data/projects/zcash.json`](data/projects/zcash.json) — chain assessment.
- [`data/projects/strk20.json`](data/projects/strk20.json) — product on Starknet.
- [`data/projects/ironwood.json`](data/projects/ironwood.json) — product on Zcash.

## Validation

```sh
python3 scripts/build_projects.py          # validates and regenerates data/projects/bundle.js
python3 scripts/build_projects.py --check   # optional stricter local check for stale bundle files
```

The validator also checks that project metadata matches `data/projects/index.json`, dates are valid, source URLs are well formed, and schema files are present and parseable.

If you are editing in GitHub's web UI, you can skip local commands. The **Validate projects** GitHub Action validates PRs that touch `data/` or `scripts/`. After changes reach `main`, the generated `data/projects/bundle.js` fallback is refreshed automatically.
