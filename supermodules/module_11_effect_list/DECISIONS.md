# Module 11 — Decisions

Source: [`effectList.js`](effectList.js). Verified by [`verify.mjs`](verify.mjs):
an 8-fiber tree where exactly one deeply-nested fiber changed is bubbled
bottom-up for real, then walked a second time — and the walk is proven to
visit only 6 of the 8 fibers, skipping two entire untouched branches
without ever descending into them. Run it yourself: `node verify.mjs`.

## Line-by-line

**There is no `firstEffect`/`lastEffect`/literal effect linked list in this fiber shape — on purpose, because there isn't one in real React either**
— **(b)**, and the central, verified surprise of this module. Older React literature (and the name "effect list" itself) describes a real linked list that existed through React 16/17. Grepping the actual installed `react-dom@18.3.1` source in this repo for `firstEffect`/`lastEffect` turns up **nothing** — only `subtreeFlags` (a bitmask) and `nextEffect` (a plain tree-walk cursor variable, not a per-fiber field). The name outlived the mechanism; this module builds the mechanism that's actually there now.

**`bubbleProperties`: OR every immediate child's `subtreeFlags | flags` into the parent, one level, bottom-up**
— **(b)**, verified byte-for-byte against real React's actual function (`react-dom.development.js:21923-21970`). One level is sufficient specifically *because* this runs during the "complete" step (Module 06's `completeUnitOfWork` position), which only ever visits a fiber after all its children have already completed — meaning every child already bubbled its own descendants into its own `subtreeFlags` first. This is the exact same bottom-up ordering guarantee Module 06's traversal already provides; Module 11 doesn't add new traversal machinery, it fills in what happens at a step Module 06 left as a stub.

**A bailed-out fiber (Module 10) copies its alternate's `subtreeFlags` instead of recomputing**
— **(b)**, verified against real React's `didBailout` check in the same function (`completedWork.alternate !== null && completedWork.alternate.child === completedWork.child`) — the exact same reference-equality evidence Module 10 produced. `verify.mjs`'s last scenario proves this isn't just "happens to produce the same answer": the alternate's `subtreeFlags` was set to an arbitrary marker value (`999`) that bears no relationship to the actual child tree, and the bailed-out fiber's `subtreeFlags` came out `999` too — proof the value was copied, not recomputed from children that weren't even looked at.

**`collectEffects`'s pruning: `if (fiber.subtreeFlags === NoFlags) return`, skipping the entire branch**
— **(b)**, matching real React's actual commit-phase walk (`react-dom.development.js:22990-23003`, functions `commitBeforeMutationEffects_begin`/`_complete`): `if ((fiber.subtreeFlags & Mask) !== NoFlags && child !== null) { ...descend... } else { ...skip to completion/sibling... }`. This is the real payoff Module 10 set up: a bailed-out subtree's `subtreeFlags` will typically be `NoFlags` (nothing inside it changed), so the commit-phase walk — a SEPARATE traversal from the one that built the tree — never even enters it.

**`visitCount` instrumentation is test-only, not part of the module's real API**
— **(c)**. Real React doesn't count visits; this course adds a counter specifically so "pruning happened" is a checkable number (6 of 8 fibers) rather than an assertion taken on faith.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| No literal effect linked list — `subtreeFlags` bitmask instead | (b) forced | Matches what's actually in react-dom@18.3.1; the old linked list doesn't exist in this version |
| One-level OR of children's flags, bottom-up | (b) forced | Matches real `bubbleProperties`; sufficient given completion order |
| Bailed-out fibers copy `subtreeFlags`, don't recompute | (b) forced | Matches real React; proven with a deliberately arbitrary marker value |
| `collectEffects` prunes on `subtreeFlags === NoFlags` | (b) forced | Matches real React's actual commit-phase walk condition |
| `visitCount` instrumentation | (c) convention | Makes "pruning happened" a checkable number, not an assumption |

## What We Proved

Not just that `collectEffects` finds the one fiber that changed —
`effects` containing exactly `leafC1a` alone doesn't rule out a naive
implementation that visits every fiber and filters afterward. The
decisive number is `visitCount.value === 6` against `totalFibers === 8`:
`branchA`'s and `branchB`'s subtrees (`leafA1`, `leafB1`) were never
entered by `collectEffects` at all — not visited-and-found-clean, simply
never descended into, because their bubbled `subtreeFlags` said there was
nothing inside worth looking at. And the bailout short-circuit test proves
that guarantee is real even under adversarial conditions: a `subtreeFlags`
value that could only have come from blind copying, not recomputation,
came out exactly as copied.
