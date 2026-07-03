# Head First · Module 05: Event Handler Injection

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

If you remember one attack forever, make it this: `<img src=x onerror=alert(1)>`. A broken image is *guaranteed* to error, so the handler is *guaranteed* to fire. No `<script>` anywhere.

This is why blocking `<script>` changes nothing. There are **150+** event attributes, and several fire with **zero interaction**: `onerror`, `<svg onload>`, `autofocus onfocus`, `onpageshow`.

> **Brain Power**
> A filter strips every `<script>` tag perfectly. Against the five mechanisms, how many does that close? (One — and leakily. Mechanism 2 is completely untouched.)

**Sharpen your pencil.** Open the event catalog and filter for `auto`. Those are your zero-click handlers. Memorize five. You'll reach for `onerror`/`onload`/`onfocus` in 90% of real cases.

> **There are no Dumb Questions**
> **Q: `autofocus` isn't an event, so why does it matter?**
> A: It *causes* one. The browser auto-moves focus on load, which fires `onfocus`. Pair an auto-firing attribute with a handler and you get execution with no user action — the general recipe for zero-click.

The correct fix here is attribute-context encoding (so no `on*` can be introduced) or a CSP without `'unsafe-inline'` (so inline handlers never run regardless of spelling).

---

## Where to go next
- **Do the lab:** open `/m/module_05_event_handlers/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
