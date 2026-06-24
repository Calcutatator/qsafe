# qsafe

A concise, information-first breakdown of how quantum-proof a blockchain is. It splits a chain into **5 core sections** and **30 components**, each rated for its quantum status (breakable / depends / safe), the crypto primitive at risk, and how mature the fix is.

**Live:** https://calcutatator.github.io/qsafe/

> v1 is the generalized model. Per-chain scorecards come next.

This is a monorepo: the website lives at the repo root, and the underlying taxonomy data + reference docs live alongside it so they version together.

## The app

Zero-build static site — no dependencies, no toolchain.

- **Quickest:** open `index.html` in a browser (loads `data/taxonomy.js` directly).
- **Or serve it** (reads the canonical `data/taxonomy.json`):
  ```sh
  python3 -m http.server 8000   # then open http://localhost:8000
  ```

Three deep-linkable views: `#/` (the 5 cores) · `#/core/3` (one core's components) · `#/component/3.4` (a single component in full).

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

## Repo layout

```
index.html  styles.css  app.js   the site (GitHub Pages serves it from the repo root)
data/                            canonical taxonomy (JSON/CSV) + window.TAXONOMY copy
docs/                            taxonomy, framework, schema, component-map.svg
```

## Deploy

Published via GitHub Pages from `main` (root). Any static host works — there's no build step.

## License

MIT — see `LICENSE`.
