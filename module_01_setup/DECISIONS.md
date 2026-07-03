# DECISIONS · Module 01: Environment Setup & Attacker Mindset

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D01.1 — Insecure by default

The baseline sends no security headers so attacks land. You can't value a defense you've never watched fail without.

## D01.2 — One origin for everything

XSS is origin-scoped; putting every module on one origin is the honest setup and lets later modules chain across modules.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
