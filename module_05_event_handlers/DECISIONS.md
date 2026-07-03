# DECISIONS · Module 05: Event Handler Injection

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D05.1 — Catalog is data-driven

event_catalog.html renders 100+ handlers from an array with an AUTO flag, making the 'denylists lose' argument visceral rather than asserted.

## D05.2 — Sandboxed live demos

'render' buttons execute payloads inside sandbox='allow-scripts' iframes so you see them fire without touching the lab origin.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
