# DECISIONS · Module 11: Blind XSS & Out-of-Band

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D11.1 — Local collector

/collect is on localhost so out-of-band detection is taught without touching the public internet; in real engagements it'd be an external host.

## D11.2 — Blind by construction

The submit page never renders feedback back; only /admin/feedback does, forcing genuine OOB detection.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
