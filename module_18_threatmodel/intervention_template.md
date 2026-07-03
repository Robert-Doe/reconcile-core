# Intervention Design Template

Use this to position your own defense against the full attack taxonomy from this
course. Fill every section. The goal is a claim precise enough to falsify — which
is exactly what makes it publishable.

---

## 0. One-sentence thesis

> My intervention is a **[in-browser shim / sanitizer / policy layer / compiler
> pass]** that provides **[precise guarantee]** against **[mechanism(s)]** in
> **[deployment context]**, where existing defenses are **[absent / partial /
> bypassable]**.

---

## 1. Threat model

- **Attacker capability.** What can the attacker control? (URL params, stored
  data, a third-party script, `postMessage`, prototype pollution source, …)
- **Attacker *cannot*.** What is out of scope? (e.g. cannot modify server code,
  cannot MITM TLS, cannot run native code.)
- **Trust boundaries.** Origin(s) in play; which code is trusted vs. untrusted;
  where secrets live.
- **Assumptions.** (e.g. "app code is honest but buggy" vs. "a dependency is
  malicious" — these lead to very different designs; Magecart/BA assume the
  latter.)

## 2. Target mechanism(s)

Map to the five. Be explicit about which you cover and which you *don't*.

| Mechanism | In scope? | How you address it |
|---|---|---|
| 1 Tag parsing | | |
| 2 Event attributes | | |
| 3 URI schemes | | |
| 4 DOM sinks | | |
| 5 Context escape + reparse (mXSS) | | |

> A credible paper covers its chosen mechanisms *completely* and is honest about
> the rest. "Covers all five a little" is weaker than "provably closes 4 and 5."

## 3. The guarantee (make it provable, not empirical)

State the property you enforce, ideally as an invariant:

- [ ] **Idempotence under re-serialization:** `sanitize(x)` parses to a tree `T`
      such that `serialize(T)` re-parses to `T` (closes mXSS/mechanism 5).
- [ ] **Fail-closed sink typing:** no string reaches a sink without passing a
      policy (Trusted-Types-style; closes mechanism 4).
- [ ] **Non-interference / egress control:** untrusted script cannot send
      same-origin secrets to a non-allowlisted destination.
- [ ] **Other:** _______________________________________________

Why "provable" beats "blocklist": a blocklist is refuted by the next payload; an
invariant is refuted only by breaking the proof. Reviewers reward the latter.

## 4. Mechanism of enforcement

- **Where does it sit?** (patched DOM prototypes / a host-config shim / a service
  worker / a CSP + policy / a build-time transform.)
- **How does it intercept?** Name the exact APIs/sinks and the interception point.
- **What is the trusted computing base?** The smaller, the stronger.
- **Interaction with the parser.** If you touch mechanism 5, specify how you reach
  a re-serialization fixed point and bound its cost.

## 5. Deployability story

- Works when the server ships **no** CSP? (the common legacy gap)
- Works in **non-Chromium** browsers? (the Trusted-Types gap)
- Rewrite cost for an existing app? (per-call vs. drop-in)
- Third-party script / widget compatibility?

## 6. Evaluation plan

- **Corpus.** Start from Module 19's 150+ annotated payloads (tagged by
  mechanism), plus known mXSS gadgets and CVE-derived cases.
- **Differential oracle.** A `parse → serialize → re-parse` harness that flags any
  string where the tree changes (mechanism-5 detector) — reuse the analyzer from
  Module 13.
- **Metrics.**
  - *Coverage:* fraction of corpus neutralized, **broken out by mechanism**.
  - *Bypass rate:* payloads that still execute (aim: 0 in-scope).
  - *Soundness:* any false "safe" verdicts?
  - *Compatibility:* % of a real app/site corpus that still functions.
  - *Performance:* overhead at the sink / commit path (µs per call, page-load
    delta).
- **Baselines.** Compare against DOMPurify (current), native Sanitizer API, strict
  nonce CSP, and Trusted Types — on the *same* corpus and metrics.
- **Adversarial evaluation.** A red-team pass (or a fuzzer over parser states) that
  actively searches for bypasses, not just the static corpus.

## 7. Limitations & honest failure modes

- Which mechanisms remain uncovered, and what complementary control is required?
- Performance or compatibility costs that would block adoption?
- Any assumption whose violation breaks the guarantee?

## 8. Positioning against prior work

- Contextual auto-encoding (e.g. template systems), CSP (nonce/`strict-dynamic`),
  Trusted Types, DOMPurify, the Sanitizer API, SNAP/parser-differential research,
  and mXSS literature (Heiderich et al.).
- **Your delta in one sentence:** _______________________________________________

---

### Worked example (delete and replace with your own)

> **Thesis.** A ~4KB client-side shim that patches HTML/script sinks to enforce
> (a) fail-closed Trusted-Types-style typing in **non-Chromium** browsers and
> (b) idempotent, fixed-point sanitization of any HTML that must pass, targeting
> **mechanisms 4 and 5** in **legacy apps that ship no CSP**.
>
> **Guarantee.** Every value reaching `innerHTML`/`outerHTML`/`insertAdjacentHTML`/
> `srcdoc`/`document.write`/`eval` is either a policy-produced typed value or is
> sanitized to a re-serialization fixed point; strings otherwise throw.
>
> **Evaluation.** Module 19 corpus + a state-fuzzing differential oracle; measure
> per-mechanism coverage, bypass rate vs. DOMPurify/native Sanitizer, and per-call
> overhead; compatibility over the top-N site HTML corpus.
>
> **Limitation.** Does not cover server-reflected mechanism-1 in the initial
> document; must be paired with output encoding or a nonce CSP there.
