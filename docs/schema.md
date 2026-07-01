# Schema

Machine-readable JSON Schema contracts live in:

- [`data/schema/taxonomy.schema.json`](../data/schema/taxonomy.schema.json)
- [`data/schema/project-index.schema.json`](../data/schema/project-index.schema.json)
- [`data/schema/project.schema.json`](../data/schema/project.schema.json)

The repo keeps validation zero-dependency. `scripts/build_projects.py` enforces the core rules directly and parses the schema files to make sure they stay valid JSON.

## `data/taxonomy.json`

```
{
  "meta": { version, updated, description, lens, *_values, applicability_notes },
  "cores": [
    {
      "id": 1-5,
      "name": string,                // core section name
      "label": string,               // plain-language one-liner
      "at_a_glance": status,         // overall status of the section
      "applicability": applicability,
      "notes": string,               // granular caveats for the section
      "subsections": [ Component, ... ]
    }
  ]
}
```

### Component object
| field | type | meaning |
|---|---|---|
| `subsection_id` | string | stable id, e.g. `"3.2"` |
| `subsection_label` | string | concise component name |
| `one_liner` | string | simple one-line meaning |
| `what_it_is` | string | brief description of the component |
| `quantum_proof_requirement` | string | what it takes to be quantum-proof |
| `primitive_at_risk` | enum | `signatures` \| `encryption` \| `pairings` \| `hash` \| `depends` |
| `status` | enum | `breakable` \| `depends` \| `safe` |
| `fix_maturity` | enum | `standardized` \| `deployed` \| `prototype` \| `research` \| `none` |
| `applicability` | enum | `universal` \| `common` \| `conditional` |

## `data/taxonomy.csv`
Flat: `core_id, core_name, core_label, core_status,` + all Component fields (one row per component).

## `data/assessment_template.csv`
Long format for per-chain audits:
`chain, subsection_id, subsection_label, applies, scheme_used, status, notes`
- `applies`: `yes` | `no` | `na`
- `status`: `safe` | `breakable` | `depends` | `na` | `unknown`

## `data/projects/index.json`

Registry and display order for projects:

```
{
  "projects": [
    {
      "id": "project-id",
      "name": "Display Name",
      "type": "Short project type",
      "parent": "host-chain-id",
      "status": "assessed | queued",
      "reviewed": "YYYY-MM-DD"
    }
  ]
}
```

Rules:

- `id` is the stable slug and must match `data/projects/<id>.json`.
- `parent` is only used for products built on another chain.
- `reviewed` is required for assessed projects.
- Assessed entries must have a matching project file.

## `data/projects/<id>.json`

One assessment per project:

```
{
  "id": "project-id",
  "name": "Display Name",
  "type": "Short project type",
  "parent": "host-chain-id",
  "reviewed": "YYYY-MM-DD",
  "summary": "Plain-language summary",
  "links": { "Website": "https://..." },
  "assessment": {
    "1.1": {
      "verdict": "pass | fail | na",
      "scheme": "Concrete crypto or mechanism",
      "why": "Short source-backed reason",
      "sources": ["https://..."],
      "inherited": true
    }
  }
}
```

Rules:

- Every assessed project must include all 30 component ids.
- `verdict` must be `pass`, `fail`, or `na`.
- Every verdict needs a `why`.
- `pass` and `fail` need a concrete `scheme`.
- `sources` must be a list of HTTP(S) URLs when present.
- `inherited` is optional and should be `true` only when a product inherits a component from its parent chain.
- `name`, `type`, `reviewed`, and `parent` must match the project entry in `data/projects/index.json`.
