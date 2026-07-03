# Head First · Module 17: Defenses

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

Finally, the toolbox. The key idea: **each defense targets specific mechanisms; none covers all five alone.** You layer them.

- **Contextual encoding** — closes 1,2,3 at the output; nothing for DOM sinks.
- **Strict nonce CSP** — capability net for 1,2,3; limits exfil; needs Trusted Types for sink XSS.
- **Trusted Types** — closes mechanism 4 categorically, and *fails closed*.
- **Sanitizers** — for the rare case you must accept rich HTML.

> **Brain Power**
> `script-src 'self' 'unsafe-inline'` — is that a good CSP? (Almost worthless against XSS: `'unsafe-inline'` re-permits mechanisms 1 and 2. Many real CSPs are exactly this.)

**Sharpen your pencil.** Fire the same `<img onerror>` at `/defense/csp-search` with `policy=loose` vs `policy=strict` and watch the console. Then compare sanitizers in `defense_sanitizer_compare.html` on the mXSS payloads.

> **There are no Dumb Questions**
> **Q: Why does Trusted Types "fail closed" beat encoding's "fail open"?**
> A: A forgotten encode call silently ships XSS. A forgotten Trusted-Types policy call *throws*. Safety by default vs. danger by default.

---

## Where to go next
- **Do the lab:** open `/m/module_17_defenses/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
