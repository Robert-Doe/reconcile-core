# Head First · Module 13: Mutation XSS (mXSS)

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

The subtlest class. A string that is provably *safe* when a sanitizer inspects it, and provably *dangerous* the moment the browser re-parses its serialization. This is why string sanitization is structurally, not just practically, broken.

The core inequality: **`reserialize(parse(x)) ≠ x`.** A sanitizer does parse→clean→serialize; the sink parses *again*. If the second parse differs, the cleaning applied to a tree the browser never renders.

> **Brain Power**
> `<noscript><p title="</noscript><img src=x onerror=alert(1)>">`. With scripting *on* (a normal tab, where the sanitizer runs), `<noscript>` content is raw text, so the sanitizer sees no `<img>`. Re-parsed elsewhere, the `</noscript>` closes early and the image becomes real. Where did the handler come from?

**Sharpen your pencil.** In `attack_10_mxss.html`, run the analyzer. Watch "handler after re-parse" flip to `true` while the sanitizer's own inspection said `false`. That gap *is* the bug.

> **There are no Dumb Questions**
> **Q: Does DOMPurify fix this?**
> A: It patches known gadgets and is the right tool — but new mXSS gadgets keep appearing because the inequality never goes away. The research question: can a sanitizer be idempotent under re-serialization *by construction*?

---

## Where to go next
- **Do the lab:** open `/m/module_13_mxss/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
