# Head First · Module 09: DOM-Based XSS & Client-Side Sinks

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

Now the server goes blind. In DOM XSS the payload lives in the URL fragment or client state, and **the server never receives it**. Your WAF, your server-side encoder — all looking the wrong way.

It's a taint flow: a **source** you influence (`location.hash`, `postMessage`) reaches a **sink** that interprets strings (`innerHTML`, `eval`, `document.write`).

> **Brain Power**
> Visit the mini-SPA with `#<img src=x onerror=alert(1)>` and open the Network tab. Where in the request is your payload? (Nowhere. The `#` fragment is never sent. That's the defining property.)

**Sharpen your pencil.** In the SPA, why does the payload use `onerror` instead of `<script>`? (Because `innerHTML` won't run a raw `<script>` — the sink forces you to mechanism 2. The taxonomy predicts your move.)

> **There are no Dumb Questions**
> **Q: `innerHTML` vs `eval` — which is worse?**
> A: `eval` interprets *JavaScript* directly (instant), `innerHTML` interprets *HTML* (needs a handler/URL to reach JS). Both are sinks; the safe replacements are `textContent` and `JSON.parse`.

---

## Where to go next
- **Do the lab:** open `/m/module_09_dom/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
