# DECISIONS · Module 19: The XSS Payload Bank

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D19.1 — Data-driven, escaped by construction

All payloads live in payloads.js and render as escaped text; the same dataset powers the master page and 10 category pages.

## D19.2 — Tagged for evaluation

Every entry carries mechanism + context + bypass + stop + origin so the bank doubles as a research corpus indexed to the taxonomy.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
