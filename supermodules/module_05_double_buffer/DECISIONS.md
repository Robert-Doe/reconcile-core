# Module 05 — Decisions

Source: [`doubleBuffer.js`](doubleBuffer.js). Verified by
[`verify.mjs`](verify.mjs): four simulated renders in a row prove (1) the
first `createWorkInProgress` call allocates a genuinely new object and
links it both ways, (2) every subsequent call for the same tree position
reuses one of exactly two objects, never a third, and (3) the "which tree
is real" swap is a single field assignment. Run it yourself:
`node verify.mjs`.

## Line-by-line

**`createWorkInProgress(current, pendingProps)` signature and pool-or-create branch**
— **(b)**, verified against real React's actual function of the same name (`react-dom.development.js:28183-28256`, quoted in Module 03's citation context). Real React's first line is `var workInProgress = current.alternate;` followed by an `if (workInProgress === null)` branch — the exact structure we reproduce. This isn't a convenient simplification we happened to converge on; it's the literal real algorithm.

**Both-directions linking happens exactly once, only in the "create" branch**
— **(b)**. `workInProgress.alternate = current; current.alternate = workInProgress;` appear only inside `if (workInProgress === null)` in both real React and our code. This is *why* the pool never grows past two: once both `.alternate` pointers are set, every future call for this position finds `current.alternate` (or, after a swap, the new current's `.alternate`) already non-null and takes the reuse branch instead.

**Which fields get copied onto a reused `workInProgress`**
— **(c)**, a deliberate trim of a **(b)**-shaped list. Real React copies far more (`lanes`, `childLanes`, `dependencies`, profiler timers — see the full citation in Module 03's DECISIONS.md) because it tracks more per-fiber state than this course does. We copy exactly the fields Module 03 kept: `child`, `sibling`, `index`, `memoizedProps`. The principle — "start as an exact copy of `current`; reconciliation overwrites only what changes" — is matched exactly; the field list is narrower because our fiber shape is narrower.

**`createContainer` — a stand-in for React's `FiberRootNode`**
— **(c)**. Real React's actual root object (`FiberRootNode`, not shown in this course) carries far more — the DOM container element, scheduling/lane bookkeeping, callback queues. We reduce it to the one property this module is actually about: `.current`, the single pointer whose value defines "which tree does everyone else see." Everything else about a real root is Track 2 / out-of-scope territory (A3, A5).

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Pool-or-create branch on `current.alternate` | (b) forced | Matches real `createWorkInProgress` exactly |
| Both-direction linking only in the create branch | (b) forced | This is the entire reason the pool caps at 2 objects |
| Narrower copied-field list than real React | (c) convention | Matches our narrower fiber shape from Module 03 |
| `createContainer` reduced to `{ current }` | (c) convention | Isolates the one property this module is about |

## What We Proved

Across four simulated renders of the same tree position, exactly **two**
fiber objects were ever allocated — confirmed by collecting every object
returned into a `Set` and checking its size, not by eyeballing console
output. `createWorkInProgress` was called three times after the first
mount; the third and fourth calls returned, respectively, the *original*
mounted fiber and the *first* `workInProgress` fiber — proving the two
objects alternate being "current" and "workInProgress" indefinitely,
rather than accumulating.

**A confession, left in on purpose:** this module's own first draft of
`verify.mjs` failed its final assertion — not because `doubleBuffer.js` was
wrong, but because the assertion re-checked `current1.alternate === null`
at the very end of the script, after `current1.alternate` had long since
been reassigned. `current1` is a live, mutable object, not a snapshot;
re-reading a field from it after later code has mutated that same field
reads the *new* value, not the value at the time you were originally
interested in it. The fix was to capture each boolean into a `const` at
the moment it was true and assert on the captured value, not the live
object. This is, unplanned, the single most concrete demonstration this
course could offer of why "current" and "workInProgress" being *two
separate objects* — rather than one object whose fields get overwritten in
place — is exactly the property that avoids this class of bug in real
React: current's fields are never mutated by an in-progress render, only
workInProgress's are, until the swap.
