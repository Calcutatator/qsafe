#!/usr/bin/env python3
"""Validate qsafe project assessments and (re)generate the browser bundle.

Run from the repo root:
  python3 scripts/build_projects.py           # validate, then write data/projects/bundle.js
  python3 scripts/build_projects.py --check    # validate only; fail if bundle.js is stale (used by CI)

A project is one JSON file in data/projects/, registered in data/projects/index.json.
Every assessed project must score all 30 components (ids come from data/taxonomy.json)
with a verdict of pass | fail | na. See CONTRIBUTING.md for the rules.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ_DIR = os.path.join(ROOT, "data", "projects")
TAXONOMY = os.path.join(ROOT, "data", "taxonomy.json")
INDEX = os.path.join(PROJ_DIR, "index.json")
BUNDLE = os.path.join(PROJ_DIR, "bundle.js")

VERDICTS = {"pass", "fail", "na"}
STATUSES = {"assessed", "queued"}


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def component_ids():
    tax = load(TAXONOMY)
    return [s["subsection_id"] for core in tax["cores"] for s in core["subsections"]]


def validate():
    errors = []
    id_set = set(component_ids())
    index = load(INDEX)
    projects = index.get("projects", [])
    known = {p.get("id") for p in projects}

    for p in projects:
        pid = p.get("id", "<no id>")
        for field in ("id", "name", "type", "status"):
            if not p.get(field):
                errors.append("index.json: '%s' is missing '%s'" % (pid, field))
        if p.get("status") not in STATUSES:
            errors.append("index.json: '%s' status must be one of %s" % (pid, sorted(STATUSES)))
        if p.get("parent") and p["parent"] not in known:
            errors.append("index.json: '%s' parent '%s' is not a known project" % (pid, p["parent"]))

    assessments = {}
    for p in projects:
        if p.get("status") != "assessed":
            continue
        pid = p["id"]
        path = os.path.join(PROJ_DIR, pid + ".json")
        if not os.path.exists(path):
            errors.append("'%s' is status=assessed but data/projects/%s.json is missing" % (pid, pid))
            continue
        a = load(path)
        assessments[pid] = a
        for field in ("id", "name", "type", "reviewed", "summary", "assessment"):
            if field not in a:
                errors.append("%s.json: missing top-level '%s'" % (pid, field))
        if a.get("id") != pid:
            errors.append("%s.json: 'id' does not match index.json" % pid)
        if a.get("parent") != p.get("parent"):
            errors.append("%s.json: 'parent' does not match index.json" % pid)
        asmt = a.get("assessment", {})
        keys = set(asmt.keys())
        missing = id_set - keys
        unknown = keys - id_set
        if missing:
            errors.append("%s.json: missing components %s" % (pid, sorted(missing)))
        if unknown:
            errors.append("%s.json: unknown component ids %s" % (pid, sorted(unknown)))
        for cid, entry in asmt.items():
            if cid not in id_set:
                continue
            v = entry.get("verdict")
            if v not in VERDICTS:
                errors.append("%s.json %s: verdict must be one of %s (got %r)" % (pid, cid, sorted(VERDICTS), v))
            if v in ("pass", "fail") and not entry.get("why"):
                errors.append("%s.json %s: a '%s' verdict needs a 'why'" % (pid, cid, v))
            if "sources" in entry and not isinstance(entry["sources"], list):
                errors.append("%s.json %s: 'sources' must be a list" % (pid, cid))

    return index, assessments, errors


def score(a):
    passes = sum(1 for v in a["assessment"].values() if v.get("verdict") == "pass")
    fails = sum(1 for v in a["assessment"].values() if v.get("verdict") == "fail")
    applicable = passes + fails
    pct = round(passes / applicable * 100) if applicable else None
    return passes, applicable, pct


def render_bundle(index, assessments):
    bundle = {"index": index["projects"], "assessments": assessments}
    return "window.QSAFE_PROJECTS = " + json.dumps(bundle, ensure_ascii=False) + ";\n"


def main():
    check = "--check" in sys.argv
    index, assessments, errors = validate()
    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print("  - " + e)
        sys.exit(1)

    for pid, a in assessments.items():
        passes, applicable, pct = score(a)
        suffix = " (product of %s)" % a["parent"] if a.get("parent") else ""
        print("  %-12s %s%% (%d/%d)%s" % (a["name"], pct, passes, applicable, suffix))

    new = render_bundle(index, assessments)
    current = open(BUNDLE, encoding="utf-8").read() if os.path.exists(BUNDLE) else ""
    if check:
        if current != new:
            print("\nERROR: data/projects/bundle.js is out of date. Run: python3 scripts/build_projects.py")
            sys.exit(1)
        print("\nOK - all projects valid; bundle.js is up to date.")
    else:
        with open(BUNDLE, "w", encoding="utf-8") as f:
            f.write(new)
        print("\nOK - all projects valid; bundle.js regenerated.")


if __name__ == "__main__":
    main()
