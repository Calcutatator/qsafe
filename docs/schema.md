# Schema

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
