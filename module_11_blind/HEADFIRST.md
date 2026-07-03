# Head First · Module 11: Blind XSS & Out-of-Band

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

The payload fires where you can't watch — an admin queue, a log viewer, a PDF generator. You'll never see the alert. So you make the payload **phone home**.

> **Brain Power**
> Why is `alert(1)` useless for confirming a blind XSS? (You're not the one viewing the page it fires on.) What replaces it? (A beacon to a server you control.)

**Sharpen your pencil.** Submit feedback with an `<img onerror>` that beacons to `/collect`. You see nothing. Now load `/admin/feedback` as "the admin." Now check `/callbacks` — your hit is logged. You just detected execution in a page you never opened.

The victim is almost always **privileged**, which is why blind XSS punches above its weight. And it hides in fields you'd never call "user input": `User-Agent`, `Referer`, a filename.

> **There are no Dumb Questions**
> **Q: Does `HttpOnly` stop blind XSS?**
> A: No — the script still runs. It stops the *cookie* from riding the beacon. The attacker pivots to same-origin request forgery (Module 15), which HttpOnly does not stop.

---

## Where to go next
- **Do the lab:** open `/m/module_11_blind/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
