# DECISIONS · Module 15: Attack Chaining → Account Takeover

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D15.1 — Full working takeover

The chain is verified end-to-end (login→scrape CSRF→forge change) and rejects forged tokens, so the 'XSS beats CSRF' claim is demonstrated, not asserted.

## D15.2 — HttpOnly toggle

/auth/login?httponly=1 lets students feel the pivot from theft to on-page forgery.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
