# Head First · Module 14: Prototype Pollution → DOM XSS

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

An XSS with **no injection point**. You never touch the sink's argument — you poison the *defaults* that innocent code falls back to, by writing onto `Object.prototype`.

It needs two halves: a **pollution sink** (an unsafe merge/parser that walks into `__proto__`) and a **gadget** (code reading a usually-absent property that now comes from the polluted prototype and lands in `innerHTML`).

> **Brain Power**
> `renderWidget({})` — an empty object the developer created. How can that possibly be attacker-controlled? (Because `({}).widgetHtml` is now inherited from a polluted `Object.prototype`.)

**Sharpen your pencil.** Load the page with `?__proto__[widgetHtml]=<img src=x onerror=alert(1)>`. The widget renders the attacker's HTML — the payload lived entirely in a query string that fed a *merge*, not a sink.

> **There are no Dumb Questions**
> **Q: Why doesn't output-encoding my inputs stop this?**
> A: The dangerous value is introduced *after* input handling, as a property lookup. Kill the sink (block `__proto__`, use `Object.create(null)`/`Map`) or kill the gadget (Trusted Types rejects the polluted string at `innerHTML`).

---

## Where to go next
- **Do the lab:** open `/m/module_14_proto/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
