# DECISIONS · Module 13: Mutation XSS (mXSS)

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D13.1 — Detects mutation structurally

The analyzer flags handler regrowth via template parsing, never executing payloads, so it demonstrates mXSS safely even where a browser has patched a given gadget.

## D13.2 — Honest about patched gadgets

The page states plainly that specific historic payloads are fixed while the structural fragility (and the research gap) remain.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
