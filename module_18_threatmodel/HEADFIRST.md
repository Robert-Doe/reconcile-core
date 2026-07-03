# Head First · Module 18: Threat Model & Intervention

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

Where the course becomes research. You map every attack onto the five mechanisms, then onto the defenses, and the empty cells are where your PhD lives.

> **Brain Power**
> Which mechanism is least well covered by *deployable* defenses? (Mechanism 5 — reparse/mXSS — is only partial everywhere. And capability controls that come closest, Trusted Types and 'just use textContent', are Chromium-centric or unusable where rich HTML is required.)

**Sharpen your pencil.** Fill in `intervention_template.md`. State your target mechanism, a *provable property* (idempotence under re-serialization; fail-closed sink typing) rather than a blocklist, your deployability story (works with no CSP? non-Chromium?), and your evaluation plan against the Module 19 corpus.

> **There are no Dumb Questions**
> **Q: Why is "coverage against mechanisms" a stronger claim than "coverage against payloads"?**
> A: A blocklist is refuted by the next payload. An invariant is refuted only by breaking the proof. Reviewers reward the latter — it's the difference between engineering and science.

---

## Where to go next
- **Do the lab:** open `/m/module_18_threatmodel/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
