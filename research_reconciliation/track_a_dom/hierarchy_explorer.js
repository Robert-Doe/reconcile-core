/* hierarchy_explorer.js — live introspection of the REAL DOM inheritance graph.
   Loaded by track_a_dom/index.html.

   Instead of asserting where a sink lives, we ask the browser. For a set of node
   types we walk the actual prototype chain and record, for each security-
   relevant member, WHICH interface in the chain owns it (via
   getOwnPropertyDescriptor). That is the A1/A2/A5 thesis made empirical: sinks
   are inherited, and the same sink appears on multiple interfaces (mixins).

   Nothing here executes injected markup — it only reads descriptors. */
(function () {
  "use strict";

  // Security-relevant members grouped by sink class (A5 boundary map).
  const SINKS = {
    "HTML-parsing sink": [
      "innerHTML", "outerHTML", "insertAdjacentHTML", "srcdoc",
      "setHTML", // native Sanitizer entry point (where supported)
    ],
    "URL / navigation sink": [
      "href", "src", "action", "formAction", "data", "codeBase", "background",
      "setAttribute", // generic — can set any of the above
    ],
    "script-execution sink": [
      "text", "textContent", // textContent is SAFE; shown for contrast
      "onclick", "onerror", "onload", // reflected event-handler IDL attrs
    ],
    "DOM-mutation (structural)": [
      "append", "prepend", "before", "after", "replaceWith",
      "insertBefore", "appendChild", "replaceChildren",
    ],
  };

  // Build a representative live node for each interface we care about.
  function samples() {
    const a = document.createElement("a");
    const iframe = document.createElement("iframe");
    const div = document.createElement("div");
    const frag = document.createDocumentFragment();
    const tmpl = document.createElement("template");
    const host = document.createElement("div");
    let shadow = null;
    try { shadow = host.attachShadow({ mode: "open" }); } catch (_) {}
    return [
      ["Text", document.createTextNode("t")],
      ["Comment", document.createComment("c")],
      ["Element (div)", div],
      ["HTMLAnchorElement", a],
      ["HTMLIFrameElement", iframe],
      ["DocumentFragment", frag],
      ["ShadowRoot", shadow],
      ["HTMLTemplateElement.content", tmpl.content],
      ["Document", document],
      ["Attr", document.createAttribute("x")],
    ].filter(([, node]) => node != null);
  }

  // For a node + member name, return the constructor name of the prototype in
  // the chain that OWNS the property (or null if absent anywhere).
  function owner(node, member) {
    let o = node;
    while (o) {
      if (Object.prototype.hasOwnProperty.call(o, member)) {
        // o is a prototype object; its constructor names the interface.
        const ctor = o.constructor && o.constructor.name;
        return ctor || "(anon)";
      }
      o = Object.getPrototypeOf(o);
    }
    return null;
  }

  // The full prototype chain of a node, as interface names (A1).
  function chain(node) {
    const names = [];
    let o = Object.getPrototypeOf(node);
    while (o) {
      const c = o.constructor && o.constructor.name;
      names.push(c || "(anon)");
      o = Object.getPrototypeOf(o);
    }
    return names;
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }

  function renderChains(host) {
    const rows = samples().map(([label, node]) =>
      `<tr><td><code>${esc(label)}</code></td><td>${chain(node).map((n) => `<code>${esc(n)}</code>`).join(" → ")}</td></tr>`
    ).join("");
    host.innerHTML =
      `<table><thead><tr><th>Node</th><th>Prototype chain (interface inheritance)</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderSinkMatrix(host, group) {
    const nodes = samples();
    const members = SINKS[group];
    const head = `<tr><th>member</th>${nodes.map(([l]) => `<th>${esc(l.split(" ")[0])}</th>`).join("")}</tr>`;
    const body = members.map((m) => {
      const cells = nodes.map(([, node]) => {
        const own = owner(node, m);
        if (!own) return `<td style="color:#3b4658">—</td>`;
        const safe = (m === "textContent");
        const color = safe ? "#4ade80" : "#f87171";
        return `<td style="color:${color}" title="${esc(m)} defined on ${esc(own)}"><code>${esc(own)}</code></td>`;
      }).join("");
      return `<tr><td><code>${esc(m)}</code></td>${cells}</tr>`;
    }).join("");
    host.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>
      <p class="lead">Each cell = the interface in that node's chain that <em>owns</em> the member.
      Blank = the sink is absent on that node type. Notice how one sink
      (<code>setAttribute</code>, <code>append</code>) is owned by a mixin shared across many nodes,
      and how <code>Text</code>/<code>Comment</code> lack the HTML-parsing sinks entirely.</p>`;
  }

  window.addEventListener("DOMContentLoaded", function () {
    const chainHost = document.getElementById("chains");
    if (chainHost) renderChains(chainHost);

    const sel = document.getElementById("sinkGroup");
    const matrixHost = document.getElementById("sinkMatrix");
    function draw() { renderSinkMatrix(matrixHost, sel.value); }
    if (sel && matrixHost) {
      Object.keys(SINKS).forEach((g) => {
        const o = document.createElement("option"); o.value = g; o.textContent = g; sel.appendChild(o);
      });
      sel.addEventListener("change", draw);
      draw();
    }

    // A3 live DOM clobbering demo.
    const clob = document.getElementById("clobberOut");
    if (clob) {
      const form = document.createElement("form");
      form.innerHTML = '<input name="attributes"><input name="nodeName" id="clobberEl">';
      document.body.appendChild(form);
      const shadowedProp = form.attributes; // clobbered? still the real one for form, but on a container...
      const container = document.createElement("div");
      container.innerHTML = '<a id="config"></a><a id="config" name="x"></a>';
      document.body.appendChild(container);
      clob.textContent =
        "document.getElementById('config') -> " + (document.getElementById("config") ? "an <a> element" : "null") + "\n" +
        "A page that does `if (window.config) {...}` can be tricked: an injected\n" +
        "element with id=config makes window.config a truthy Element, not your value.\n" +
        "Named access (document.forms, element[name]) is the A3 clobbering surface.";
      document.body.removeChild(form);
      document.body.removeChild(container);
    }
  });
})();
