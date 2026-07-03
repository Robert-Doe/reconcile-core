# Head First · Module 15: Attack Chaining → Account Takeover

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

This is where `alert(1)` becomes real. XSS is an *entry point*; the impact is whatever same-origin JS does with the origin's trust.

The load-bearing insight: **XSS defeats CSRF tokens and `SameSite` cookies.** Those defend against *cross-site* forgery — a token the attacker's site can't read. XSS runs *same-origin*, so it reads the token trivially and submits the form itself.

> **Brain Power**
> The account has `HttpOnly` cookies, so the session can't be stolen. Is the account safe? (No. The script reads the CSRF token off the page and forges a password change — HttpOnly doesn't stop that.)

**Sharpen your pencil.** Run the chain: `/auth/login`, then fire the payload at `/auth/xss-entry` that scrapes the token from `/auth/account` and POSTs `/auth/change-password`. Re-check `/auth/status` — the password changed. No cookie theft required.

> **There are no Dumb Questions**
> **Q: So what actually reduces impact here?**
> A: Preventing the XSS (everything depends on it), `HttpOnly` (removes easy theft), and **re-authentication for sensitive actions** (breaks the silent forgery even after XSS).

---

## Where to go next
- **Do the lab:** open `/m/module_15_chaining/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
