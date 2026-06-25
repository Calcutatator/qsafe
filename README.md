# qsafe

A concise, information-first breakdown of how quantum-proof a blockchain is. It splits a chain into **5 core sections** and **30 components**, each rated for its quantum status (breakable / depends / safe), the crypto primitive at risk, and how mature the fix is.

**Live:** https://calcutatator.github.io/qsafe/

Two tabs:
- **Principles** — the generalized model (5 cores → 30 components).
- **Projects** — real chains and on-chain products graded against the model, each with a quantum-proof %. Products (e.g. a shielded pool) nest as branches under their host chain. (Starknet, Ethereum, Zcash + the STRK20 product assessed; Solana, Bitcoin queued.)

This is a monorepo: the website lives at the repo root, and the underlying taxonomy + project data + reference docs live alongside it so they version together.

## The app

Zero-build static site — no dependencies, no toolchain.

- **Quickest:** open `index.html` in a browser (loads `data/taxonomy.js` directly).
- **Or serve it** (reads the canonical `data/taxonomy.json`):
  ```sh
  python3 -m http.server 8000   # then open http://localhost:8000
  ```

Deep-linkable routes:
- **Principles:** `#/` (the 5 cores) · `#/core/3` (one core) · `#/component/3.4` (one component)
- **Projects:** `#/projects` (the list) · `#/projects/starknet` (a project) · `#/projects/starknet/core/3` · `#/projects/starknet/component/3.2`

## The data

`data/` is the canonical, machine-readable taxonomy:

| File | What |
|---|---|
| `data/taxonomy.json` | Canonical source — `meta` + 5 `cores[]` → 30 components. The app reads this. |
| `data/taxonomy.js`   | The same object as `window.TAXONOMY`, so `index.html` also runs from `file://`. |
| `data/taxonomy.csv`  | Flat, one row per component. |
| `data/assessment_template.csv` | Long-format scaffold for per-chain audits (the v2 scorecards). |

`docs/` holds the human-readable taxonomy, the research framework + sources, the field schema, and the component-map infographic.

### Editing the data

Edit `data/taxonomy.json` (canonical), then regenerate the browser copy:

```sh
{ printf 'window.TAXONOMY = '; cat data/taxonomy.json; printf ';\n'; } > data/taxonomy.js
```

Served over HTTP the app reads the JSON directly; the `.js` copy is only the `file://` fallback.

Project assessments live in `data/projects/` — `index.json` (the list) plus one `<id>.json` per project, and `bundle.js` (the `file://` copy). Adding or editing a project is a data-only change validated by one script — see **[Contributing](#contributing)** below.

## Repo layout

```
index.html  styles.css  app.js   the site (GitHub Pages serves it from the repo root)
data/                            canonical taxonomy (JSON/CSV) + window.TAXONOMY copy
data/projects/                   per-project assessments (index.json · <id>.json · _template.json · bundle.js)
docs/                            taxonomy, framework, schema, component-map.svg
scripts/build_projects.py        validates project data + regenerates the bundle
.github/                         PR template + the "Validate projects" CI workflow
CONTRIBUTING.md                  how to PR a project (humans + AI)
```

## Contributing

Projects are data, so contributing is just editing JSON and opening a PR — humans and AI agents alike. Full rules and worked examples are in **[CONTRIBUTING.md](CONTRIBUTING.md)**; the short version:

1. **Copy the template** — `data/projects/_template.json` → `data/projects/<id>.json` (it lists all 30 components with label hints).
2. **Fill each component** with a `verdict` (`pass` / `fail` / `na`) plus `scheme`, `why`, and `sources`. For a product built on a chain, set `"parent": "<chain-id>"` — it inherits the chain as Settlement and nests as a branch under it.
3. **Register it** in `data/projects/index.json`.
4. **Validate + build:** `python3 scripts/build_projects.py` — checks every project and regenerates `bundle.js`.
5. **Open a PR.** The **Validate projects** GitHub Action re-runs `--check` automatically, and a PR template walks you through the checklist.

Scoring conventions — *current-default-mainnet-reality*, *canonical-bridge-only* (4.4), *PoW = pass* (3.1/4.1), and *products inherit Settlement* (4.3) — are documented in CONTRIBUTING.md. The 5 cores / 30 components themselves are frozen.

## Deploy

Published via GitHub Pages from `main` (root). Any static host works — there's no build step.

## License

MIT — see `LICENSE`.
