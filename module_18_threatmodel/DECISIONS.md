# DECISIONS · Module 18: Threat Model & Intervention

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D18.1 — Two matrices, honestly scored

Attack×mechanism and defense×mechanism tables use full/partial/none so the residual-risk seams are visible, not hidden.

## D18.2 — Template forces falsifiability

intervention_template.md pushes toward a provable property + evaluation harness rather than 'better filtering'.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
