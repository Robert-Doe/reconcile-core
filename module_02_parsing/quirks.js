/* quirks.js — live demonstrations of HTML parser error recovery.
   Loaded by parser_demo.html.

   Core teaching claim: the HTML5 parser NEVER fails. Given any byte sequence it
   produces *some* DOM tree by following a fully-specified error-recovery
   algorithm. That determinism is great for web compatibility and terrible for
   security, because "malformed" input does not get rejected — it gets
   *transformed*, and the transformation can manufacture a script-capable node
   that was not literally present in the input.

   Every function below parses a string the way a sink would (via innerHTML /
   DOMParser) and reports the DOM that actually resulted, so you can SEE the
   recovery. Payloads use a neutralized marker (data-xss) instead of a live
   handler so this analysis page itself never executes injected code.
*/
(function () {
  "use strict";

  // Parse `html` as a fragment the same way `el.innerHTML = html` would, but
  // WITHOUT running anything: template content is inert (scripts don't execute,
  // resources don't load), yet the tree is built by the real parser.
  function parseInert(html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t.content;
  }

  // Serialize a node tree back to HTML so we can show "what it became".
  function serialize(fragment) {
    const box = document.createElement("div");
    box.appendChild(fragment.cloneNode(true));
    return box.innerHTML;
  }

  // Pretty structural outline of the resulting tree.
  function outline(node, depth) {
    depth = depth || 0;
    let out = "";
    node.childNodes.forEach((n) => {
      const pad = "  ".repeat(depth);
      if (n.nodeType === Node.ELEMENT_NODE) {
        const attrs = [...n.attributes]
          .map((a) => ` ${a.name}="${a.value}"`)
          .join("");
        out += `${pad}<${n.tagName.toLowerCase()}${attrs}>\n`;
        out += outline(n, depth + 1);
      } else if (n.nodeType === Node.TEXT_NODE) {
        const txt = n.textContent.trim();
        if (txt) out += `${pad}#text "${txt}"\n`;
      } else if (n.nodeType === Node.COMMENT_NODE) {
        out += `${pad}<!-- ${n.textContent} -->\n`;
      }
    });
    return out;
  }

  // The canonical demonstrations. Each shows input, the reserialized DOM, and a
  // one-line "what the parser DID and why it matters".
  const CASES = [
    {
      title: "Implicit tag closing",
      input: "<p>one<p>two<p>three",
      note:
        "You never closed any <p>. The parser auto-closes each <p> when it " +
        "sees the next one (the 'in body' insertion mode treats <p> as " +
        "auto-closing). Result: three sibling <p> nodes, not nested ones.",
    },
    {
      title: "Foster parenting out of a table",
      input: "<table><b>escaped</b><td>cell</td></table>",
      note:
        "Content that is illegal inside <table> (the <b>) is 'foster " +
        "parented' — moved to BEFORE the table in the tree. A sanitizer that " +
        "reasoned about your string as-written is now wrong about where nodes " +
        "ended up. This relocation is a real mXSS primitive (Module 13).",
    },
    {
      title: "Attributes on an unclosed tag",
      input: "<img src=x data-xss=1",
      note:
        "No closing '>'. The parser still finalizes the tag at end-of-input " +
        "and keeps the attributes. Missing '>' does not neutralize an " +
        "injection.",
    },
    {
      title: "Unquoted attribute swallows following text",
      input: "<a href=/path onclick=x>link</a>",
      note:
        "Unquoted attribute values end at whitespace. Understanding exactly " +
        "where an unquoted value ends is how you inject a SECOND attribute " +
        "(e.g. an event handler) without any quotes — Module 08.",
    },
    {
      title: "Character references decode in attribute values",
      input: '<a href="javascript&colon;alert(1)">x</a>',
      note:
        "&colon; decodes to ':' during parsing, reconstructing " +
        "'javascript:'. The parser decodes entities in attribute values BEFORE " +
        "any scheme check your code does on the raw string — Module 06 & 12.",
    },
    {
      title: "Case-insensitive tags, case-SENSITIVE foreign content",
      input: "<SVG><CIRCLE></svg>",
      note:
        "HTML tag names are ASCII-case-insensitive, so <SVG> == <svg>. But " +
        "inside foreign (SVG/MathML) content some names ARE case-sensitive, " +
        "which breaks naive lowercasing sanitizers — Module 07.",
    },
    {
      title: "Comment that isn't a comment (in foreign content)",
      input: "<svg><style><!--</style><img data-xss=1></svg>",
      note:
        "Parsing rules for <style>/<script> raw-text and for foreign content " +
        "differ from HTML body, so where a 'comment' starts/ends shifts. This " +
        "context confusion is a classic sanitizer bypass.",
    },
    {
      title: "Duplicate attributes: first wins",
      input: '<img src="ok" src="x" data-xss="dup">',
      note:
        "When an attribute is repeated, the parser keeps the FIRST and drops " +
        "later duplicates. Filters that inspect 'the src' may inspect a " +
        "different occurrence than the one the DOM keeps.",
    },
  ];

  function renderInto(container) {
    CASES.forEach((c, i) => {
      const frag = parseInert(c.input);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        `<h3>${i + 1}. ${escapeHtml(c.title)}</h3>` +
        `<div><strong>You send:</strong> <code>${escapeHtml(c.input)}</code></div>` +
        `<div style="margin:.4rem 0"><strong>Parser builds:</strong></div>` +
        `<pre>${escapeHtml(outline(frag).trimEnd() || "(empty)")}</pre>` +
        `<div><strong>Reserialized:</strong> <code>${escapeHtml(serialize(frag))}</code></div>` +
        `<p class="lead">${escapeHtml(c.note)}</p>`;
      container.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])
    );
  }

  window.addEventListener("DOMContentLoaded", function () {
    const host = document.getElementById("cases");
    if (host) renderInto(host);

    // Interactive box: let the student paste any string and see the tree.
    const btn = document.getElementById("parseBtn");
    if (btn) {
      btn.addEventListener("click", function () {
        const raw = document.getElementById("parseIn").value;
        const frag = parseInert(raw);
        document.getElementById("parseTree").textContent =
          outline(frag).trimEnd() || "(empty tree)";
        document.getElementById("parseSerial").textContent = serialize(frag);
      });
    }
  });
})();
