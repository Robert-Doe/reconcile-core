# Head First · Module 03: The 5 Execution Mechanisms

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

Stop memorizing payloads. There are thousands and there will be thousands more tomorrow. Underneath all of them are **exactly five** ways JavaScript actually starts running:

1. **Tag parsing** — the parser builds a script-capable element (`<script>`).
2. **Event attributes** — an `on*` handler fires (`onerror`), no `<script>` needed.
3. **URI schemes** — a code URL in a navigational sink (`javascript:`).
4. **DOM sinks** — client JS feeds attacker data to `innerHTML`/`eval`.
5. **Context escape + reparse** — break out of a context, or an mXSS mutation.

> **Brain Power**
> Why can't a defender ever prove "we block all payloads"? (Because the payload space is infinite and adversarial.) So what *can* you prove? Coverage of a **mechanism**. That reframing is the whole reason this taxonomy exists.

**Sharpen your pencil.** Classify each: `<body onload=alert(1)>` · `location.href='javascript:alert(1)'` · `el.innerHTML=userInput` · `<svg><script>alert(1)</script></svg>`. (2, 3, 4, 1.)

> **There are no Dumb Questions**
> **Q: Where do "stored" and "DOM" XSS fit?**
> A: Those are *delivery classes* (where the payload lives / who gets hit), orthogonal to the five *mechanisms* (how it executes). A stored XSS still fires via mechanism 1–5.

Keep the mechanism × defense table close. You'll fill it in across the course, and it becomes your Module 18 gap analysis.

---

## Where to go next
- **Do the lab:** open `/m/module_03_taxonomy/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
