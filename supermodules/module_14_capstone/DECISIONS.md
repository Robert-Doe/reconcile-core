# Module 14 — Decisions

Source: [`engine.js`](engine.js). Verified by [`verify.mjs`](verify.mjs): a
real app (a `memo`-wrapped static `Header` + a stateful `Counter`) is
mounted, then driven through TWO real `setState` calls via the actual
`useState → scheduleUpdate → renderFiber → commit` pipeline — and `Header`
is proven, by an instrumented render counter, to execute its function body
exactly once across the entire run, while `Counter`'s displayed value is
correct after each update and the DOM node identities involved are checked
directly, not inferred. [`demo.html`](demo.html) runs the same engine in a
real browser with a real click handler (live confirmation not completed
this session — same tooling limitation noted in Module 12's DECISIONS.md).

This module composes Modules 01, 02(concept), 03–13 — it does not
reimplement any of them. Every import in `engine.js` is unmodified from
its source module except where noted below.

## Line-by-line — two real bugs, found by actually running this module

**Bug 1: a stable `config` reference passed to `createElement` does NOT produce a stable `props` reference**
— discovered when `verify.mjs`'s first draft passed a single `HEADER_PROPS = {}` constant into `createElement(Header, HEADER_PROPS)` every render, expecting `shouldBailout`'s reference check to pass. It didn't — `headerRenderCount` came back `2`, then `3`. The cause: Module 01's `createElement` (working exactly as designed, and as verified against real React in that module) always builds a **fresh** `props` object from `config`'s own keys — `config` itself is never returned or reused. Passing the same `config` reference every time was never going to produce the same `props` reference; that was a wrong assumption in this module's own first draft, not a bug in Module 01. The real fix — matching real-world React exactly — is `memo`: wrapping `Header` routes its props through Module 10's `resolveMemoProps`, which substitutes the OLD reference when the new one is only shallowly equal. This is category **(b)**: it is exactly how real `React.memo` behaves, confirmed the hard way.

**Bug 2: a bailout must return `null`, not `current.child`, to the work loop**
— discovered immediately after fixing Bug 1: `Header` now correctly bailed out (`headerRenderCount` stayed `1`), but the committed HTML showed duplicated content — `"Static HeaderStatic Header"`. The cause: `beginWork`'s bailout branch returned `workInProgress.child` (a copy of `current.child`) as the value for the work loop to continue into, exactly like a normal (non-bailout) return value. The work loop obediently visited that fiber — which is the OLD, already-committed `h1` fiber, whose OWN `.alternate` was `null` — and ran `beginWork` on it as if it were a fresh workInProgress fiber. Its `HostComponent` branch called `reconcileChildrenArray(fiber, null, children)` (treating `current` as absent, i.e. a mount), which created a **brand new** text fiber for `"Static Header"` and flagged it `Placement` — which then got committed via `commitPlacement`, appending a second, duplicate text node into the ALREADY-POPULATED real `h1` element. Fixed by returning `null` from the bailout branch: `null` tells `performUnitOfWork` there is no child to descend into this pass, and `completeUnitOfWork` runs for the bailed-out fiber itself (bubbling flags, per Module 11) without the work loop ever visiting anything inside it. This is category **(b)**: it is the direct, necessary consequence of Module 10's own thesis — "zero work below it, not even visited" — which this integration had, for one draft, failed to actually honor.

**Only the `scheduleUpdate` entry fiber is bailout-exempt (`forceUpdate`)**
— **(c)**, a deliberate, clearly-scoped simplification standing in for real React's `childLanes` propagation (cut from Module 03; a real, sizable mechanism of its own). Real React can tell, without forcing a full re-render, that a deeply-nested descendant has pending work even when every fiber between the root and that descendant has unchanged props, via `childLanes` bubbling. This course has no such bookkeeping, so `scheduleUpdate`'s entry fiber always actually re-executes (`forceUpdate = true` for exactly the first fiber the loop visits each update) — guaranteeing an update is never silently dropped — while every fiber beneath it still goes through the REAL, unmodified bailout check from Module 10. This is why `Header`, several levels how deep any real app's tree might make it, still correctly bails out: it isn't the entry point, and its own props/bailout logic is completely real, not special-cased.

**`HostComponent` children always go through `reconcileChildrenArray`, never `reconcileSingleChild`**
— **(c)**. Real React distinguishes based on the JSX-level shape (a single child vs. an array/multiple children) partly as a performance optimization avoiding `Map` allocation for the common single-child case. This engine always treats a host element's children as an array (of 0, 1, or N items) and always uses Module 09's algorithm, which — verified across Modules 08 and 09's own test suites — handles all three counts correctly. `reconcileSingleChild` (Module 08) is still used for exactly the case it was built for: a function component's own single returned value.

**No event delegation — the demo app wires its own `onclick` directly**
— **(c)**, matching Module 12's explicitly documented scope cut. `demo.html`'s `__onMount` prop convention is application-level code sitting on top of the engine, not a feature of the engine itself.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `memo` required for bailout to actually trigger on stable-looking props | (b), found via a real bug | Matches real React; `createElement` always builds fresh props |
| Bailout returns `null`, not `current.child` | (b), found via a real bug | The work loop must never visit a bailed-out subtree at all |
| Only the update's entry fiber is bailout-exempt | (c) convention | Stands in for real `childLanes`, out of scope |
| `HostComponent` always uses `reconcileChildrenArray` | (c) convention | Simpler wiring; Module 09 handles 0/1/N correctly either way |
| No event delegation in the engine | (c) convention | Matches Module 12's documented scope cut |

## What We Proved

Not that each module works in isolation — every prior module already
proved that on its own. This module proves they compose into one engine
that mounts a real app, correctly bails out a memoized component across
**two separate real state updates** (not just once, ruling out a lucky
first-bailout-then-broken-second-time bug), correctly updates a stateful
component's displayed value each time, and never duplicates or corrupts
DOM structure while doing it — with two real integration bugs (not
hypothetical "here's what could go wrong" examples) found, fixed, and
left documented rather than quietly smoothed over.
