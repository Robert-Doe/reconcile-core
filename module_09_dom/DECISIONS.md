# DECISIONS · Module 09: DOM-Based XSS & Client-Side Sinks

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D09.1 — Client-only target

spa_demo.html is a real client app reading location.hash into innerHTML, so students can set breakpoints and watch the source→sink flow live.

## D09.2 — Trusted Types foreshadowed

Sets up mechanism 4 as the thing Trusted Types closes categorically in Module 17.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
