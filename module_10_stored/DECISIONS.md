# DECISIONS · Module 10: Stored & Second-Order XSS

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D10.1 — Real SQLite persistence

Uses a genuine store→serialize→render round-trip so 'survives to the database and fires for everyone' is authentic, not simulated.

## D10.2 — Second-order via /admin/logs

A separate render site (attribute context) demonstrates that the forgotten render site is where second-order bugs live.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
