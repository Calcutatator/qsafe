<!-- Thanks for contributing to qsafe! See CONTRIBUTING.md for the full flow. -->

## What does this PR change?

- [ ] New chain assessment
- [ ] New product / sub-project (set `parent`)
- [ ] Correction to an existing project
- [ ] App / docs / other

**Project(s):** <!-- e.g. solana — or ironwood (product of zcash) -->

## Checklist

- [ ] Copied `data/projects/_template.json` (new) or edited an existing `data/projects/<id>.json`
- [ ] Every component has a `verdict` (`pass` / `fail` / `na`); each `pass`/`fail` has a one-line `why` and at least one `sources` link
- [ ] Followed the scoring rules in [CONTRIBUTING.md](../CONTRIBUTING.md) — default-mainnet-reality · canonical-bridge-only (4.4) · PoW = pass · products inherit Settlement (4.3)
- [ ] New project is registered in `data/projects/index.json` (with `parent` if it's a sub-project)
- [ ] Ran `python3 scripts/build_projects.py` and committed the regenerated `data/projects/bundle.js`
- [ ] The **Validate projects** check is green

## Sources

<!-- List the primary sources behind the verdicts (specs, audits, official docs). -->
