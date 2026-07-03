# DECISIONS · Module 03: The 5 Execution Mechanisms

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D03.1 — Taxonomy as the spine

Everything downstream is indexed to these five so a defensive claim can be 'covers mechanisms 1,3,4' instead of 'covers these 40 payloads'.

## D03.2 — Mechanisms vs. delivery classes kept separate

Reflected/stored/DOM/blind are delivery; the five are execution. Conflating them is why beginners think 'block <script>' is a fix.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
