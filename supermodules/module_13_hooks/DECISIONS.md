# Module 13 — Decisions

Source: [`hooks.js`](hooks.js). Verified by [`verify.mjs`](verify.mjs)
across three proofs: a mount builds a real 2-node linked list in call
order; state survives a genuine Module-05 double-buffered update
(including a functional updater); and skipping a hook conditionally
doesn't throw immediately — it silently shortens the fiber's hook list,
and the error only surfaces on the *next* render that expects more hooks
than that shortened list has. Run it yourself: `node verify.mjs`.

## Line-by-line

**Hooks are a linked list (`{ memoizedState, queue, next }`), stored as `fiber.memoizedState`**
— **(b)**, verified byte-for-byte in shape against real React's actual hook object literal (`react-dom.development.js:15633-15639`), simplified by dropping `baseState`/`baseQueue` (see below). The *first* hook IS `fiber.memoizedState` directly — not a separate array field — exactly matching real React's choice to reuse that field for two different purposes depending on fiber type (a host fiber's `memoizedState` means something DOM-specific; a function-component fiber's means "first hook").

**Module-level render cursor (`currentlyRenderingFiber`/`workInProgressHook`/`currentHook`), not an explicit parameter**
— **(b)**, and a deliberate exception to a pattern this course otherwise avoided (Module 06 chose an explicit returned cursor specifically to avoid module-level state — see that module's DECISIONS.md). Verified that real React's own hook infrastructure genuinely uses module-level variables of these exact names for this exact purpose. The reason this course matches it here rather than threading a cursor as a parameter: hook functions (`useState`, etc.) are called by component AUTHORS, who never pass "which fiber, which position" — the entire premise of P5 is that position is inferred from call order, invisibly. An explicit parameter would defeat the pedagogical point; the implicit module-level cursor IS the mechanism being taught.

**`updateWorkInProgressHook` clones the PREVIOUS render's hook forward — never mutates it**
— **(b)**, verified against real React's actual function (`react-dom.development.js:15652-15710`, simplified by dropping the "already has a workInProgress hook to reuse" branch, which exists for render-phase-update/Suspense-retry scenarios out of scope here). `verify.mjs`'s Proof 2 confirms this directly: `fiberB.memoizedState !== fiberA.memoizedState` — a genuinely new list — and, more importantly, `fiberA.memoizedState.memoizedState` is still `0` afterward, untouched. This is Module 05's double-buffering guarantee, holding one module later, for hook state specifically.

**`useState` is implemented as `useReducer(basicStateReducer)`, not its own separate mechanism**
— **(b)**, verified directly: real React's actual `updateState` (`react-dom.development.js:16184-16186`) is literally `function updateState(initialState) { return updateReducer(basicStateReducer); }`. We match this exactly, including `basicStateReducer`'s real definition (`typeof action === 'function' ? action(state) : action`) — which is *why* `setCount(c => c + 1)` (a function) and `setCount(5)` (a plain value) both work through the same dispatch path.

**The pending-update queue is a plain array, applied in order, with no priority/lane skipping**
— **(c)**, a significant, explicitly-flagged simplification. Real React's actual queue (`react-dom.development.js:15748-15820+`) is a circular linked list supporting *skipping* updates whose priority (lane) doesn't match the current render, specifically so a low-priority update doesn't block a high-priority one from computing correct interim state. This course has no lanes (Track 1 has no priority system at all — Track 2's A3/A6 is where that's examined), so a plain in-order array is behaviorally equivalent for every scenario this course exercises, at the cost of not supporting concurrent-priority reordering.

**The real thrown error's exact wording is reproduced verbatim**
— **(b)**. `'Rendered more hooks than during the previous render.'` is copied from real React's actual error (`react-dom.development.js:15688`), not paraphrased — so a learner who later sees this exact message in a real app immediately recognizes the mechanism behind it.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Hook shape `{memoizedState, queue, next}` on `fiber.memoizedState` | (b) forced | Matches real React's actual object shape and field reuse |
| Module-level render cursor, not a parameter | (b) forced (exception to Module 06's own convention) | Hook position must be implicit — that's the whole mechanism |
| Update path clones forward, never mutates the old list | (b) forced, verified | Module 05's double-buffering guarantee, confirmed to still hold |
| `useState` = `useReducer(basicStateReducer)` | (b) forced | Matches real React's actual implementation exactly |
| Plain array queue, no priority/lane skipping | (c) convention | No priority system in Track 1; Track 2 A3/A6 territory |
| Real error message reproduced verbatim | (b) forced | So the message is recognizable in real apps later |

## What We Proved

State genuinely persists across a real double-buffered render — not
because we assumed Module 05's guarantee would extend to hooks, but
because `verify.mjs` actually exercises `createWorkInProgress` (imported
unmodified from Module 05) and checks, by reference, that the old fiber's
hook list is untouched while the new one reflects two queued updates
applied in order (`0 → 5 → 6`). And the conditional-hook danger from P5
isn't asserted as folklore — it's produced on a specific, timed schedule
that matches real React's actual behavior: the render that skips a hook
doesn't fail at all; the *next* render, expecting a hook list as long as
last time's, is the one that throws, with the exact real error message.
