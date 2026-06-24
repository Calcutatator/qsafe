# qsafe

A concise, information-first breakdown of how quantum-proof a blockchain is. It splits a chain into **5 core sections** and **30 components**, each rated for its quantum status (breakable / depends / safe), the crypto primitive at risk, and how mature the fix is.

**Live:** https://calcutatator.github.io/qsafe/

Two tabs:
- **Principles** — the generalized model (5 cores → 30 components).
- **Projects** — real chains graded against the model, each with a quantum-proof %. (Starknet assessed; Ethereum, Solana, Bitcoin queued.)

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

Project assessments live in `data/projects/` — `index.json` (the list) plus one `<id>.json` per project. To add a project: copy an existing `<id>.json`, set each component's verdict (`pass` / `fail` / `na`) with a `scheme` and a `why`, add it to `index.json`, then regenerate the `file://` bundle:

```sh
python3 - <<'PY'
import json
base = "data/projects"; idx = json.load(open(f"{base}/index.json"))
a = {p["id"]: json.load(open(f"{base}/{p['id']}.json")) for p in idx["projects"] if p.get("status") == "assessed"}
open(f"{base}/bundle.js", "w").write("window.QSAFE_PROJECTS = " + json.dumps({"index": idx["projects"], "assessments": a}, ensure_ascii=False) + ";\n")
PY
```

## Repo layout

```
index.html  styles.css  app.js   the site (GitHub Pages serves it from the repo root)
data/                            canonical taxonomy (JSON/CSV) + window.TAXONOMY copy
data/projects/                   per-project assessments (index.json + <id>.json + bundle.js)
docs/                            taxonomy, framework, schema, component-map.svg
```

## Deploy

Published via GitHub Pages from `main` (root). Any static host works — there's no build step.

## License

MIT — see `LICENSE`.
