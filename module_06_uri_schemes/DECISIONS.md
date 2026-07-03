# DECISIONS · Module 06: URI Scheme Injection

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D06.1 — Isolates mechanism 3

The reflected value is HTML-attribute-encoded so quotes can't break out — the ONLY variable is whether the scheme is checked, cleanly separating mechanism 3 from mechanism 5.

## D06.2 — Open-redirect angle

Teaches redirect host allowlisting alongside scheme allowlisting, since redirectors amplify delivery even when scheme-safe.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
