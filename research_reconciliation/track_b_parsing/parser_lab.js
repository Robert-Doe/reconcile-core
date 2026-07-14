/* parser_lab.js — hands-on with the real HTML parser (Track B).
   Loaded by track_b_parsing/index.html.

   Three live tools, all using the browser's genuine parser via inert
   <template> so nothing executes:

     1. roundTrip(x)      : the mXSS oracle. parse -> serialize -> reparse, and
                            iterate to a fixed point. If parse1 != parse2 the
                            string is NON-IDEMPOTENT under serialization (B6).
     2. fragmentContext() : parse the SAME string inside different context
                            elements (body/table/select/svg) and show that the
                            resulting tree differs (B5).
     3. tokenizerState()  : demonstrate RAWTEXT/RCDATA/script-data behavior by
                            placing a payload inside <style>/<textarea>/<title>/
                            <script> and showing whether a child element formed.
*/
(function () {
  "use strict";

  function parseInert(htmlStr, contextTag) {
    if (contextTag && contextTag !== "template") {
      // Parse within a specific context element to expose fragment-context rules.
      const host = document.createElement(contextTag);
      host.innerHTML = htmlStr;
      return host;
    }
    const t = document.createElement("template");
    t.innerHTML = htmlStr;
    return t.content;
  }

  function serialize(node) {
    const box = document.createElement("div");
    box.appendChild(node.cloneNode(true));
    return box.innerHTML;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function hasHandlerOrScript(htmlStr) {
    const t = document.createElement("template");
    t.innerHTML = htmlStr;
    const els = t.content.querySelectorAll("*");
    for (const el of els) {
      if (el.tagName === "SCRIPT") return true;
      for (const a of el.attributes) if (a.name.toLowerCase().startsWith("on")) return true;
    }
    return false;
  }

  // 1. Round-trip / fixed-point oracle -------------------------------------
  function roundTrip(input) {
    const seen = [];
    let cur = input;
    for (let i = 0; i < 6; i++) {
      const next = serialize(parseInert(cur));
      seen.push(next);
      if (next === cur) break;
      cur = next;
    }
    const stable = seen.length >= 2 ? seen[seen.length - 1] === seen[seen.length - 2] : true;
    const firstParse = serialize(parseInert(input));
    const idempotent = firstParse === serialize(parseInert(firstParse));
    return {
      input,
      firstParse,
      iterations: seen,
      idempotent,
      handlerAppeared: !hasHandlerOrScript(input) && hasHandlerOrScript(firstParse),
      reachedFixedPoint: stable,
    };
  }

  // 2. Fragment-context divergence -----------------------------------------
  function fragmentContext(input) {
    const contexts = ["template", "table", "select", "svg"];
    return contexts.map((ctx) => {
      let out;
      try { out = serialize(parseInert(input, ctx)); }
      catch (e) { out = "(error: " + e.name + ")"; }
      return { ctx, out };
    });
  }

  // 3. Tokenizer-state behavior --------------------------------------------
  function tokenizerState(payload) {
    // Place `payload` inside elements that switch the tokenizer into special
    // states, and report whether a real child ELEMENT was created (vs. text).
    const hosts = [
      ["<div> (data state)", "div"],
      ["<textarea> (RCDATA)", "textarea"],
      ["<title> (RCDATA)", "title"],
      ["<style> (RAWTEXT)", "style"],
      ["<xmp> (RAWTEXT)", "xmp"],
      ["<script> (script-data)", "script"],
    ];
    return hosts.map(([label, tag]) => {
      const host = document.createElement(tag);
      host.innerHTML = payload;
      const childEls = host.querySelectorAll ? host.querySelectorAll("*").length : 0;
      const entityDecoded = host.textContent.indexOf("<") !== -1 || host.textContent !== payload;
      return { label, childEls, text: host.textContent.slice(0, 60) };
    });
  }

  function table(headers, rows) {
    return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  window.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    // Round-trip tool
    const rtBtn = $("rtBtn");
    if (rtBtn) {
      const run = () => {
        const r = roundTrip($("rtIn").value);
        const iters = r.iterations.map((s, i) => `<tr><td>parse ${i + 1}</td><td><code>${esc(s) || "(empty)"}</code></td></tr>`).join("");
        $("rtOut").innerHTML =
          `<div><strong>Idempotent under serialization?</strong> <code style="color:${r.idempotent ? "#4ade80" : "#f87171"}">${r.idempotent}</code>
             &nbsp; <strong>Handler/script appeared on reparse?</strong> <code style="color:${r.handlerAppeared ? "#f87171" : "#4ade80"}">${r.handlerAppeared}</code></div>` +
          table(["step", "serialized tree"], iters) +
          `<p class="lead">${r.idempotent ? "Stable: the string is its own serialization fixed point." : "NON-idempotent: the browser rebuilds a different tree on reparse — an mXSS candidate. This is exactly the input class a string sanitizer cannot reason about."}</p>`;
      };
      rtBtn.addEventListener("click", run);
      run();
    }

    // Fragment-context tool
    const fcBtn = $("fcBtn");
    if (fcBtn) {
      const run = () => {
        const rows = fragmentContext($("fcIn").value)
          .map((r) => `<tr><td><code>${esc(r.ctx)}</code></td><td><code>${esc(r.out) || "(empty)"}</code></td></tr>`).join("");
        $("fcOut").innerHTML = table(["context element", "resulting serialized tree"], rows) +
          `<p class="lead">The same string parses to different trees depending on the context element (fragment-parsing rules, B5). A sanitizer that assumes a &lt;body&gt; context is wrong inside &lt;table&gt;/&lt;select&gt;/&lt;svg&gt;.</p>`;
      };
      fcBtn.addEventListener("click", run);
      run();
    }

    // Tokenizer-state tool
    const tsBtn = $("tsBtn");
    if (tsBtn) {
      const run = () => {
        const rows = tokenizerState($("tsIn").value)
          .map((r) => `<tr><td>${esc(r.label)}</td><td style="color:${r.childEls ? "#f87171" : "#4ade80"}">${r.childEls}</td><td><code>${esc(r.text)}</code></td></tr>`).join("");
        $("tsOut").innerHTML = table(["host (tokenizer state)", "child elements formed", "textContent"], rows) +
          `<p class="lead">In RCDATA/RAWTEXT/script-data states the payload stays TEXT (0 child elements) until the matching end-tag — which is why "unmasking" one of these regions is an mXSS primitive (B2).</p>`;
      };
      tsBtn.addEventListener("click", run);
      run();
    }
  });

  window.ParserLab = { roundTrip, fragmentContext, tokenizerState };
})();
