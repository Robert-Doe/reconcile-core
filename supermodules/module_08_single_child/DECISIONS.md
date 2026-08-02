# Module 08 — Decisions

Source: [`reconcile.js`](reconcile.js). Verified by [`verify.mjs`](verify.mjs)
across three scenarios: same type reuses the fiber via double buffering;
different type replaces it and records the old one for deletion; and a
match against the first of two old siblings correctly orphans the second.
Run it yourself: `node verify.mjs`.

## Line-by-line

**Key checked first, type checked only if the key matches**
— **(b)**, verified against real React's actual `reconcileSingleElement` (`react-dom.development.js:13925-13992`): `if (child.key === key) { ... check type ... }`. A key mismatch never even asks about type — it's an immediate "this isn't the same logical slot," full stop.

**On a type mismatch (same key, different type): delete this child AND all its remaining siblings, then break**
— **(b)**, verified directly: real React calls `deleteRemainingChildren(returnFiber, child)` (not `child.sibling` — `child` itself, this time) precisely because the single-child position is about to be occupied by a freshly created fiber; nothing from the old sibling chain can survive into a position that now holds something structurally different.

**Reusing a fiber goes through `createWorkInProgress` (Module 05), not a fresh field-by-field copy**
— **(b)**, verified: real React's `useFiber` (`react-dom.development.js:13205-13212`) is *exactly* `createWorkInProgress` plus two resets (`index = 0`, `sibling = null`). This is the payoff of building Module 05 before this one: reuse isn't reinvented here, it's the same double-buffering pool doing its job in a new context.

**`index = 0` and `sibling = null` reset unconditionally on reuse**
— **(b)**, matching real React's own comment at that exact line: *"We currently set sibling to null and index to 0 here because it is easy to forget to do before returning it."* A fiber being reused from a different tree shape (e.g., it used to have a sibling before an update removed everything else) must not carry stale tree-shape data forward — the single-child case's cardinality (exactly one child) is enforced here, structurally, not by hoping callers behave.

**Deletions are recorded on the PARENT's `deletions` array, not applied immediately**
— **(b)**, verified: real `deleteChild`/`deleteRemainingChildren` only ever push onto `returnFiber.deletions` — they never touch the DOM, never even touch the child fiber being deleted beyond recording it. Actually removing anything is Module 11/12's job; this module only ever decides and records.

**`deletions` field added to Module 03's `fiber.js`, retroactively**
— **(c)**, and an honestly-reported correction, not a silent patch. This field was in real React's `FiberNode` from the start (`this.deletions = null;`) but was cut from Module 03's kept-field list as "not yet needed." Building this module's `verify.mjs` surfaced a real `TypeError: Cannot read properties of undefined (reading 'push')` the moment a deletion was recorded on a fiber whose `deletions` was `undefined` rather than `null` — see "What We Proved" below.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Key checked before type | (b) forced | Matches real `reconcileSingleElement` |
| Type mismatch deletes child + all its siblings | (b) forced | A single-child slot's old sibling chain can't partially survive |
| Reuse via `createWorkInProgress`, not a manual copy | (b) forced | Matches real `useFiber` exactly; reuses Module 05's mechanism |
| `index`/`sibling` reset unconditionally on reuse | (b) forced | Matches real React's own stated reasoning, quoted above |
| Deletions recorded, not applied | (b) forced | Matches real `deleteChild`; actual removal is Module 11/12 |
| `deletions` field retrofitted into Module 03 | (c), corrective | A field this course cut too early; fixed at its source once needed |

## What We Proved

**A real bug, caught by running the tests, not by inspection:** the first
run of this module's `verify.mjs` failed Scenario 1 (`parent.deletions is
null` printed `false`) and then crashed outright on Scenario 2 with
`TypeError: Cannot read properties of undefined (reading 'push')`. The
cause was not a mistake in `reconcile.js` — it was that Module 03's
`FiberNode` never initialized a `deletions` field at all, so every fiber's
`deletions` was `undefined`, and `undefined === null` is `false`, so the
"is there already a deletions array?" check in `deleteChild` never
triggered array creation, and the very first push crashed. The fix was at
the true source: adding `this.deletions = null;` to Module 03's
constructor. Every downstream module's tests (03 through 07) were
re-executed after that change and all still pass — confirming the fix was
additive, not disruptive.

With that fixed, all three scenarios pass: same-type updates reuse the
exact fiber Module 05's pool already had ready (`result.alternate ===
oldChild`); different-type updates never touch the old fiber's identity
at all (`result.alternate === null`) and record it for deletion instead;
and a match against the first of two old children correctly drags the
second, now-orphaned child into the same deletion record — proven by
checking `parent.deletions`, not by assuming `deleteRemainingChildren`
did the right thing.
