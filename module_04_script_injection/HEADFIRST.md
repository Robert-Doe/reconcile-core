# Head First · Module 04: Script Tag Injection

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

The hello-world of XSS. The server takes your `?q=` and pastes it straight into the HTML. Your `<script>` becomes part of the document the browser parses — so it runs.

One line is the whole bug:
`html = PAGE % q   # no encoding`

> **Brain Power**
> Set `element.innerHTML = '<script>alert(1)</script>'` in the console. It does *not* run. But `/search?q=<script>...` *does*. Same string — why the difference?

Because the reflected one is present during the **initial parse**; the HTML spec forbids parser-inserted `<script>` from an `innerHTML` fragment. That distinction (initial-parse vs. later insertion) trips up everyone once, then never again.

**Sharpen your pencil.** Open `/search?q=<script>alert(document.domain)</script>` and View Source. Now open `/search-safe?q=` with the same payload and View Source. Spot the one substitution: `<` became `&lt;`. That's contextual output encoding, and it's a *server-side transform of the output*, not input filtering.

> **There are no Dumb Questions**
> **Q: So if I just block the word "script", I'm done?**
> A: You've addressed one mechanism, badly (case/splitting/encoding beat string matching — Module 12) and left the other four wide open. Module 05 proves it in one payload.

---

## Where to go next
- **Do the lab:** open `/m/module_04_script_injection/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
