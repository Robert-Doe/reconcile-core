# Module 03 — Decisions

Source: [`fiber.js`](fiber.js). Verified by [`verify.mjs`](verify.mjs) — a
real 5-node tree is built with our `appendChild`, walked with
`forEachFiber`, and both the traversal order and every pointer
(`return`/`child`/`sibling`/`index`) are checked against independently
hand-computed expected values. Run it yourself: `node verify.mjs`.

Unlike Modules 01-02, real React's `FiberNode` constructor is **internal** —
not exported by `react-dom`'s public API — so we can't require-and-diff it
live. Instead, every field name below is a direct, line-numbered
transcription, read from `react-dom@18.3.1`'s actual source
(`node_modules/react-dom/cjs/react-dom.development.js:28073-28098`,
function `FiberNode`) in `research_reconciliation/react-lab`. Quoted
verbatim:

```
function FiberNode(tag, pendingProps, key, mode) {
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;
  this.ref = null;
  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.dependencies = null;
  this.mode = mode;
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;
  this.lanes = NoLanes;
  this.childLanes = NoLanes;
  this.alternate = null;
  // ...plus DEV-only profiling timers and debug fields, omitted here.
}
```

## Line-by-line

**Which ~10 of real React's ~25 fields we kept**
— **(c)**, a deliberate teaching cut, not a claim these are the "only important" fields. We kept exactly the fields this course's modules actually read or write: `tag`, `key`, `type`, `stateNode`, `return`/`child`/`sibling`/`index` (this module), `pendingProps`/`memoizedProps` (Module 04), `alternate` (Module 05), `deletions` (Module 08 — added retroactively to this file when that module needed it; see its DECISIONS.md for the real bug that surfaced when it was still missing), `flags` (Module 11). Cut: `elementType` (distinguishes a lazy/forwardRef-wrapped type from its resolved `type` — real but out of scope), `ref` (Module 01 already covers the concept on elements; we don't re-thread it through fibers since no module here builds `ref` forwarding), `updateQueue`/`memoizedState`/`dependencies` (hooks/context internals — Module 13 builds a parallel, simplified hook-state mechanism instead of wiring into these exact fields), `mode`/`lanes`/`childLanes` (concurrent-mode priority — Track 2's A3/A6 territory, not Track 1's), and all DEV-only profiling timers (zero effect on reconciliation, exist only for React DevTools' profiler tab).

**`return`/`child`/`sibling` over an array-of-children field**
— **(b)**, matching real React exactly, for the reason <a href="../prereqs/prereq_linked_list_tree.html">P2</a> lays out mechanically: a loop that needs to "come back up" after finishing a subtree (Module 06) needs an explicit parent pointer to come back up *to* — `return` is that pointer. An array-of-children shape has no equivalent of `return` at all; you'd have to pass it down as a separate loop parameter, which is exactly the call-stack-implicit state P3 shows you're trying to eliminate.

**`index`**
— **(b)**, present in real React for the same reason it's here: Module 09's keyed diff needs to know a fiber's *position* among its siblings independent of walking to find it, to detect "this item moved" without re-scanning the whole sibling list.

**`pendingProps` vs. `memoizedProps` — two prop fields, not one**
— **(b)**. Verified in the real constructor (`this.pendingProps = pendingProps; this.memoizedProps = null;`). `pendingProps` is what a render pass is currently working from; `memoizedProps` is what was actually committed last time. Module 10's bailout check is a comparison between these two — which is impossible if there's only one prop field to compare against itself.

**Object literal via `new FiberNode(...)` (a constructor), not a plain object literal**
— **(b)**, matching real React's own choice, whose source comment (visible above `FiderNode`, not reproduced above for brevity) explicitly discusses this as a V8 performance consideration: objects created via the same constructor share a "hidden class" in V8, making property access faster than object literals built ad hoc with varying field sets. We match the mechanism (a constructor function) without chasing the specific V8 shape-stability tricks real React's comment describes (pre-initializing double-typed fields to avoid a "performance cliff") — those are a real, documented V8 quirk but affect performance, not correctness, so this course doesn't reproduce them.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| ~9 of 25 real fields kept | (c) convention | Every kept field is read/written by a later module; the rest are named and deferred, not hidden |
| `return`/`child`/`sibling`/`index`, no children array | (b) forced | Matches real React; required by Module 06's explicit-loop traversal |
| Separate `pendingProps`/`memoizedProps` | (b) forced | Required by Module 10's bailout comparison |
| Constructor function, not object literal | (b) forced | Matches real React's stated V8 performance rationale; we don't chase the double-init trick itself |

## What We Proved

A 5-node tree, built with nothing but `appendChild` calls that set
`return`/`child`/`sibling`/`index`, can be fully and correctly enumerated
depth-first, parent-before-children, using `forEachFiber` — a function
that reads only those four fields and touches nothing else. Every pointer
in the resulting structure was checked against an independently
hand-computed expectation, not merely printed and eyeballed. This is the
data structure every later module in Track 1 builds on: not an abstraction
for its own sake, but the specific shape that makes Module 06's
pause-and-resume loop possible.
