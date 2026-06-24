(function () {
  "use strict";

  var app = document.getElementById("app");
  var crumbsEl = document.getElementById("crumbs");

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

  var META = null;
  var CORES = [];
  var BY_CORE = {};
  var BY_COMPONENT = {};

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

  // ---- views ----
  function renderSummary() {
    var lens = META.lens || {};
    var lensRows = ["signatures", "encryption", "pairings", "hash"].map(function (k) {
      return '<div class="lens__row"><span class="lens__key">' + esc(PRIMITIVE[k] || k) +
        '</span><span class="lens__val">' + esc(lens[k] || "") + "</span></div>";
    }).join("");

    var legend =
      '<div class="legend">' +
        '<div class="legend__group"><span class="legend__title">Status</span>' +
          statusChip("breakable") + statusChip("depends") + statusChip("safe") + "</div>" +
        '<div class="legend__group"><span class="legend__title">Fix maturity</span>' +
          '<span class="legend__scale">' + maturityEl("research") + " &rarr; " + maturityEl("standardized") + "</span></div>" +
      "</div>";

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

    return { html: html, crumbs: [], title: "qsafe — quantum-resistance breakdown for blockchains" };
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
        '<span class="cell cell--status">Status</span>' +
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
      crumbs: [{ label: core.name }],
      title: core.name + " — qsafe"
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

        '<section class="block">' +
          "<h2>What it is</h2><p>" + esc(s.what_it_is) + "</p>" +
        "</section>" +

        '<section class="block block--accent">' +
          "<h2>What it takes to be quantum-proof</h2><p>" + esc(s.quantum_proof_requirement) + "</p>" +
        "</section>" +

        '<section class="block block--meta">' +
          '<div class="metagrid">' +
            '<div><span class="metagrid__k">Primitive at risk</span><span class="metagrid__v">' + esc(primName) + "</span></div>" +
            '<div><span class="metagrid__k">Status</span><span class="metagrid__v">' + statusChip(s.status) + "</span></div>" +
            '<div><span class="metagrid__k">Fix maturity</span><span class="metagrid__v">' + maturityEl(s.fix_maturity) + "</span></div>" +
            '<div><span class="metagrid__k">Applies to</span><span class="metagrid__v">' + applicTag(s.applicability) + "</span></div>" +
          "</div>" +
          (lens
            ? '<p class="lens-note"><span class="lens-note__k">Why ' + esc(primName.toLowerCase()) +
              " is at risk:</span> " + esc(lens) + "</p>"
            : "") +
        "</section>" +

        '<section class="block block--context">' +
          "<h2>In context</h2>" +
          '<p><a class="back-core" href="#/core/' + esc(core.id) + '">Core ' + esc(core.id) + " &middot; " +
            esc(core.name) + "</a> &mdash; " + esc(core.label) + ".</p>" +
          (core.notes ? '<p class="note">' + esc(core.notes) + "</p>" : "") +
        "</section>" +

        nav +
      "</article>";

    return {
      html: html,
      crumbs: [
        { label: core.name, href: "#/core/" + core.id },
        { label: s.subsection_id + " " + s.subsection_label }
      ],
      title: s.subsection_label + " — qsafe"
    };
  }

  function setCrumbs(crumbs) {
    var parts = ['<a href="#/">Overview</a>'];
    crumbs.forEach(function (c) {
      parts.push(c.href
        ? '<a href="' + esc(c.href) + '">' + esc(c.label) + "</a>"
        : '<span aria-current="page">' + esc(c.label) + "</span>");
    });
    crumbsEl.innerHTML = parts.join('<span class="crumbs__sep">/</span>');
  }

  function render() {
    var raw = location.hash.replace(/^#\/?/, "");
    var parts = raw.split("/").filter(Boolean);
    var view;
    if (parts[0] === "core" && BY_CORE[parts[1]]) {
      view = renderCore(BY_CORE[parts[1]]);
    } else if (parts[0] === "component" && BY_COMPONENT[parts[1]]) {
      view = renderComponent(parts[1]);
    } else {
      view = renderSummary();
    }
    app.innerHTML = view.html;
    setCrumbs(view.crumbs);
    document.title = view.title;
    window.scrollTo(0, 0);
  }

  function boot(data) {
    if (!data) {
      app.innerHTML = '<p class="error">Could not load taxonomy data. Serve this folder over HTTP ' +
        "(e.g. <code>python3 -m http.server</code>) or make sure <code>data/taxonomy.js</code> exists.</p>";
      return;
    }
    indexData(data);
    var ver = document.getElementById("ver");
    if (ver) ver.textContent = META.version || "";
    window.addEventListener("hashchange", render);
    render();
  }

  // Prefer the canonical JSON when served over HTTP; fall back to the
  // window.TAXONOMY copy so the site also runs from file://.
  if (window.fetch && location.protocol !== "file:") {
    fetch("data/taxonomy.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { boot(d || window.TAXONOMY); })
      .catch(function () { boot(window.TAXONOMY); });
  } else {
    boot(window.TAXONOMY);
  }
})();
