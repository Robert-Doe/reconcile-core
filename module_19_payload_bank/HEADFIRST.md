# Head First · Module 19: The XSS Payload Bank

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

Your lifelong field guide: 120 payloads, each an annotated hypothesis about a broken assumption. The skill this builds is *reading* a payload and instantly knowing its context, mechanism, bypass, and antidote.

> **Brain Power**
> Every entry is tagged by mechanism. Why does that matter for a *defender*? (Because you can measure your defense's coverage by mechanism across the whole corpus — this bank is your Module 18 evaluation set, not just a trophy case.)

**Sharpen your pencil.** Pick any payload. Before reading the annotation, predict: which mechanism? which context? what stops it? Then check. Do ten and you've internalized the taxonomy.

> **There are no Dumb Questions**
> **Q: Are these safe to have in a file?**
> A: Yes — the renderer escapes every payload to inert text; nothing executes. Copy one and test it against the matching lab endpoint to see it live.
> **Q: Only 120? I wanted 100+.**
> A: 120 across 10 categories, all tagged and de-duplicated for teaching value. Extend `payloads.js` as you find gadgets — keep them mechanism-tagged so the corpus stays defensible.

---

## Where to go next
- **Do the lab:** open `/m/module_19_payload_bank/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
