/* content_models.js — live demonstrations of HTML content models.
   Shared by the content_models/*.html pages.

   Everything uses the REAL browser parser via an inert <template> so nothing
   executes. We parse the SAME payload inside different host elements to expose
   the four content models the Dennis Snell article discusses:

     DATA     (normal content)  : tags parsed, entities decoded
     RCDATA   (title, textarea) : tags NOT parsed, entities decoded
     RAWTEXT  (style, xmp, ...)  : tags NOT parsed, entities NOT decoded
     script-data (script)        : like RAWTEXT with extra sub-states
     PLAINTEXT (latching)        : rest of document is literal
     CDATA section (<![CDATA[]]>): real only in foreign content (SVG/MathML);
                                   a "bogus comment" in HTML.

   Detection strategy: a probe payload that carries BOTH a tag and an entity, so
   we can see, per model, whether the tag formed an element and whether the
   entity decoded. */
(function () {
  "use strict";

  // Probe: <b> is a tag; &amp; and &lt; are entities. This lets us see both axes.
  const DEFAULT_PROBE = "<b>bold</b> &amp; &lt;i&gt;";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // Parse `payload` as the CONTENT of `hostTag`, inertly, and report behavior.
  function probeModel(hostTag, payload) {
    const t = document.createElement("template");
    // Build "<host>PAYLOAD</host>" so the payload is parsed in host's content model.
    t.innerHTML = "<" + hostTag + ">" + payload + "</" + hostTag + ">";
    const host = t.content.querySelector(hostTag) || t.content.firstElementChild;
    const childEls = host ? host.querySelectorAll("*").length : 0;
    const text = host ? host.textContent : "";
    // entitiesDecoded: did "&amp;" collapse to "&"? (present in decoded text, absent as entity)
    const entitiesDecoded = payload.indexOf("&amp;") !== -1
      ? (text.indexOf("&amp;") === -1 && text.indexOf("&") !== -1)
      : null;
    return { hostTag, childEls, tagsParsed: childEls > 0, entitiesDecoded, text };
  }

  const MODELS = [
    ["DATA", "div", "normal element content"],
    ["RCDATA", "title", "<title> — entities decode, tags don't"],
    ["RCDATA", "textarea", "<textarea> — same as <title>"],
    ["RAWTEXT", "style", "<style> — neither tags nor entities"],
    ["RAWTEXT", "xmp", "<xmp> (deprecated) — raw text"],
    ["script-data", "script", "<script> — raw text + escape sub-states"],
  ];

  function classify(payload) {
    return MODELS.map(([model, tag, note]) => {
      const r = probeModel(tag, payload);
      return { model, tag, note, ...r };
    });
  }

  function renderClassify(hostEl, payload) {
    const rows = classify(payload).map((r) => {
      const tp = r.tagsParsed
        ? '<span style="color:#f87171">yes</span>'
        : '<span style="color:#4ade80">no (text)</span>';
      const ed = r.entitiesDecoded == null ? "—"
        : r.entitiesDecoded ? '<span style="color:#fb923c">yes</span>'
                            : '<span style="color:#4ade80">no</span>';
      return `<tr>
        <td><code>&lt;${esc(r.tag)}&gt;</code></td>
        <td><strong>${esc(r.model)}</strong></td>
        <td>${tp}</td><td>${ed}</td>
        <td><code>${esc(r.text).slice(0, 60)}</code></td></tr>`;
    }).join("");
    hostEl.innerHTML = `<table>
      <thead><tr><th>host</th><th>content model</th><th>tag became an element?</th><th>entities decoded?</th><th>resulting textContent</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="lead">Same bytes, four behaviors. "tag became an element" = the
      parser left the text state; "entities decoded" = character references were
      resolved. Only DATA does both; RAWTEXT/script do neither; RCDATA is the
      confusing middle (decodes entities but not tags).</p>`;
  }

  // CDATA section: HTML (bogus comment) vs foreign content (real section).
  function describeNodes(parent) {
    const out = [];
    parent.childNodes.forEach((n) => {
      if (n.nodeType === Node.ELEMENT_NODE) out.push("<" + n.nodeName.toLowerCase() + ">");
      else if (n.nodeType === Node.TEXT_NODE) out.push('#text "' + n.textContent.trim() + '"');
      else if (n.nodeType === Node.COMMENT_NODE) out.push("<!--" + n.textContent + "-->");
      else if (n.nodeType === Node.CDATA_SECTION_NODE) out.push("<![CDATA[" + n.textContent + "]]>");
      else out.push("node(" + n.nodeType + ')');
    });
    return out;
  }

  function cdataCompare(inner) {
    const html = document.createElement("template");
    html.innerHTML = "<div>" + inner + "</div>";
    const htmlDiv = html.content.querySelector("div");

    const svg = document.createElement("template");
    svg.innerHTML = "<svg>" + inner + "</svg>";
    const svgEl = svg.content.querySelector("svg");

    return {
      html: htmlDiv ? describeNodes(htmlDiv) : [],
      svg: svgEl ? describeNodes(svgEl) : [],
    };
  }

  function renderCdata(hostEl, inner) {
    const r = cdataCompare(inner);
    hostEl.innerHTML = `
      <div><strong>In HTML</strong> (<code>&lt;div&gt;…&lt;/div&gt;</code>): the
      <code>&lt;![CDATA[</code> is NOT a CDATA section — it becomes a
      <em>bogus comment</em> up to the first <code>&gt;</code>.</div>
      <pre>${esc(r.html.join("\n")) || "(empty)"}</pre>
      <div><strong>In foreign content</strong> (<code>&lt;svg&gt;…&lt;/svg&gt;</code>):
      a REAL CDATA section — everything is literal text until <code>]]&gt;</code>.</div>
      <pre>${esc(r.svg.join("\n")) || "(empty)"}</pre>
      <p class="lead">Identical bytes, opposite meaning. This HTML-vs-foreign split
      is a classic sanitizer blind spot: content you think is "just text in a CDATA
      section" can be live markup in HTML, and vice-versa.</p>`;
  }

  window.CM = { DEFAULT_PROBE, classify, renderClassify, cdataCompare, renderCdata, probeModel };

  // Auto-wire any page that has the standard ids.
  window.addEventListener("DOMContentLoaded", function () {
    const ci = document.getElementById("cmIn");
    const cb = document.getElementById("cmBtn");
    const co = document.getElementById("cmOut");
    if (cb && co) {
      const run = () => renderClassify(co, (ci && ci.value) || DEFAULT_PROBE);
      cb.addEventListener("click", run);
      run();
    }
    const di = document.getElementById("cdIn");
    const db = document.getElementById("cdBtn");
    const dobj = document.getElementById("cdOut");
    if (db && dobj) {
      const run = () => renderCdata(dobj, (di && di.value) || "But there <em>are</em> tags in here");
      db.addEventListener("click", run);
      run();
    }
  });
})();
