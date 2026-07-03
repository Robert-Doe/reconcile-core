# DECISIONS · Module 04: Script Tag Injection

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D04.1 — Vulnerable + safe twin

/search and /search-safe reflect the SAME input so you can A/B raw vs. encoded and see the single-character fix at the tokenizer level.

## D04.2 — HTML-text context only

This module deliberately stays in one context (HTML text) so the fix is clean; later modules add attribute/URL/JS contexts that each need a different encoder.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
