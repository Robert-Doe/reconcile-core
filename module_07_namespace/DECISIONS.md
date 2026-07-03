# DECISIONS · Module 07: Tag & Namespace Confusion

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D07.1 — In-memory upload store

Files live in a process dict, never on the student's disk; a malicious.svg is preloaded so the lesson works before any upload.

## D07.2 — Vulnerable + safe serving twin

/uploads (inline, sniffable) vs /uploads-safe (attachment+nosniff+CSP) demonstrates that the fix is in how you SERVE, not what you accept.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
