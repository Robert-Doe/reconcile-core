# Head First · Module 06: URI Scheme Injection

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

No angle brackets, no event handlers — just a URL. If a sink navigates and you control the scheme, `javascript:` turns "navigation" into "execution," and `data:text/html` turns it into an attacker-authored document.

Sinks that navigate: `href`, `src`, `action`, `formaction`, `xlink:href`, plus JS `location=`, `window.open()`.

> **Brain Power**
> `java&#115;cript:alert(1)`. The word "javascript" isn't even spelled correctly in your bytes. Why does it still fire?

Because the parser **decodes entities in attribute values before your scheme check sees them**. `&#115;` becomes `s`. So a scheme check must run on the *fully decoded, trimmed, lowercased* value — and be an **allowlist**, never a denylist.

**Sharpen your pencil.** Fire `/go?url=javascript:alert(document.domain)` and click the link. Then `/go-safe?url=` with the same payload — it falls back to `/`. The only difference is a scheme allowlist applied after decoding.

> **There are no Dumb Questions**
> **Q: Why is a denylist of "bad" schemes worse than an allowlist of "good" ones?**
> A: You can't enumerate every dangerous or future scheme (`vbscript:`, `blob:`, ...). Allow `http/https/mailto/relative` and reject the rest by default. Unknown = denied.

---

## Where to go next
- **Do the lab:** open `/m/module_06_uri_schemes/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
