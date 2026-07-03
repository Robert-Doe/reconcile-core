# DECISIONS · Module 16: Real-World Incidents

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D16.1 — De-fanged reconstruction

The local Samy worm carries only a marker + local callback and is rate-limited to one repost per load, so propagation is observable but harmless.

## D16.2 — Each case mapped to the taxonomy

Every incident is decomposed into mechanisms and the absent defense, tying history back to the course spine.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
