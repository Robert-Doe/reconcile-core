# DECISIONS · Module 14: Prototype Pollution → DOM XSS

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D14.1 — Two-halves model made explicit

The vulnerable script separates the pollution sink from the gadget so students see why fixing either half alone is sufficient.

## D14.2 — Self-cleaning demo

Pollution persists for the page lifetime; a cleanup button resets Object.prototype so repeated experiments stay honest.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
