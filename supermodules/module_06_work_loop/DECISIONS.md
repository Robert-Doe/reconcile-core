# Module 06 — Decisions

Source: [`workLoop.js`](workLoop.js). Verified by [`verify.mjs`](verify.mjs)
two ways: (1) the exact same element tree is mounted via Module 04's
recursive `mount()` and via this module's explicit `workLoopSync`, and
their depth-first traces (Module 03's unmodified `forEachFiber`) are
diffed — proven identical; (2) a manual step-by-step trace calls
`performUnitOfWork` once per fiber and counts exactly 7 calls for a 7-fiber
tree, showing the loop visits each fiber exactly once, one at a time. Run
it yourself: `node verify.mjs`.

## Line-by-line

**Three-function split: `beginWork` / `completeUnitOfWork` / `performUnitOfWork`**
— **(b)**, matching real React's actual architecture exactly (`react-dom.development.js:26502-26707`, functions of the identical names). This isn't an arbitrary decomposition — `performUnitOfWork` calling `beginWork` and branching on its result is the literal real algorithm (verified: real `performUnitOfWork` at line 26605 — `if (next === null) { completeUnitOfWork(unitOfWork); } else { workInProgress = next; }`).

**`beginWork` creates only ONE level of children, never recurses**
— **(b)**, the single most important property of this module, and the entire reason it exists instead of just keeping Module 04's `mount()`. `verify.mjs`'s manual single-step trace proves it directly: 7 calls to `performUnitOfWork`, each doing a bounded, small amount of work, with the *loop* — not any function call — providing the depth. Real React's `beginWork` is the same shape: it produces `workInProgress.child` and returns, never calling itself.

**`completeUnitOfWork`: try sibling, else go to parent and repeat**
— **(b)**, matching real React's actual `do...while` loop (`react-dom.development.js:26615-26707`): check `completedWork.sibling`; if present, that's next; otherwise reassign `completedWork = returnFiber` and loop again; if `returnFiber` is `null`, the whole tree is done. We implement the identical loop, simplified by dropping the `Incomplete`-flag/error-recovery branch (real React's version also handles a thrown-during-render case — out of scope; this course's fibers can't currently throw).

**The cursor is an explicit return value, not a module-level variable**
— **(c)**, a deliberate divergence from real React, made for a specific forward-looking reason. Real React's `performUnitOfWork`/`completeUnitOfWork` mutate a *module-level* `workInProgress` variable as a side effect and return nothing (`void`) — any code anywhere in the reconciler module can read or resume from that shared variable. This course instead threads the cursor explicitly: `performUnitOfWork` *returns* the next fiber, and `workLoopSync` holds it in a local `next` variable. Both approaches are equally resumable in principle; we chose the explicit version specifically because Module 07 needs to demonstrate pausing and resuming the loop from *outside* a single function call, and an explicit local variable the caller controls makes that demonstration concrete without introducing shared mutable module state this course would otherwise have to explain away.

**`fiber.memoizedProps = fiber.pendingProps` runs immediately after `beginWork`, inside `performUnitOfWork`**
— **(b)**, verified at real React's line 26603 (`unitOfWork.memoizedProps = unitOfWork.pendingProps;`), in exactly this position — after `beginWork` returns, before branching on `next`. This is the precise moment a fiber's "pending" props become its "memoized" (i.e., committed-to-this-fiber) props, and it happens unconditionally, whether or not this fiber spawned children.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `beginWork`/`completeUnitOfWork`/`performUnitOfWork` split | (b) forced | Matches real React's actual function names and structure |
| `beginWork` never recurses, only goes one level | (b) forced | The entire point of the module; verified by step-count |
| `completeUnitOfWork`: sibling-then-parent `do...while` | (b) forced | Matches real React exactly, minus error-recovery (out of scope) |
| Explicit returned cursor instead of a module-level variable | (c) convention | Sets up Module 07's pause/resume demonstration without hidden global state |
| `memoizedProps` assignment placement | (b) forced | Matches real React's exact line ordering |

## What We Proved

The exact same input element tree, processed two structurally different
ways — Module 04's recursive `mount()` and this module's explicit,
loop-driven `workLoopSync` — produces byte-identical traversal traces
(same fibers, same tags, same order). And a manual instrumented run of the
loop shows it takes exactly as many `performUnitOfWork` calls as there are
fibers in the tree — no more, no fewer, and critically, no JS call-stack
depth ever exceeds one frame of `performUnitOfWork`/`beginWork`/
`completeUnitOfWork` at a time, regardless of how deep the *tree* is. That
last property — constant call-stack depth regardless of tree depth — is
exactly what Module 07 needs to be true before it can add "and we can stop
here and come back later" on top of it.
