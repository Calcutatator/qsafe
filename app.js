(function () {
  "use strict";

  var app = document.getElementById("app");
  var crumbsEl = document.getElementById("crumbs");
  var docEl = document.documentElement;
  var themeToggle = document.getElementById("theme-toggle");
  var THEME_KEY = "qsafe-theme";

  var STATUS = {
    breakable: { label: "Breakable", blurb: "A quantum computer can break this as it is built today." },
    depends:   { label: "Depends",   blurb: "Safe or breakable depending on the design choice." },
    safe:      { label: "Safe",      blurb: "Safe at current parameter sizes (only mildly weakened)." }
  };
  var MATURITY = {
    standardized: { rank: 4, label: "Standardized" },
    deployed:     { rank: 3, label: "Deployed" },
    prototype:    { rank: 2, label: "Prototype" },
    research:     { rank: 1, label: "Research" },
    none:         { rank: 0, label: "None" }
  };
  var APPLIC = {
    universal:   { label: "Universal",             blurb: "On essentially every chain." },
    common:      { label: "Common",                blurb: "Widespread, but not protocol-core." },
    conditional: { label: "Architecture-specific", blurb: "Mainly rollups / modular / validity chains; N/A on monolithic L1s." }
  };
  var PRIMITIVE = {
    signatures: "Signatures",
    encryption: "Encryption",
    pairings:   "Pairings",
    hash:       "Hashing",
    depends:    "Depends"
  };
  var VERDICT = {
    pass:    { label: "Pass",    blurb: "Meets the quantum-proof bar as implemented." },
    fail:    { label: "Fail",    blurb: "Breakable as implemented today." },
    na:      { label: "N/A",     blurb: "Not part of this project's architecture." },
    unknown: { label: "Unknown", blurb: "Not yet assessed." }
  };

  var META = null;
  var CORES = [];
  var BY_CORE = {};
  var BY_COMPONENT = {};
  var PROJECTS_INDEX = [];
  var PROJECTS = {};
  var OPEN = {};

  // ---- theme ----
  function storedTheme() {
    try {
      var theme = localStorage.getItem(THEME_KEY);
      return theme === "light" || theme === "dark" ? theme : null;
    } catch (e) {
      return null;
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function activeTheme() {
    return docEl.getAttribute("data-theme") || systemTheme();
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }

  function updateThemeToggle(theme) {
    if (!themeToggle) return;
    var next = theme === "dark" ? "light" : "dark";
    var icon = theme === "dark" ? "☼" : "☾";
    var iconEl = themeToggle.querySelector("span");
    if (iconEl) iconEl.textContent = icon;
    themeToggle.setAttribute("aria-label", "Switch to " + next + " mode");
    themeToggle.setAttribute("title", "Switch to " + next + " mode");
    themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  function initThemeToggle() {
    if (!themeToggle) return;
    updateThemeToggle(activeTheme());
    themeToggle.addEventListener("click", function () {
      var next = activeTheme() === "dark" ? "light" : "dark";
      docEl.setAttribute("data-theme", next);
      saveTheme(next);
      updateThemeToggle(next);
    });

    if (window.matchMedia) {
      var media = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () {
        if (!storedTheme()) updateThemeToggle(systemTheme());
      };
      if (media.addEventListener) media.addEventListener("change", onChange);
      else if (media.addListener) media.addListener(onChange);
    }
  }

  initThemeToggle();

  // ---- helpers ----
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusChip(status) {
    var s = STATUS[status] || { label: status, blurb: "" };
    return '<span class="chip chip--' + esc(status) + '" title="' + esc(s.blurb) + '">' +
      '<span class="chip__dot"></span>' + esc(s.label) + "</span>";
  }

  function verdictChip(v) {
    var x = VERDICT[v] || VERDICT.unknown;
    return '<span class="chip chip--v-' + esc(v) + '" title="' + esc(x.blurb) + '">' +
      '<span class="chip__dot"></span>' + esc(x.label) + "</span>";
  }

  function applicTag(a) {
    var x = APPLIC[a] || { label: a, blurb: "" };
    return '<span class="tag tag--applic tag--' + esc(a) + '" title="' + esc(x.blurb) + '">' + esc(x.label) + "</span>";
  }

  function primTag(p) {
    return '<span class="tag tag--prim" title="Crypto primitive at risk">' + esc(PRIMITIVE[p] || p) + "</span>";
  }

  function maturityEl(m) {
    var x = MATURITY[m] || { rank: 0, label: m };
    var dots = "";
    for (var i = 1; i <= 4; i++) {
      dots += '<i class="meter__dot' + (i <= x.rank ? " is-on" : "") + '"></i>';
    }
    return '<span class="meter" title="Fix maturity: ' + esc(x.label) + '">' +
      '<span class="meter__dots">' + dots + "</span>" +
      '<span class="meter__label">' + esc(x.label) + "</span></span>";
  }

  function pctEl(pct, big) {
    var cls = "pct" + (big ? " pct--big" : "");
    if (pct === null || pct === undefined) {
      return '<span class="' + cls + ' pct--na"><span class="pct__num">n/a</span></span>';
    }
    var band = pct >= 67 ? " is-high" : pct >= 34 ? " is-mid" : " is-low";
    return '<span class="' + cls + band + '">' +
      '<span class="pct__bar"><span class="pct__fill" style="width:' + pct + '%"></span></span>' +
      '<span class="pct__num">' + pct + "%</span></span>";
  }

  // ---- scoring (binary: pass/fail/na) ----
  function coreStats(project, core) {
    var pass = 0, applicable = 0;
    (core.subsections || []).forEach(function (s) {
      var a = project.assessment[s.subsection_id];
      var v = a ? a.verdict : "unknown";
      if (v === "na" || v === "unknown") return;
      applicable++;
      if (v === "pass") pass++;
    });
    return { pass: pass, applicable: applicable, pct: applicable ? Math.round((pass / applicable) * 100) : null };
  }

  function overallStats(project) {
    var pass = 0, applicable = 0;
    CORES.forEach(function (core) {
      var st = coreStats(project, core);
      pass += st.pass; applicable += st.applicable;
    });
    return { pass: pass, applicable: applicable, pct: applicable ? Math.round((pass / applicable) * 100) : null };
  }

  // ---- indexing ----
  function indexData(data) {
    META = data.meta || {};
    CORES = data.cores || [];
    CORES.forEach(function (c) {
      BY_CORE[c.id] = c;
      (c.subsections || []).forEach(function (s) {
        BY_COMPONENT[s.subsection_id] = { core: c, sub: s };
      });
    });
  }

  function indexProjects(pdata) {
    PROJECTS_INDEX = (pdata && pdata.index) || [];
    PROJECTS = (pdata && pdata.assessments) || {};
  }

  // ============ PRINCIPLES views ============
  function renderSummary() {
    var lens = META.lens || {};
    var lensRows = ["signatures", "encryption", "pairings", "hash"].map(function (k) {
      return '<div class="lens__row"><span class="lens__key">' + esc(PRIMITIVE[k] || k) +
        '</span><span class="lens__val">' + esc(lens[k] || "") + "</span></div>";
    }).join("");

    var legend =
      '<div class="legend">' +
        '<div class="legend__group"><span class="legend__title">General case</span>' +
          statusChip("breakable") + statusChip("depends") + statusChip("safe") + "</div>" +
        '<div class="legend__group"><span class="legend__title">Fix maturity</span>' +
          '<span class="legend__scale">' + maturityEl("research") + " &rarr; " + maturityEl("standardized") + "</span></div>" +
      "</div>" +
      '<p class="legend-note">“General case” is the typical quantum status of each component as built on most chains today — the framework’s map of where quantum risk lives. Specific projects are graded on the <a href="#/projects">Projects</a> tab.</p>';

    var cores = CORES.map(function (c) {
      return '<a class="core-row" href="#/core/' + esc(c.id) + '">' +
        '<span class="core-row__id">' + esc(c.id) + "</span>" +
        '<span class="core-row__body">' +
          '<span class="core-row__name">' + esc(c.name) + "</span>" +
          '<span class="core-row__label">' + esc(c.label) + "</span>" +
        "</span>" +
        '<span class="core-row__meta">' +
          applicTag(c.applicability) +
          '<span class="core-row__count">' + (c.subsections || []).length + " components</span>" +
          statusChip(c.at_a_glance) +
        "</span>" +
      "</a>";
    }).join("");

    var html =
      '<section class="intro">' +
        "<h1>How quantum-proof is a blockchain?</h1>" +
        '<p class="lede">Quantum computers don’t break “the blockchain” — they break three kinds of math. ' +
        "Every part of a chain is just a place one of them lives. qsafe breaks a chain into " +
        "<strong>5 core sections</strong> and <strong>30 components</strong>, each rated for what it takes to be quantum-safe.</p>" +
        '<div class="lens">' + lensRows + "</div>" +
        legend +
      "</section>" +
      '<ol class="core-list" aria-label="Core sections">' + cores + "</ol>";

    return { html: html, crumbs: [{ label: "Overview" }], title: "qsafe — quantum-resistance breakdown for blockchains", tab: "principles" };
  }

  function renderCore(core) {
    var subs = core.subsections || [];
    var header =
      '<header class="page-head">' +
        '<div class="page-head__top">' +
          '<span class="page-head__id">Core ' + esc(core.id) + "</span>" +
          statusChip(core.at_a_glance) + applicTag(core.applicability) +
        "</div>" +
        "<h1>" + esc(core.name) + "</h1>" +
        '<p class="page-head__label">' + esc(core.label) + "</p>" +
        (core.notes ? '<p class="note">' + esc(core.notes) + "</p>" : "") +
      "</header>";

    var rowsHeader =
      '<div class="rows-header">' +
        '<span class="cell cell--id">#</span>' +
        '<span class="cell cell--name">Component</span>' +
        '<span class="cell cell--prim">Primitive</span>' +
        '<span class="cell cell--status">General case</span>' +
        '<span class="cell cell--fix">Fix</span>' +
      "</div>";

    var rows = subs.map(function (s) {
      return '<a class="row" href="#/component/' + esc(s.subsection_id) + '">' +
        '<span class="cell cell--id mono">' + esc(s.subsection_id) + "</span>" +
        '<span class="cell cell--name">' +
          '<span class="row__name">' + esc(s.subsection_label) + "</span>" +
          '<span class="row__sub">' + esc(s.one_liner) + "</span>" +
        "</span>" +
        '<span class="cell cell--prim">' + primTag(s.primitive_at_risk) + "</span>" +
        '<span class="cell cell--status">' + statusChip(s.status) + "</span>" +
        '<span class="cell cell--fix">' + maturityEl(s.fix_maturity) + "</span>" +
      "</a>";
    }).join("");

    return {
      html: header + '<div class="rows">' + rowsHeader + rows + "</div>",
      crumbs: [{ label: "Overview", href: "#/" }, { label: core.name }],
      title: core.name + " — qsafe",
      tab: "principles"
    };
  }

  function renderComponent(sid) {
    var ref = BY_COMPONENT[sid];
    var core = ref.core, s = ref.sub;
    var primName = PRIMITIVE[s.primitive_at_risk] || s.primitive_at_risk;
    var lens = (META.lens || {})[s.primitive_at_risk];

    var subs = core.subsections || [];
    var idx = subs.map(function (x) { return x.subsection_id; }).indexOf(sid);
    var prev = idx > 0 ? subs[idx - 1] : null;
    var next = idx >= 0 && idx < subs.length - 1 ? subs[idx + 1] : null;

    var nav =
      '<nav class="prevnext" aria-label="Within this core">' +
        (prev
          ? '<a class="prevnext__link" href="#/component/' + esc(prev.subsection_id) + '">' +
              '<span class="prevnext__dir">&larr; Previous</span>' +
              '<span class="prevnext__name">' + esc(prev.subsection_label) + "</span></a>"
          : "<span></span>") +
        (next
          ? '<a class="prevnext__link prevnext__link--next" href="#/component/' + esc(next.subsection_id) + '">' +
              '<span class="prevnext__dir">Next &rarr;</span>' +
              '<span class="prevnext__name">' + esc(next.subsection_label) + "</span></a>"
          : "<span></span>") +
      "</nav>";

    var html =
      '<article class="component">' +
        '<header class="page-head">' +
          '<div class="page-head__top">' +
            '<span class="page-head__id mono">' + esc(s.subsection_id) + "</span>" +
            statusChip(s.status) + primTag(s.primitive_at_risk) + applicTag(s.applicability) +
          "</div>" +
          "<h1>" + esc(s.subsection_label) + "</h1>" +
          '<p class="page-head__label">' + esc(s.one_liner) + "</p>" +
        "</header>" +
        '<section class="block"><h2>What it is</h2><p>' + esc(s.what_it_is) + "</p></section>" +
        '<section class="block block--accent"><h2>What it takes to be quantum-proof</h2><p>' + esc(s.quantum_proof_requirement) + "</p></section>" +
        '<section class="block block--meta">' +
          '<div class="metagrid">' +
            '<div><span class="metagrid__k">Primitive at risk</span><span class="metagrid__v">' + esc(primName) + "</span></div>" +
            '<div><span class="metagrid__k">General case</span><span class="metagrid__v">' + statusChip(s.status) + "</span></div>" +
            '<div><span class="metagrid__k">Fix maturity</span><span class="metagrid__v">' + maturityEl(s.fix_maturity) + "</span></div>" +
            '<div><span class="metagrid__k">Applies to</span><span class="metagrid__v">' + applicTag(s.applicability) + "</span></div>" +
          "</div>" +
          (lens ? '<p class="lens-note"><span class="lens-note__k">Why ' + esc(primName.toLowerCase()) + " is at risk:</span> " + esc(lens) + "</p>" : "") +
        "</section>" +
        '<section class="block block--context"><h2>In context</h2>' +
          '<p><a class="back-core" href="#/core/' + esc(core.id) + '">Core ' + esc(core.id) + " &middot; " + esc(core.name) + "</a> &mdash; " + esc(core.label) + ".</p>" +
          (core.notes ? '<p class="note">' + esc(core.notes) + "</p>" : "") +
        "</section>" +
        nav +
      "</article>";

    return {
      html: html,
      crumbs: [{ label: "Overview", href: "#/" }, { label: core.name, href: "#/core/" + core.id }, { label: s.subsection_id + " " + s.subsection_label }],
      title: s.subsection_label + " — qsafe",
      tab: "principles"
    };
  }

  // ============ PROJECTS views ============
  function renderProjectsList() {
    function metaCell(p) {
      if (p.status === "assessed" && PROJECTS[p.id]) return pctEl(overallStats(PROJECTS[p.id]).pct);
      return '<span class="proj-row__queued">Assessment queued</span>';
    }
    function leafRow(p, isChild) {
      var cls = "proj-row" + (isChild ? " proj-row--child" : "");
      if (p.status === "assessed" && PROJECTS[p.id]) {
        return '<a class="' + cls + '" href="#/projects/' + esc(p.id) + '">' +
          '<span class="proj-row__body"><span class="proj-row__name">' + esc(p.name) + "</span>" +
          '<span class="proj-row__type">' + esc(p.type) + "</span></span>" +
          '<span class="proj-row__meta">' + metaCell(p) + "</span></a>";
      }
      return '<div class="' + cls + ' proj-row--queued">' +
        '<span class="proj-row__body"><span class="proj-row__name">' + esc(p.name) + "</span>" +
        '<span class="proj-row__type">' + esc(p.type) + "</span></span>" +
        '<span class="proj-row__meta">' + metaCell(p) + "</span></div>";
    }
    var rows = PROJECTS_INDEX.filter(function (p) { return !p.parent; }).map(function (p) {
      var kids = PROJECTS_INDEX.filter(function (c) { return c.parent === p.id; });
      if (!kids.length) return leafRow(p, false);
      var open = !!OPEN[p.id];
      var n = kids.length;
      var header =
        '<div class="proj-row proj-row--chain">' +
          '<a class="chain-link" href="#/projects/' + esc(p.id) + '">' +
            '<span class="proj-row__name">' + esc(p.name) + "</span>" +
            '<span class="proj-row__type">' + esc(p.type) + "</span></a>" +
          '<span class="proj-row__meta">' + metaCell(p) + "</span>" +
          '<button class="proj-toggle" type="button" data-toggle="' + esc(p.id) + '" aria-expanded="' + (open ? "true" : "false") + '" aria-controls="kids-' + esc(p.id) + '">' +
            '<span class="proj-toggle__count">' + n + (n === 1 ? " product" : " products") + "</span>" +
            '<span class="proj-toggle__caret" aria-hidden="true">&#9656;</span></button>' +
        "</div>";
      var children = '<div class="proj-children" id="kids-' + esc(p.id) + '"' + (open ? "" : " hidden") + ">" +
        kids.map(function (c) { return leafRow(c, true); }).join("") + "</div>";
      return header + children;
    }).join("");

    var html =
      '<section class="intro">' +
        "<h1>Projects</h1>" +
        '<p class="lede">Real chains and products graded against the 30 components. ' +
        "A component <strong>passes</strong> if it meets that component’s “what it takes to be quantum-proof” bar; " +
        "the percentage is the share of <em>applicable</em> components that pass (N/A excluded). Chains with products expand to reveal them.</p>" +
      "</section>" +
      '<div class="proj-list" aria-label="Projects">' + rows + "</div>";

    return { html: html, crumbs: [{ label: "Projects" }], title: "Projects — qsafe", tab: "projects" };
  }

  function renderProjectMissing(id) {
    var html =
      '<section class="intro"><h1>Assessment queued</h1>' +
      '<p class="lede">“' + esc(id) + '” hasn’t been assessed yet. <a href="#/projects">Back to projects</a>.</p></section>';
    return { html: html, crumbs: [{ label: "Projects", href: "#/projects" }, { label: id }], title: "Projects — qsafe", tab: "projects" };
  }

  function renderProject(project) {
    var st = overallStats(project);
    var parentLabel = "";
    if (project.parent) {
      var par = PROJECTS_INDEX.filter(function (x) { return x.id === project.parent; })[0];
      parentLabel = '<a class="product-of" href="#/projects/' + esc(project.parent) + '">&#9656; Product of ' + esc(par ? par.name : project.parent) + "</a>";
    }
    var links = "";
    if (project.links) {
      var parts = [];
      Object.keys(project.links).forEach(function (k) {
        parts.push('<a href="' + esc(project.links[k]) + '" target="_blank" rel="noopener">' + esc(k) + "</a>");
      });
      if (parts.length) links = '<div class="proj-links">' + parts.join("") + "</div>";
    }

    var coreRows = CORES.map(function (c) {
      var cs = coreStats(project, c);
      var detail = cs.applicable ? cs.pass + " / " + cs.applicable + " pass" : "not applicable";
      return '<a class="core-row" href="#/projects/' + esc(project.id) + "/core/" + esc(c.id) + '">' +
        '<span class="core-row__id">' + esc(c.id) + "</span>" +
        '<span class="core-row__body">' +
          '<span class="core-row__name">' + esc(c.name) + "</span>" +
          '<span class="core-row__label">' + esc(c.label) + "</span>" +
        "</span>" +
        '<span class="core-row__meta">' +
          '<span class="core-row__count">' + detail + "</span>" + pctEl(cs.pct) +
        "</span></a>";
    }).join("");

    var html =
      '<header class="proj-head">' +
        '<div class="proj-head__top">' + parentLabel + '<span class="page-head__id">' + esc(project.type) + "</span>" +
          (project.reviewed ? '<span class="page-head__id">reviewed ' + esc(project.reviewed) + "</span>" : "") + "</div>" +
        "<h1>" + esc(project.name) + "</h1>" +
        '<div class="proj-head__score">' + pctEl(st.pct, true) +
          '<span class="proj-head__scorelabel">quantum-proof · ' + st.pass + " / " + st.applicable + " applicable components</span></div>" +
        (project.summary ? '<p class="proj-summary">' + esc(project.summary) + "</p>" : "") +
        links +
      "</header>" +
      '<ol class="core-list" aria-label="Core sections">' + coreRows + "</ol>";

    return {
      html: html,
      crumbs: [{ label: "Projects", href: "#/projects" }, { label: project.name }],
      title: project.name + " — qsafe",
      tab: "projects"
    };
  }

  function renderProjectCore(project, core) {
    var cs = coreStats(project, core);
    var header =
      '<header class="page-head">' +
        '<div class="page-head__top"><span class="page-head__id">' + esc(project.name) + " · Core " + esc(core.id) + "</span>" +
          pctEl(cs.pct) + "</div>" +
        "<h1>" + esc(core.name) + "</h1>" +
        '<p class="page-head__label">' + esc(core.label) + "</p>" +
      "</header>";

    var rowsHeader =
      '<div class="rows-header">' +
        '<span class="cell cell--id">#</span><span class="cell cell--name">Component</span>' +
        '<span class="cell cell--scheme">What it uses</span><span class="cell cell--verdict">Verdict</span></div>';

    var rows = (core.subsections || []).map(function (s) {
      var a = project.assessment[s.subsection_id] || { verdict: "unknown" };
      return '<a class="row" href="#/projects/' + esc(project.id) + "/component/" + esc(s.subsection_id) + '">' +
        '<span class="cell cell--id mono">' + esc(s.subsection_id) + "</span>" +
        '<span class="cell cell--name"><span class="row__name">' + esc(s.subsection_label) + (a.inherited ? ' <span class="tag tag--inherited">inherited</span>' : "") + "</span>" +
          '<span class="row__sub">' + esc(s.one_liner) + "</span></span>" +
        '<span class="cell cell--scheme">' + (a.scheme ? '<span class="scheme">' + esc(a.scheme) + "</span>" : '<span class="muted">—</span>') + "</span>" +
        '<span class="cell cell--verdict">' + verdictChip(a.verdict) + "</span></a>";
    }).join("");

    return {
      html: header + '<div class="rows rows--proj">' + rowsHeader + rows + "</div>",
      crumbs: [{ label: "Projects", href: "#/projects" }, { label: project.name, href: "#/projects/" + project.id }, { label: core.name }],
      title: core.name + " · " + project.name + " — qsafe",
      tab: "projects"
    };
  }

  function renderProjectComponent(project, sid) {
    var ref = BY_COMPONENT[sid];
    var core = ref.core, s = ref.sub;
    var a = project.assessment[sid] || { verdict: "unknown", why: "Not yet assessed." };

    var inheritedTag = "";
    if (a.inherited && project.parent) {
      var ipar = PROJECTS_INDEX.filter(function (x) { return x.id === project.parent; })[0];
      inheritedTag = '<a class="tag tag--inherited" href="#/projects/' + esc(project.parent) + '">inherited from ' + esc(ipar ? ipar.name : project.parent) + "</a>";
    }

    var subs = core.subsections || [];
    var idx = subs.map(function (x) { return x.subsection_id; }).indexOf(sid);
    var prev = idx > 0 ? subs[idx - 1] : null;
    var next = idx >= 0 && idx < subs.length - 1 ? subs[idx + 1] : null;
    var pbase = "#/projects/" + project.id + "/component/";

    var nav =
      '<nav class="prevnext" aria-label="Within this core">' +
        (prev ? '<a class="prevnext__link" href="' + pbase + esc(prev.subsection_id) + '"><span class="prevnext__dir">&larr; Previous</span><span class="prevnext__name">' + esc(prev.subsection_label) + "</span></a>" : "<span></span>") +
        (next ? '<a class="prevnext__link prevnext__link--next" href="' + pbase + esc(next.subsection_id) + '"><span class="prevnext__dir">Next &rarr;</span><span class="prevnext__name">' + esc(next.subsection_label) + "</span></a>" : "<span></span>") +
      "</nav>";

    var sources = "";
    if (a.sources && a.sources.length) {
      sources = '<div class="status-sources">' + a.sources.map(function (u) {
        return '<a href="' + esc(u) + '" target="_blank" rel="noopener">source</a>';
      }).join("") + "</div>";
    }

    var html =
      '<article class="component">' +
        '<header class="page-head">' +
          '<div class="page-head__top"><span class="page-head__id mono">' + esc(s.subsection_id) + "</span>" +
            verdictChip(a.verdict) + '<span class="page-head__id">' + esc(project.name) + "</span></div>" +
          "<h1>" + esc(s.subsection_label) + "</h1>" +
          '<p class="page-head__label">' + esc(s.one_liner) + "</p>" +
        "</header>" +
        '<section class="block"><h2>What it is</h2><p>' + esc(s.what_it_is) + "</p></section>" +
        '<section class="block"><h2>What it takes to be quantum-proof</h2><p>' + esc(s.quantum_proof_requirement) + "</p></section>" +
        '<section class="block block--meta status-block">' +
          '<div class="status-block__top"><h2>' + esc(project.name) + "’s status</h2>" + verdictChip(a.verdict) + inheritedTag +
            (a.scheme ? '<span class="status-block__scheme">' + esc(a.scheme) + "</span>" : "") + "</div>" +
          '<p class="status-block__why">' + esc(a.why) + "</p>" + sources +
        "</section>" +
        '<section class="block block--context"><h2>In context</h2>' +
          '<p><a class="back-core" href="#/projects/' + esc(project.id) + "/core/" + esc(core.id) + '">' + esc(project.name) + " · " + esc(core.name) + "</a>" +
          ' &middot; <a href="#/component/' + esc(s.subsection_id) + '">see the general principle &rarr;</a></p>' +
        "</section>" +
        nav +
      "</article>";

    return {
      html: html,
      crumbs: [
        { label: "Projects", href: "#/projects" },
        { label: project.name, href: "#/projects/" + project.id },
        { label: core.name, href: "#/projects/" + project.id + "/core/" + core.id },
        { label: s.subsection_id + " " + s.subsection_label }
      ],
      title: s.subsection_label + " · " + project.name + " — qsafe",
      tab: "projects"
    };
  }

  function renderContribute() {
    var repo = "https://github.com/Calcutatator/qsafe";
    function link(href, text) { return '<a href="' + href + '" target="_blank" rel="noopener">' + text + "</a>"; }
    var html =
      '<section class="intro">' +
        "<h1>Contribute</h1>" +
        '<p class="lede">qsafe is an open-source framework for transparency on the quantum resistance of blockchains and the products built on them. It’s maintained by one person — but contributions are open and encouraged. If you have a project to add, or a detail to correct, follow the pull-request flow below.</p>' +
      "</section>" +
      '<section class="contribute">' +
        '<h2 class="contribute__h">The PR flow</h2>' +
        '<ol class="contribute__steps">' +
          "<li><strong>Copy the template.</strong> " + link(repo + "/blob/main/data/projects/_template.json", "<code>data/projects/_template.json</code>") + " lists all 30 components, each labelled.</li>" +
          "<li><strong>Fill each component</strong> with a verdict (<code>pass</code> / <code>fail</code> / <code>na</code>) plus a scheme, a one-line reason, and sources. For a product built on a chain, set <code>parent</code> — it inherits that chain as its settlement layer.</li>" +
          "<li><strong>Register it</strong> in " + link(repo + "/blob/main/data/projects/index.json", "<code>data/projects/index.json</code>") + ".</li>" +
          "<li><strong>Validate &amp; build</strong> — run <code>python3 scripts/build_projects.py</code>; it checks everything and regenerates the data bundle.</li>" +
          "<li><strong>Open a pull request.</strong> CI re-runs the check automatically, and a PR template walks you through it.</li>" +
        "</ol>" +
        '<div class="contribute__links">' +
          link(repo + "/blob/main/CONTRIBUTING.md", "Full contributor guide &rarr;") +
          link(repo, "GitHub repo &rarr;") +
          link(repo + "/compare", "Open a pull request &rarr;") +
        "</div>" +
        '<p class="contribute__note muted">The five core sections and thirty components are fixed — contributions change project data, not the framework itself.</p>' +
      "</section>";
    return { html: html, crumbs: [{ label: "Contribute" }], title: "Contribute — qsafe", tab: "contribute" };
  }

  // ---- chrome ----
  function setCrumbs(crumbs) {
    var parts = (crumbs || []).map(function (c) {
      return c.href ? '<a href="' + esc(c.href) + '">' + esc(c.label) + "</a>"
                    : '<span aria-current="page">' + esc(c.label) + "</span>";
    });
    crumbsEl.innerHTML = parts.join('<span class="crumbs__sep">/</span>');
  }

  function setActiveTab(tab) {
    [["tab-principles", "principles"], ["tab-projects", "projects"], ["tab-contribute", "contribute"]].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.classList.toggle("is-active", tab === pair[1]);
    });
  }

  function render() {
    var raw = location.hash.replace(/^#\/?/, "");
    var parts = raw.split("/").filter(Boolean);
    var view;

    if (parts[0] === "projects") {
      if (!parts[1]) {
        view = renderProjectsList();
      } else if (PROJECTS[parts[1]]) {
        var proj = PROJECTS[parts[1]];
        if (parts[2] === "core" && BY_CORE[parts[3]]) view = renderProjectCore(proj, BY_CORE[parts[3]]);
        else if (parts[2] === "component" && BY_COMPONENT[parts[3]]) view = renderProjectComponent(proj, parts[3]);
        else view = renderProject(proj);
      } else {
        view = renderProjectMissing(parts[1]);
      }
    } else if (parts[0] === "contribute") {
      view = renderContribute();
    } else if (parts[0] === "core" && BY_CORE[parts[1]]) {
      view = renderCore(BY_CORE[parts[1]]);
    } else if (parts[0] === "component" && BY_COMPONENT[parts[1]]) {
      view = renderComponent(parts[1]);
    } else {
      view = renderSummary();
    }

    setActiveTab(view.tab);
    app.innerHTML = view.html;
    setCrumbs(view.crumbs);
    document.title = view.title;
    window.scrollTo(0, 0);
  }

  // ---- data loading (prefer HTTP fetch; fall back to globals for file://) ----
  function loadTaxonomy() {
    if (window.fetch && location.protocol !== "file:") {
      return fetch("data/taxonomy.json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { return d || window.TAXONOMY; })
        .catch(function () { return window.TAXONOMY; });
    }
    return Promise.resolve(window.TAXONOMY);
  }

  function loadProjects() {
    var fallback = window.QSAFE_PROJECTS || { index: [], assessments: {} };
    if (!(window.fetch && location.protocol !== "file:")) return Promise.resolve(fallback);
    return fetch("data/projects/index.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (idx) {
        if (!idx || !idx.projects) return fallback;
        var assessed = idx.projects.filter(function (p) { return p.status === "assessed"; });
        return Promise.all(assessed.map(function (p) {
          return fetch("data/projects/" + p.id + ".json", { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (a) { return { id: p.id, a: a }; })
            .catch(function () { return { id: p.id, a: null }; });
        })).then(function (results) {
          var assessments = {};
          results.forEach(function (x) { if (x.a) assessments[x.id] = x.a; });
          return { index: idx.projects, assessments: assessments };
        });
      })
      .catch(function () { return fallback; });
  }

  Promise.all([loadTaxonomy(), loadProjects()]).then(function (res) {
    var taxonomy = res[0];
    if (!taxonomy) {
      app.innerHTML = '<p class="error">Could not load taxonomy data. Serve this folder over HTTP ' +
        "(e.g. <code>python3 -m http.server</code>) or make sure <code>data/taxonomy.js</code> exists.</p>";
      return;
    }
    indexData(taxonomy);
    indexProjects(res[1]);
    var ver = document.getElementById("ver");
    if (ver) ver.textContent = META.version || "";
    window.addEventListener("hashchange", render);
    app.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".proj-toggle");
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute("data-toggle");
      OPEN[id] = !OPEN[id];
      btn.setAttribute("aria-expanded", OPEN[id] ? "true" : "false");
      var box = document.getElementById("kids-" + id);
      if (box) { if (OPEN[id]) box.removeAttribute("hidden"); else box.setAttribute("hidden", ""); }
    });
    render();
  });
})();
