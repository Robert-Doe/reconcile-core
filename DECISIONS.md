# DECISIONS.md — Design rationale

A running log of *why* the lab is built the way it is. If you extend it for your
research, keep appending here so the pedagogy stays legible.

## D1 — One process, blueprint plug-ins

**Decision.** A single `lab_server.py` auto-discovers `vuln_*.py` blueprints per
module rather than one server per module.

**Why.** Students run *one* command. Cross-module attacks (e.g. Module 15
chaining a stored payload from Module 10 into an auth endpoint) need everything
on the same origin anyway — XSS is an *origin-scoped* bug class, so a single
origin is the pedagogically honest setup. Missing modules are skipped so the
course can be built and studied incrementally.

## D2 — Insecure by default, hardened opt-in

**Decision.** The baseline sends no CSP / `X-Content-Type-Options` / cookie
flags. Defenses are turned on per-endpoint (Module 17) or globally via
`LAB_HARDENING=1`.

**Why.** You cannot appreciate what a defense buys you until you have felt the
attack land without it. The A/B toggle makes every defense measurable: run the
exploit, flip the flag, run it again.

## D3 — Harmless proofs only

**Decision.** Payloads prove execution with `alert(1)`, `alert(document.domain)`,
or a callback to the student's *own* `callback_server.py`. No real exfiltration
to third parties, no destructive actions.

**Why.** The learning objective is *"did arbitrary JS run in this origin?"* —
`alert(document.domain)` answers that unambiguously while remaining safe and
non-networked. The blind-XSS module uses a local callback specifically to teach
out-of-band detection without touching the public internet.

## D4 — Attack-first, defense-later ordering

**Decision.** Mechanisms and classes (M04–M16) come before the defense toolbox
(M17) and the student's own intervention (M18).

**Why.** Defenses only make sense as answers to concrete attacks. A defender who
memorizes "use CSP" without having bypassed a weak CSP will ship a weak CSP. The
threat-model module (M18) then forces mapping every attack seen to the defense
that stops it — exposing the gaps a PhD intervention can target.

## D5 — The 5-mechanism taxonomy as the organizing spine

**Decision.** Everything is indexed against five execution mechanisms (tag
parsing, event attributes, URI schemes, DOM sinks, context-escape+reparse).

**Why.** The XSS literature is a sprawl of payload zoos. A small, complete
mechanism taxonomy is what makes a *defense* argument tractable: you can claim
coverage against mechanisms, not against an infinite payload list. Module 19's
150-payload bank is explicitly tagged by mechanism so the bank reinforces the
taxonomy instead of drowning it.

## D6 — Real parser behavior, not simulated

**Decision.** Demos rely on the *actual* browser HTML parser (via `innerHTML`,
`DOMParser`, live pages) rather than a toy parser written in JS.

**Why.** mXSS and namespace confusion (M07, M13) are *emergent properties of the
real parser's error recovery and serialization*. A simulated parser would hide
exactly the behavior the course exists to teach. Where we show tokenizer states
(M02), we annotate the real spec algorithm rather than reimplement it.

## D7 — SQLite for stored/second-order, files created on demand

**Decision.** Module 10/11/15 persistence uses a local SQLite file created at
first run; `make clean` deletes it.

**Why.** Zero external dependencies, and a fresh database per student. Stored XSS
is only convincing if the payload genuinely survives a serialize→store→render
round trip, which SQLite provides authentically.

## Open questions for the research phase (tracked for M18)

- Can an in-browser shim cover all five mechanisms *without* an allowlist of
  sinks that drifts out of date as the DOM API grows?
- Trusted Types covers DOM sinks (mechanism 4) well; what is the minimal
  complementary control for mechanisms 1–3 that survives mXSS (mechanism 5)?
- What is a fair evaluation corpus? (M19's bank is the seed; M18 formalizes the
  differential-testing harness.)
