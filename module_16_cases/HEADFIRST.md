# Head First · Module 16: Real-World Incidents

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

History is your evaluation set. Four incidents, each a single mechanism industrialized against a missing baseline defense.

- **Samy (2005):** stored XSS + self-replication = the fastest worm of its era.
- **Twitter onMouseOver (2010):** attribute break-out + auto-firing handler + a broadcast feed = instant virality.
- **Magecart / BA (2018):** injected JS silently skims card fields; 22 lines → 380k cards → record fine.

> **Brain Power**
> What do all four share? (The alert was never the point; a known mechanism at scale; and the defense existed but wasn't deployed.)

**Sharpen your pencil.** For every case, name the one control that would have stopped it: contextual encoding (Samy, Twitter), SRI + CSP `connect-src` + payment-iframe isolation (Magecart/BA). If you can do that for all four, your Module 18 gap analysis is half-written.

> **There are no Dumb Questions**
> **Q: The Samy reconstruction — is it dangerous?**
> A: No. It's de-fanged and rate-limited: each infected view posts one marker comment and a local callback so you can *watch* exponential spread on localhost, with no real payload.

---

## Where to go next
- **Do the lab:** open `/m/module_16_cases/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
