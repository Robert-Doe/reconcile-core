/* content_categories.js — interactive explorer for the HTML content model in
   the SPEC sense: content categories (metadata/flow/sectioning/heading/
   phrasing/embedded/interactive), transparent content, and paragraphs.

   Source of the categorization: HTML5 (2011-05-25 W3C Working Draft),
   "Content models". The element->category data below is factual spec data,
   re-encoded here so we can build a live categorizer / filter. Conditional
   memberships (e.g. <a> is phrasing only if it contains only phrasing content)
   are noted in `cond`. */
(function () {
  "use strict";

  const CATS = ["metadata", "flow", "sectioning", "heading", "phrasing", "embedded", "interactive"];

  const CAT_COLOR = {
    metadata: "#7a9bbf", flow: "#38bdf8", sectioning: "#a78bfa",
    heading: "#f5c842", phrasing: "#2dd4bf", embedded: "#fb923c", interactive: "#f87171",
  };

  // element -> { cats:[...], transparent?:bool, cond?:{cat:'why'} }
  const EL = {
    // metadata
    base: { cats: ["metadata"] },
    link: { cats: ["metadata"] },
    meta: { cats: ["metadata"] },
    title: { cats: ["metadata"] },
    style: { cats: ["metadata", "flow"], cond: { flow: "only if the scoped attribute is present" } },
    script: { cats: ["metadata", "flow", "phrasing"] },
    noscript: { cats: ["metadata", "flow", "phrasing"] },
    // sectioning (all also flow)
    article: { cats: ["flow", "sectioning"] },
    aside: { cats: ["flow", "sectioning"] },
    nav: { cats: ["flow", "sectioning"] },
    section: { cats: ["flow", "sectioning"] },
    // heading (all also flow)
    h1: { cats: ["flow", "heading"] },
    h2: { cats: ["flow", "heading"] },
    h3: { cats: ["flow", "heading"] },
    hgroup: { cats: ["flow", "heading"] },
    // pure flow (not phrasing) — block-level
    p: { cats: ["flow"] },
    div: { cats: ["flow"] },
    ul: { cats: ["flow"] },
    ol: { cats: ["flow"] },
    dl: { cats: ["flow"] },
    table: { cats: ["flow"] },
    blockquote: { cats: ["flow"] },
    figure: { cats: ["flow"] },
    header: { cats: ["flow"] },
    footer: { cats: ["flow"] },
    form: { cats: ["flow"] },
    hr: { cats: ["flow"] },
    pre: { cats: ["flow"] },
    address: { cats: ["flow"] },
    fieldset: { cats: ["flow"] },
    details: { cats: ["flow", "interactive"] },
    // phrasing (all also flow) — inline text-level
    span: { cats: ["flow", "phrasing"] },
    b: { cats: ["flow", "phrasing"] },
    i: { cats: ["flow", "phrasing"] },
    em: { cats: ["flow", "phrasing"] },
    strong: { cats: ["flow", "phrasing"] },
    code: { cats: ["flow", "phrasing"] },
    br: { cats: ["flow", "phrasing"] },
    wbr: { cats: ["flow", "phrasing"] },
    abbr: { cats: ["flow", "phrasing"] },
    cite: { cats: ["flow", "phrasing"] },
    q: { cats: ["flow", "phrasing"] },
    time: { cats: ["flow", "phrasing"] },
    mark: { cats: ["flow", "phrasing"] },
    sub: { cats: ["flow", "phrasing"] },
    sup: { cats: ["flow", "phrasing"] },
    label: { cats: ["flow", "phrasing", "interactive"] },
    output: { cats: ["flow", "phrasing"] },
    // interactive + phrasing form controls
    button: { cats: ["flow", "phrasing", "interactive"] },
    select: { cats: ["flow", "phrasing", "interactive"] },
    textarea: { cats: ["flow", "phrasing", "interactive"] },
    keygen: { cats: ["flow", "phrasing", "interactive"] },
    input: { cats: ["flow", "phrasing", "interactive"], cond: { interactive: "unless type=hidden" } },
    // embedded (all also phrasing & flow); several are interactive under conditions
    img: { cats: ["flow", "phrasing", "embedded"], cond: { interactive: "if the usemap attribute is present" } },
    iframe: { cats: ["flow", "phrasing", "embedded", "interactive"] },
    embed: { cats: ["flow", "phrasing", "embedded", "interactive"] },
    canvas: { cats: ["flow", "phrasing", "embedded"] },
    math: { cats: ["flow", "phrasing", "embedded"] },
    svg: { cats: ["flow", "phrasing", "embedded"] },
    object: { cats: ["flow", "phrasing", "embedded"], transparent: true, cond: { interactive: "if the usemap attribute is present" } },
    video: { cats: ["flow", "phrasing", "embedded"], transparent: true, cond: { interactive: "if the controls attribute is present" } },
    audio: { cats: ["flow", "phrasing", "embedded"], transparent: true, cond: { interactive: "if the controls attribute is present" } },
    // transparent (content model derived from parent)
    a: { cats: ["flow", "phrasing", "interactive"], transparent: true, cond: { phrasing: "if it contains only phrasing content" } },
    ins: { cats: ["flow", "phrasing"], transparent: true, cond: { phrasing: "if it contains only phrasing content" } },
    del: { cats: ["flow", "phrasing"], transparent: true, cond: { phrasing: "if it contains only phrasing content" } },
    map: { cats: ["flow", "phrasing"], transparent: true, cond: { phrasing: "if it contains only phrasing content" } },
  };

  const TRANSPARENT = Object.keys(EL).filter((e) => EL[e].transparent);

  function esc(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function pill(cat, cond) {
    const c = CAT_COLOR[cat] || "#888";
    const t = cond ? ` title="${esc(cond)}"` : "";
    return `<span class="mechtag"${t} style="background:${c}22;color:${c};border-color:${c}66">${cat}${cond ? " *" : ""}</span>`;
  }

  // Categorize a single element name.
  function categorize(name) {
    const e = EL[(name || "").toLowerCase().trim()];
    if (!e) return null;
    return {
      cats: e.cats,
      transparent: !!e.transparent,
      cond: e.cond || {},
    };
  }

  function renderCategorize(host, name) {
    const r = categorize(name);
    if (!r) {
      host.innerHTML = `<p class="lead">No entry for <code>&lt;${esc(name)}&gt;</code> in this teaching subset. Try a, img, span, div, article, audio, script…</p>`;
      return;
    }
    const pills = r.cats.map((c) => pill(c, r.cond[c])).join(" ");
    host.innerHTML =
      `<div style="font-size:1.1rem"><code>&lt;${esc(name)}&gt;</code> is: ${pills}</div>` +
      (r.transparent ? `<p class="lead"><strong style="color:#f5c842">Transparent</strong> — its allowed content is inherited from its parent.</p>` : "") +
      (Object.keys(r.cond).length ? `<p class="lead">* = conditional: ${Object.entries(r.cond).map(([k, v]) => `<em>${k}</em> ${esc(v)}`).join("; ")}.</p>` : "");
  }

  // Filter: all elements in a chosen category.
  function renderFilter(host, cat) {
    const els = Object.keys(EL).filter((e) => EL[e].cats.includes(cat)).sort();
    const chips = els.map((e) => {
      const cond = EL[e].cond && EL[e].cond[cat];
      return `<span class="mechtag" ${cond ? `title="${esc(cond)}"` : ""} style="background:${CAT_COLOR[cat]}22;color:${CAT_COLOR[cat]};border-color:${CAT_COLOR[cat]}66;margin:2px"><code>${e}</code>${cond ? " *" : ""}</span>`;
    }).join(" ");
    host.innerHTML = `<p><strong style="color:${CAT_COLOR[cat]}">${cat} content</strong> (${els.length} in this subset):</p><div>${chips}</div>` +
      `<p class="lead">* = conditional membership (hover for the rule).</p>`;
  }

  window.CC = { CATS, CAT_COLOR, EL, TRANSPARENT, categorize, renderCategorize, renderFilter };

  window.addEventListener("DOMContentLoaded", function () {
    const ci = document.getElementById("ccIn");
    const cb = document.getElementById("ccBtn");
    const co = document.getElementById("ccOut");
    if (cb && co) {
      const run = () => renderCategorize(co, (ci && ci.value) || "a");
      cb.addEventListener("click", run);
      if (ci) ci.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
      run();
    }
    const sel = document.getElementById("ccCat");
    const fo = document.getElementById("ccFilter");
    if (sel && fo) {
      CATS.forEach((c) => { const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); });
      const run = () => renderFilter(fo, sel.value);
      sel.addEventListener("change", run);
      run();
    }
  });
})();
