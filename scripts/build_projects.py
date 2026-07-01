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
import re
import sys
from datetime import date, datetime
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ_DIR = os.path.join(ROOT, "data", "projects")
TAXONOMY = os.path.join(ROOT, "data", "taxonomy.json")
INDEX = os.path.join(PROJ_DIR, "index.json")
BUNDLE = os.path.join(PROJ_DIR, "bundle.js")
SCHEMA_DIR = os.path.join(ROOT, "data", "schema")

VERDICTS = {"pass", "fail", "na"}
STATUSES = {"assessed", "queued"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
PROJECT_FIELDS = {"id", "name", "type", "parent", "reviewed", "summary", "links", "assessment"}
ASSESSMENT_FIELDS = {"_component", "verdict", "inherited", "scheme", "why", "sources"}
SCHEMA_FILES = [
    "project.schema.json",
    "project-index.schema.json",
    "taxonomy.schema.json",
]


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def nonempty_string(value):
    return isinstance(value, str) and bool(value.strip())


def valid_id(value):
    return isinstance(value, str) and bool(ID_RE.match(value))


def valid_url(value):
    if not isinstance(value, str) or not value.strip():
        return False
    parsed = urlparse(value)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def validate_date(value):
    if not isinstance(value, str) or not DATE_RE.match(value):
        return False
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return False
    return parsed <= date.today()


def validate_schema_files(errors):
    for name in SCHEMA_FILES:
        path = os.path.join(SCHEMA_DIR, name)
        if not os.path.exists(path):
            errors.append("data/schema/%s is missing" % name)
            continue
        try:
            load(path)
        except Exception as exc:
            errors.append("data/schema/%s is not valid JSON: %s" % (name, exc))


def component_ids(errors):
    tax = load(TAXONOMY)
    cores = tax.get("cores")
    if not isinstance(cores, list):
        errors.append("taxonomy.json: 'cores' must be a list")
        return []

    ids = []
    core_ids = []
    for core in cores:
        if not isinstance(core, dict):
            errors.append("taxonomy.json: each core must be an object")
            continue
        core_id = core.get("id")
        core_ids.append(core_id)
        subs = core.get("subsections")
        if not isinstance(subs, list):
            errors.append("taxonomy.json core %r: 'subsections' must be a list" % core_id)
            continue
        for s in subs:
            if not isinstance(s, dict):
                errors.append("taxonomy.json core %r: each subsection must be an object" % core_id)
                continue
            sid = s.get("subsection_id")
            if not nonempty_string(sid):
                errors.append("taxonomy.json core %r: subsection missing 'subsection_id'" % core_id)
                continue
            ids.append(sid)

    if len(set(core_ids)) != len(core_ids):
        errors.append("taxonomy.json: duplicate core ids")
    dupes = sorted({sid for sid in ids if ids.count(sid) > 1})
    if dupes:
        errors.append("taxonomy.json: duplicate component ids %s" % dupes)
    if len(ids) != 30:
        errors.append("taxonomy.json: expected 30 components, got %d" % len(ids))
    return ids


def validate():
    errors = []
    warnings = []
    validate_schema_files(errors)
    ids = component_ids(errors)
    id_set = set(ids)
    index = load(INDEX)
    if not isinstance(index, dict):
        errors.append("index.json: root must be an object")
        return {}, {}, errors, warnings
    projects = index.get("projects", [])
    if not isinstance(projects, list):
        errors.append("index.json: 'projects' must be a list")
        return index, {}, errors, warnings

    known = {}
    for p in projects:
        if not isinstance(p, dict):
            errors.append("index.json: each project entry must be an object")
            continue
        pid = p.get("id", "<no id>")
        if valid_id(pid):
            if pid in known:
                errors.append("index.json: duplicate project id '%s'" % pid)
            known[pid] = p

    for p in projects:
        if not isinstance(p, dict):
            continue
        pid = p.get("id", "<no id>")
        for field in ("id", "name", "type", "status"):
            if not nonempty_string(p.get(field)):
                errors.append("index.json: '%s' is missing '%s'" % (pid, field))
        if "id" in p and not valid_id(p.get("id")):
            errors.append("index.json: '%s' id must use lowercase letters, numbers, and hyphens" % pid)
        if p.get("status") not in STATUSES:
            errors.append("index.json: '%s' status must be one of %s" % (pid, sorted(STATUSES)))
        if p.get("status") == "assessed" and not validate_date(p.get("reviewed")):
            errors.append("index.json: '%s' assessed projects need a valid reviewed date (YYYY-MM-DD, not future)" % pid)
        if p.get("parent") and not valid_id(p["parent"]):
            errors.append("index.json: '%s' parent must be a project id" % pid)
        if p.get("parent") == pid:
            errors.append("index.json: '%s' cannot be its own parent" % pid)
        if p.get("parent") and p["parent"] not in known:
            errors.append("index.json: '%s' parent '%s' is not a known project" % (pid, p["parent"]))
        if p.get("parent") and known.get(p["parent"], {}).get("status") != "assessed":
            errors.append("index.json: '%s' parent '%s' must be assessed" % (pid, p["parent"]))

    assessments = {}
    for p in projects:
        if not isinstance(p, dict):
            continue
        if p.get("status") != "assessed":
            continue
        pid = p["id"]
        path = os.path.join(PROJ_DIR, pid + ".json")
        if not os.path.exists(path):
            errors.append("'%s' is status=assessed but data/projects/%s.json is missing" % (pid, pid))
            continue
        a = load(path)
        if not isinstance(a, dict):
            errors.append("%s.json: root must be an object" % pid)
            continue
        assessments[pid] = a
        unknown_fields = set(a.keys()) - PROJECT_FIELDS
        if unknown_fields:
            errors.append("%s.json: unknown top-level fields %s" % (pid, sorted(unknown_fields)))
        for field in ("id", "name", "type", "reviewed", "summary"):
            if not nonempty_string(a.get(field)):
                errors.append("%s.json: missing top-level '%s'" % (pid, field))
        if "id" in a and not valid_id(a.get("id")):
            errors.append("%s.json: 'id' must use lowercase letters, numbers, and hyphens" % pid)
        if a.get("id") != pid:
            errors.append("%s.json: 'id' does not match index.json" % pid)
        for field in ("name", "type", "reviewed"):
            if a.get(field) != p.get(field):
                errors.append("%s.json: '%s' does not match index.json" % (pid, field))
        if a.get("parent") != p.get("parent"):
            errors.append("%s.json: 'parent' does not match index.json" % pid)
        if a.get("parent") and a.get("parent") not in known:
            errors.append("%s.json: parent '%s' is not a known project" % (pid, a.get("parent")))
        if not validate_date(a.get("reviewed")):
            errors.append("%s.json: 'reviewed' must be YYYY-MM-DD and not in the future" % pid)
        links = a.get("links", {})
        if links is not None:
            if not isinstance(links, dict):
                errors.append("%s.json: 'links' must be an object" % pid)
            else:
                for label, url in links.items():
                    if not nonempty_string(label):
                        errors.append("%s.json: link labels must be non-empty strings" % pid)
                    if not valid_url(url):
                        errors.append("%s.json: link '%s' must be an http(s) URL" % (pid, label))
        asmt = a.get("assessment", {})
        if not isinstance(asmt, dict):
            errors.append("%s.json: 'assessment' must be an object" % pid)
            continue
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
            if not isinstance(entry, dict):
                errors.append("%s.json %s: assessment entry must be an object" % (pid, cid))
                continue
            unknown_entry_fields = set(entry.keys()) - ASSESSMENT_FIELDS
            if unknown_entry_fields:
                errors.append("%s.json %s: unknown fields %s" % (pid, cid, sorted(unknown_entry_fields)))
            v = entry.get("verdict")
            if v not in VERDICTS:
                errors.append("%s.json %s: verdict must be one of %s (got %r)" % (pid, cid, sorted(VERDICTS), v))
                continue
            if not nonempty_string(entry.get("why")):
                errors.append("%s.json %s: a '%s' verdict needs a 'why'" % (pid, cid, v))
            if v in ("pass", "fail") and not nonempty_string(entry.get("scheme")):
                errors.append("%s.json %s: a '%s' verdict needs a 'scheme'" % (pid, cid, v))
            if "inherited" in entry and not isinstance(entry["inherited"], bool):
                errors.append("%s.json %s: 'inherited' must be true or false" % (pid, cid))
            if "sources" in entry:
                if not isinstance(entry["sources"], list):
                    errors.append("%s.json %s: 'sources' must be a list" % (pid, cid))
                else:
                    for source in entry["sources"]:
                        if not valid_url(source):
                            errors.append("%s.json %s: source must be an http(s) URL: %r" % (pid, cid, source))
            if v in ("pass", "fail") and not entry.get("sources"):
                warnings.append("%s.json %s: consider adding at least one primary source" % (pid, cid))

    return index, assessments, errors, warnings


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
    index, assessments, errors, warnings = validate()
    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print("  - " + e)
        sys.exit(1)
    if warnings:
        print("VALIDATION WARNINGS:")
        for w in warnings:
            print("  - " + w)
        print("")

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
