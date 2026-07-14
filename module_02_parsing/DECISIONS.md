# DECISIONS · Module 02: How Browsers Parse HTML

Design choices specific to this module. The repo-level `DECISIONS.md` covers lab-wide rationale; this file covers *why this module is built the way it is*.

## D02.1 — Real parser, not a toy

Demos use the genuine browser parser via inert <template>. mXSS is an emergent property of real error-recovery; a simulated parser would hide exactly what we teach.

## D02.2 — Inert by construction

<template>.content builds the tree without executing scripts or loading resources, so we can dissect dangerous input safely.

## Open threads
- What would a *defense* for this module's mechanism have to guarantee to be complete? (Carry the answer into Module 18.)
