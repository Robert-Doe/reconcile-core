# Module 07 — Decisions

Source: [`yielding.js`](yielding.js). Verified by [`verify.mjs`](verify.mjs)
in two deliberately separate ways: (1) a deterministic, zero-timing mock
`shouldYield` proves a paused-then-resumed render produces the byte-identical
tree to an unyielded one; (2) a real `setTimeout`-based run proves a
competing macrotask, queued before rendering starts, genuinely executes
*before* our multi-chunk render finishes — real evidence of control
returning to the event loop mid-render, not just "the loop stopped." Run
it yourself: `node verify.mjs`.

## Line-by-line

**`workLoopConcurrent`'s check-before-process structure**
— **(b)**, verified byte-for-byte in shape against real React's actual function (`react-dom.development.js:26579-26584`): `while (workInProgress !== null && !shouldYield()) { performUnitOfWork(workInProgress); }`. We reproduce the exact same condition ordering — `shouldYield` is checked *before* each unit, not after — which is why a `shouldYield` that's already tripped when a chunk begins does zero units of work that chunk, not one.

**`shouldYield` is an injected function, not something this module decides for itself**
— **(b)**. Verified directly: real `react-dom.development.js:27` does `var Scheduler = require('scheduler');` and line 4759 does `var shouldYield = Scheduler.unstable_shouldYield;` — a genuinely separate npm package, imported. Real React doesn't hardcode a deadline check inline; it delegates entirely to a swappable package — confirmed further by the fact that `node_modules/scheduler/cjs/` (in this repo) actually ships a `scheduler-unstable_mock.development.js` build, meaning the React team built this exact swap-for-testing capability into their own release artifacts. Our `createShouldYield` factory pattern is the same idea, scaled to this course's single-file scope.

**`createShouldYield` is a FACTORY, called fresh every chunk — not one shared `shouldYield` reused across chunks**
— **(c)**, and the most important lesson this module's own construction produced. See "What We Proved" below for the real bug this caused when it was (briefly) not true.

**`makeDeadlineShouldYield` compares `performance.now()` against a precomputed deadline**
— **(b)**, matching the concept in real Scheduler (which tracks an expiration time per task and compares it against the clock) — simplified to a single passed-in budget rather than Scheduler's full priority-queue-of-tasks model, which is genuinely out of scope for this course (Track 2's A3 goes further into the real package).

**`schedule` defaults to `setTimeout(cb, 0)`, not `MessageChannel`**
— **(c)**, a documented, deliberate simplification. Real React's Scheduler package uses `MessageChannel` specifically because it fires sooner and more consistently than `setTimeout(fn, 0)` (which browsers clamp to a minimum delay, historically 4ms when nested). We use `setTimeout` here because the *mechanism being taught* — "stop, schedule a continuation, return, get resumed later" — is identical either way; only the latency changes. Track 2's A3 is where the real `MessageChannel`-based scheduler gets its own treatment.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Check-before-process loop structure | (b) forced | Matches real `workLoopConcurrent` exactly |
| `shouldYield` as an injected function | (b) forced | Matches real React's actual `scheduler` package boundary |
| `createShouldYield` factory, not a shared function | (c) convention, but load-bearing | Prevents state from one chunk leaking into the next — see the bug below |
| `performance.now()`-based deadline | (b) forced concept, (c) simplified scope | Matches Scheduler's real comparison; drops its priority-queue machinery |
| `setTimeout` instead of `MessageChannel` | (c) convention | Same yielding mechanism, different (slower, simpler) latency; real scheduler is Track 2 A3 |

## What We Proved

**The bug this module's own first draft hit, and why it matters:** the
first version of `verify.mjs`'s Test 2 passed a single, shared
`shouldYield` closure (a call counter) into `renderRootConcurrent`, reused
across every chunk. Chunk 1 ran fine, processed 2 units, and yielded on
the 3rd check. Chunk 2 resumed — and the *same* counter, now already past
its trip threshold, yielded **immediately**, doing zero units of work.
Every subsequent chunk did the same: zero work, immediate yield, forever —
an infinite loop of empty chunks that never completed and had to be killed
by hand during this module's construction. The fix was exactly the
`createShouldYield` factory pattern now documented above: a fresh
`shouldYield` (fresh counter, or in production, a fresh deadline) every
single chunk. This is not a hypothetical footgun — it is a real, live bug
this course produced and fixed while building the module about the exact
mechanism the bug broke.

**What the passing tests now show:** a 27-fiber tree, paused after
exactly 2 real units of work and resumed, produces a tree indistinguishable
from one built in a single unyielded pass. And in a genuinely
macrotask-driven run (`setTimeout`, not a simulation of one), a competing
task queued *before* rendering began was confirmed to execute *before*
rendering finished — 14 real chunks were needed, and somewhere in that
gap, the browser (here, Node's event loop) got a turn. That is what
"yielding" means, mechanically: not that the work paused, but that
something *else* got to run because it did.
