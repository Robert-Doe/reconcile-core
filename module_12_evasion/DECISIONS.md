# DECISIONS · Module 12: Filter Evasion & Obfuscation

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D12.1 — Deliberately weak, realistic denylist

The WAF looks reasonable and falls to five families of bypass, making the 'denylists lose' thesis empirical, not asserted.

## D12.2 — Decode-boundary framing

Every bypass is explained as a filter/browser decode-time mismatch, the durable concept behind the trick zoo.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
