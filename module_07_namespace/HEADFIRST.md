# Head First · Module 07: Tag & Namespace Confusion

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

"It's just an image" is the most expensive assumption in web security. An SVG is an XML *document* that can carry `<script>` and event handlers. Served same-origin as `image/svg+xml` and rendered as a document, its script runs in your origin.

And inline `<svg>`/`<math>` flip the parser into **foreign content** mode, where the rules change: some names are case-*sensitive*, self-closing behaves differently, and integration points (`<foreignObject>`, `<mglyph>`) re-enter HTML parsing. Every one of those breaks a sanitizer that only models "HTML".

> **Brain Power**
> Your sanitizer lowercases everything to normalize it. Why does that *break* it in SVG? (Because `viewBox`, `foreignObject` etc. are case-sensitive there — you just mangled valid names and maybe unmasked others.)

**Sharpen your pencil.** Open the upload page, click "open (vulnerable)" on `malicious.svg` (executes), then "open (safe)" (forced download, can't). Diff the response headers.

> **There are no Dumb Questions**
> **Q: How do I safely host user SVGs?**
> A: Separate sandboxed origin, `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`, or rasterize to PNG. Never inline same-origin as `image/svg+xml`.

---

## Where to go next
- **Do the lab:** open `/m/module_07_namespace/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
