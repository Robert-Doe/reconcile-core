# Module 09 — Decisions

Source: [`keyedDiff.js`](keyedDiff.js). Verified by [`verify.mjs`](verify.mjs)
across four scenarios — no change, append, remove-from-middle, and a
front-move reorder — checking the exact set of fibers flagged `Placement`
in each case, not just the resulting order. Run it yourself:
`node verify.mjs`.

## Line-by-line

**The algorithm can't do a true two-ended or LIS diff, by real React's own admission**
— **(b)**, quoted verbatim from real React's actual source comment directly above `reconcileChildrenArray` (`react-dom.development.js:13545-13559`): *"This algorithm can't optimize by searching from both ends since we don't have backpointers on fibers... In this first iteration, we'll just live with hitting the bad case."* This is not this course's simplification — real, shipping React does not run a classic Longest-Increasing-Subsequence diff. It runs the single-forward-pass heuristic below, and has for years.

**Phase 1: lockstep walk, bail on first key mismatch**
— **(b)**, matching real `reconcileChildrenArray`'s main loop (`13577-13622`) exactly: walk old and new in parallel while `newValue`'s key equals `oldFiber.key` at the *same position*; the instant they disagree, stop this phase entirely — even if a later position would have matched. This is deliberate: real React optimizes for the common case (few or no changes), and pays a bigger cost (the Map-based phase 2) only when the fast assumption fails.

**Phase 1 exit → three possible continuations, in this exact priority order**
— **(b)**, matching real React's three-way branch after the lockstep loop: (1) if every new child was consumed, delete whatever's left of the old chain and stop (`13624-13634`); (2) else if the old chain is exhausted, fast-path every remaining new child as a fresh insertion, no map needed (`13636-13663`); (3) else, build a key→fiber `Map` from the remaining old chain and resolve the rest by lookup (`13664-13701`). Only the third branch can ever discover a *move* — the first two are both "no more comparison needed" shortcuts.

**`placeChild`'s "high-water mark" move heuristic**
— **(b)**, verified byte-for-byte against real React's actual function (`react-dom.development.js:13214-13242`). A reused fiber whose *old* index is below `lastPlacedIndex` (the highest old index placed so far, in new order) is flagged `Placement` — a physical move. A reused fiber at or above the mark is left alone and *becomes* the new mark. A brand-new fiber is always `Placement`. This is a single running maximum, not a full subsequence computation — cheap, single-pass, and, as Scenario 4 demonstrates, not always minimal.

**Real, verified consequence: moving the last item to the front flags every OTHER item as moved**
— **(b)**, not a bug in this course's implementation — a real, well-documented property of real React's actual algorithm, reproduced exactly by `verify.mjs`'s Scenario 4. See "What We Proved" below for the trace.

**`Placement = 2`, matching real React's actual bit value**
— **(b)**, verified directly (`react-dom.development.js:4356-4358`). We use the real constant rather than inventing our own numbering, since a later module or reader comparing against real DevTools output should see the same number.

**No `updateFromMap` split by node kind (text/element/portal/fragment)**
— **(c)**, a scope cut. Real React's map-lookup phase dispatches through several kind-specific helpers (`updateTextNode`, `updateElement`, `updatePortal`, `updateFragment`); this course's `sameType` check folds "is this a compatible replacement" into one function, since portals and fragments are out of scope entirely (documented in the ROADMAP's "out of scope" list).

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Single forward-pass heuristic, not true LIS | (b) forced | Matches real React exactly, per its own source comment |
| Lockstep phase 1, bail on first key mismatch | (b) forced | Matches real `reconcileChildrenArray`'s main loop |
| Three-way branch after phase 1 (all-consumed / old-exhausted / map phase) | (b) forced | Matches real React's exact branch order |
| High-water-mark move heuristic in `placeChild` | (b) forced | Matches real React's actual function, byte-for-byte |
| `Placement = 2` | (b) forced | Matches real React's real, DevTools-visible bit value |
| No text/element/portal/fragment split in the map phase | (c) convention | Portals/fragments out of scope for this course |

## What We Proved

**Scenarios 1-3 confirm the ordinary cases behave as expected:** no change
moves nothing; an append flags only the new item; removing a middle item
deletes it and moves nothing else — survivors keep their relative order,
so the high-water mark never gets crossed.

**Scenario 4 is the one worth sitting with.** Old order `[A, B, C]`,
new order `[C, A, B]` — C moved from last to first, A and B didn't
conceptually move at all, just shifted position because something ahead of
them changed. Yet the verified output is `movedKeys → ["A", "B"]` — C
is **not** flagged, and A and B **both are**. Tracing why: C is placed
first (new position 0), and since nothing has been placed yet
(`lastPlacedIndex` starts at 0), C's old index (2) is not less than 0, so
it "stays" and immediately becomes the new high-water mark (2). A is
placed next — its old index (0) *is* less than the mark (2), so it's
flagged as moved. B, same story (old index 1, still less than mark 2),
also flagged. The algorithm isn't wrong; it's answering a narrower
question than "what's the minimal set of moves" — it's answering "reading
old positions left to right in NEW order, where does the increasing
sequence break?" and by that measure, A and B are the ones out of order
relative to C, not the other way around. This is the real, shipping
behavior behind a real, commonly-reported "why did React re-render my
whole list when I only moved one item" question — and now it's been
produced and inspected directly, not just cited.
