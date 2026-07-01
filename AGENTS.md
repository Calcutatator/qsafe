# Agent guide for qsafe

qsafe is a zero-build static site plus a versioned data set for evaluating blockchain quantum resistance. The framework is fixed: **5 core sections, 30 components**. Project contributions should change project data, not the framework, unless the user explicitly asks for framework work.

## Start here

Read these files before scoring or editing project data:

- `README.md` — repo shape, app routes, data layout.
- `docs/framework.md` — the reasoning behind the 5-core model, threat model, and sources.
- `docs/taxonomy.md` — human-readable list of all 30 fixed components.
- `CONTRIBUTING.md` — scoring rules and project-submission flow.
- `docs/schema.md` — field meanings for taxonomy and project data.
- `data/README.md` — contributor-facing map of editable data, generated files, schemas, and validation.

Canonical machine-readable files:

- `data/taxonomy.json` — the fixed 5-core / 30-component taxonomy.
- `data/projects/index.json` — registry of assessed and queued projects.
- `data/projects/<id>.json` — one assessment per assessed project.
- `data/projects/bundle.js` — generated browser fallback; do not edit by hand.
- `data/schema/*.schema.json` — machine-readable data contracts for editors and agents.

## Run the app

There is no dependency install and no build step.

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. The app can also be opened directly from `index.html`, using the `.js` data fallbacks.

## Validate data

Run this before finishing any project-data change:

```sh
python3 scripts/build_projects.py
python3 scripts/build_projects.py --check
```

`python3 scripts/build_projects.py` validates all assessed projects and regenerates `data/projects/bundle.js`. PR validation runs this non-`--check` command so web editors do not have to commit generated files. After changes reach `main`, GitHub Actions refreshes `data/projects/bundle.js` automatically if needed.

The validator also catches metadata drift between `data/projects/index.json` and project files, invalid reviewed dates, malformed source URLs, unknown fields, and missing required component fields. Missing source links on older pass/fail entries are currently warnings, not hard failures.

## Route 1: Update one component

Use this when a user says a specific component for a chain or product changed, for example "Ethereum 1.3 is now post-quantum."

1. Identify the project file: `data/projects/<project-id>.json`.
2. Identify the component id, such as `1.3`; use `docs/taxonomy.md` if the id is unclear.
3. Edit only `assessment["<component-id>"]`.
4. Update `verdict`, `scheme`, `why`, and `sources`.
5. Preserve current-default-mainnet scoring. Do not award `pass` for roadmap, optional, or unreleased work.
6. Run `python3 scripts/build_projects.py`.
7. Commit the edited project file. If you regenerated `data/projects/bundle.js`, include it; otherwise the main-branch workflow will refresh it after merge.

## Route 2: Add a new chain

1. Copy `data/projects/_template.json` to `data/projects/<id>.json`.
2. Fill top-level fields: `id`, `name`, `type`, `reviewed`, `summary`, `links`.
3. Fill every component key from `1.1` through `5.5` with:
   - `verdict`: `pass`, `fail`, or `na`
   - `scheme`: the concrete crypto or mechanism used
   - `why`: one concise plain-language reason for every `pass` or `fail`
   - `sources`: primary source URLs where possible
4. Register it in `data/projects/index.json` with `status: "assessed"`.
5. Run `python3 scripts/build_projects.py`.
6. Commit the project JSON and the updated index. Include regenerated `data/projects/bundle.js` if you ran the script locally.

## Route 2b: Add a product or sub-project

Use the same flow as a chain, plus:

- Set `"parent": "<host-chain-id>"` in both `data/projects/index.json` and `data/projects/<id>.json`.
- Component `4.3` Settlement inherits the host chain. If the host is not quantum-safe, mark `4.3` as `fail` and set `"inherited": true`.
- Infrastructure only borrowed from the host chain is usually `na` for the product: sequencing `3.1`, DA `3.4`, VM `3.6`, consensus `4.1`, light clients `4.2`, and networking `5.1`-`5.3`.
- Score only the product's own keys, proofs, commitments, encryption, contract checks, and inherited settlement.

Good examples:

- `data/projects/zcash.json` — chain assessment.
- `data/projects/strk20.json` — product on Starknet.
- `data/projects/ironwood.json` — product on Zcash.

## Scoring rules agents must preserve

- Score **current default mainnet reality**, not roadmaps.
- Opt-in, experimental, unreleased, or non-default post-quantum support does not earn `pass`; mention it in `why`.
- `pass` means the deployed default uses post-quantum-secure crypto: hash-based, lattice-based, NIST PQC, or hash-based PoW where applicable.
- `fail` means it relies on Shor-breakable crypto: ECDSA, EdDSA, Schnorr, sr25519, BLS, ECDH/RSA key exchange, KZG, Groth16, or other pairing/elliptic-curve discrete-log commitments.
- `na` means the component is genuinely not part of this project architecture.
- Canonical bridge only for `4.4`: third-party bridges belong to their own operator/project, not the base chain.
- Proof-of-work ordering or consensus can be `pass` for `3.1` or `4.1` because the security primitive is hash-based.

## Editing boundaries

- Do not add, remove, or rename taxonomy components unless explicitly asked.
- Do not hand-edit `data/projects/bundle.js`; regenerate it.
- Keep the app zero-dependency unless explicitly asked to add a toolchain.
- Prefer small, data-only changes for project submissions.
- Use primary sources in project assessments: protocol docs, specs, audits, standards, official engineering posts, or papers.
