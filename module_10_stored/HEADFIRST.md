# Head First · Module 10: Stored & Second-Order XSS

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

Reflected XSS needs a crafted link per victim. Stored XSS needs *nothing* — the payload sits in the database and fires for **every visitor, automatically, forever**.

The counterintuitive lesson: **fix on output, not input.** Sanitizing before storage seems right but fails — the same row renders in HTML, attributes, JSON, and email, and one input-time cleanse can't be correct for all of them. Store raw; encode per output context.

> **Brain Power**
> After you switch the comment board to `/comments-safe`, the malicious row is *still in the database*. Why is the page now safe anyway?

Because encoding happens at render. The data is inert *as rendered*, regardless of what's stored.

**Sharpen your pencil.** Post a comment whose **author** is `"><img src=x onerror=alert(1)>`, then open `/admin/logs`. It fires *there* — that's **second-order XSS**: safe where stored, dangerous where re-rendered in a different context. The victim is usually an admin.

> **There are no Dumb Questions**
> **Q: Isn't parameterized SQL enough?**
> A: That stops SQL injection, a different bug. The value is stored perfectly *and still* becomes XSS when rendered without output encoding.

---

## Where to go next
- **Do the lab:** open `/m/module_10_stored/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
