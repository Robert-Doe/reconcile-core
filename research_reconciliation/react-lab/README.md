# React XSS Surface + In-Browser Fallback Lab

A **runnable** Vite + React app for Tracks E and F. It renders six intentionally
vulnerable components (E1–E6) with a single toggle that switches on the
**in-browser fallback** (a Trusted Types policy whose `createHTML` sanitizes to a
serialization fixed point), plus a live differential-evaluation panel (F6).

> Localhost research only. Payloads call `window.__xss(tag)`/`alert()`, which the
> app **captures** (no modals) so you can watch a proof-of-execution counter.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
```

Then flip **Fallback defense: OFF → ON** in the header and re-trigger each card.
With the fallback ON, the execution monitor should stop counting.

Other scripts:

```bash
npm run build        # production build (also a good compile check)
npm run evaluate     # prints corpus composition + metric definitions
```

## What maps to what

| Track E | Component | The sink it exercises |
|---------|-----------|-----------------------|
| E1 | `src/vulns/E1_DangerouslySetInnerHTML.jsx` | `innerHTML` via the dangerous hatch |
| E2 | `src/vulns/E2_UrlAndStyle.jsx` | `href` `javascript:` URL + CSS |
| E3 | `src/vulns/E3_PropSpread.jsx` | `{...untrusted}` prop spread |
| E4 | `src/vulns/E4_SsrStateEmbedding.jsx` | `</script>` breakout in embedded JSON |
| E5 | `src/vulns/E5_MarkdownAndProps.jsx` | markdown renderer → raw HTML |
| E6 | `src/vulns/E6_MutationXSS.jsx` | mXSS on reparse of sanitized HTML |

| Track F | File | Role |
|---------|------|------|
| F2/F3 | `src/fallback/policy.js` | Trusted Types policy `app#html`; the `safeHtmlProp` chokepoint |
| F3 | `src/fallback/sanitize.js` | allowlist sanitizer + `sanitizeToFixedPoint` (mXSS defense) |
| F6 | `src/harness/Evaluation.jsx` | in-app differential harness over the corpus |
| F6 | `src/corpus/payloads.js` | the React-facing evaluation corpus |

## How the fallback is wired (F2–F4)

The demonstrated toggle uses the **host-config-shim-at-the-app-level** approach:
every "dangerous" render site calls `safeHtmlProp(html, fallbackOn)` instead of
building `{ __html }` by hand. With the fallback on, that routes the string
through the Trusted Types policy → `sanitizeToFixedPoint`. This models "wire
React's dangerous path through the policy" without patching `react-dom`
internals (which is version-fragile).

Two production-grade alternatives (discussed in `../track_f_fallback/`):

- **Enforced Trusted Types** — uncomment the CSP meta in `index.html`
  (`require-trusted-types-for 'script'`). Then *every* `innerHTML` assignment,
  including any you forgot, throws unless it's a `TrustedHTML` from the policy —
  the fail-closed guarantee. (Chromium only; this lab's sanitizer is the
  cross-browser fallback.)
- **Prototype/host-config shim** — wrap the `Element.prototype` HTML sinks (the
  Track A2 mixin owners) so non-React sinks are covered too.

## Swapping in DOMPurify

`sanitize.js` ships a dependency-free allowlist sanitizer so `npm install` only
needs React + Vite. For production, replace `sanitizeOnce` with DOMPurify:

```js
import DOMPurify from 'dompurify';
export const sanitizeOnce = (s) => DOMPurify.sanitize(s, { /* config */ });
// keep sanitizeToFixedPoint wrapping it for the mXSS guarantee.
```

## The claim to evaluate (F6)

> Every value reaching an HTML/URL/script sink is a policy-produced typed value
> or a re-serialization fixed point; otherwise it is refused. Over the corpus:
> **0 in-scope bypasses**, benign markup preserved, bounded commit cost.

Read the live numbers in the **F6 panel** (or the standalone
`../harness/differential_harness.html`).
