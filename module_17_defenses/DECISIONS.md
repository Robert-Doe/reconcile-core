# DECISIONS · Module 17: Defenses

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D17.1 — Defenses are A/B-able

/defense/* endpoints keep the vulnerability intact but add one control at a time so each defense's exact coverage (and gaps) is measurable.

## D17.2 — Live Trusted Types demo

An isolated iframe enforces TT via meta CSP so students see innerHTML throw on a raw string, without breaking the tutorial page.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
