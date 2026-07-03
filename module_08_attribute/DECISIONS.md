# DECISIONS · Module 08: Attribute Injection & Context Breaking

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D08.1 — Quote-encoding is the star

The safe twin encodes the active quote character; the module makes the case that angle-bracket stripping is the wrong mental model.

## D08.2 — Dangling markup included

Teaches that execution-only defenses miss markup-driven exfiltration, motivating base-uri/form-action in Module 17.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
