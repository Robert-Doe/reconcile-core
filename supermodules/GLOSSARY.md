# Glossary

Every new term, file, or constant introduced by the course, in the order it
first appears alphabetically below. Each entry is tagged with the module
that first introduces it. This file is only ever appended to / inserted
into — never rewritten from scratch.

### `appendAllChildren`
Walks a newly-completed subtree, appending every host descendant's `stateNode` into a new (still detached) parent instance — entirely off-screen. Non-recursive, return-pointer-patching traversal, transcribed from real React. *First seen: Module 12.*

### `alternate`
A field on a fiber reserved for its "other buffer" twin — `current.alternate` is the corresponding `workInProgress` fiber and vice versa. Left `null` until Module 05 gives it a job. *First seen: Module 03 (field reserved); Module 05 (used).*

### automatic JSX runtime
The modern JSX compilation mode (the default for current Vite/`@vitejs/plugin-react`, current Create React App templates, and Next.js) that compiles JSX to `jsx`/`jsxs` calls from `react/jsx-runtime`, auto-inserting that import — no `import React from 'react'` required just to use JSX. Contrast: **classic JSX runtime**. *First seen: Module 02.*

### `$$typeof`
The field on a React element (and later, other tagged internal objects) holding an unforgeable `Symbol`. Lets code distinguish "a real element" from any plain object that merely looks like one — critically, from anything `JSON.parse` could ever produce. *First seen: Module 01.*

### container (`FiberRootNode`, simplified)
This course's stand-in for real React's root object: `{ current }`, holding the single pointer that says which buffered tree is presently real. Real React's actual `FiberRootNode` carries much more (DOM container, scheduling/lane bookkeeping) — out of scope here. *First seen: Module 05.*

### `createElement`
The function that turns `(type, props, ...children)` into a plain element object. Does no rendering, touches no DOM, has no side effects. *First seen: Module 01.*

### `deleteChild` / `deleteRemainingChildren`
Record a fiber (or a whole sibling chain) on its parent's `deletions` list — marking intent to remove, without touching the DOM or the fiber itself. Actual removal happens later, in the commit phase. *First seen: Module 08.*

### `deletions` (on a fiber)
An array of child fibers marked for removal during reconciliation, kept on the PARENT. `null` until something is actually deleted. *First seen: Module 03 (field reserved, later corrected — see Module 03's DECISIONS.md); Module 08 (used).*

### `defaultProps`
An object on a component function (`Component.defaultProps = {...}`) whose fields backfill any prop that is exactly `undefined` (not merely omitted) at element-creation time. *First seen: Module 01.*

### `child` / `sibling` / `return` (fiber pointers)
The three fields that fully describe a fiber tree's shape: `child` is the first child, `sibling` is the next node with the same parent, `return` is the parent. No array-of-children field exists anywhere on a fiber. See <a href="../prereqs/prereq_linked_list_tree.html">P2</a>. *First seen: Module 03.*

### `completeUnitOfWork`
When a fiber has no more work of its own, finds the next fiber to visit anywhere in the tree: try its sibling; if none, go to its parent and repeat. Returns `null` once the walk goes past the root. *First seen: Module 06.*

### `createShouldYield` (factory)
A zero-argument function that returns a *fresh* `shouldYield` function, called once per chunk — never a single `shouldYield` reused across chunks, whose leftover state (a tripped counter or expired deadline) would otherwise make every later chunk yield instantly without doing any work. *First seen: Module 07.*

### `createWorkInProgress`
Given a `current` fiber and new props, returns the fiber to render into — reusing `current.alternate` if one already exists rather than allocating a new object. The reason at most 2 fiber objects ever exist per tree position. *First seen: Module 05.*

### `current` (tree)
Whichever of the two buffered trees at a given position is presently reflected on screen, per the container's `.current` pointer. Never mutated by an in-progress render — only `workInProgress` is. *First seen: Module 05.*

### bailout
Skipping a fiber's own work AND its entire child subtree, because `current.memoizedProps === pendingProps` (true reference equality) and nothing else forced an update. Proven by `workInProgress.child` being the exact same object as `current.child` — not a clone. *First seen: Module 10.*

### `bubbleProperties`
Runs at each fiber's "complete" step, bottom-up: ORs every immediate child's `subtreeFlags | flags` into this fiber's own `subtreeFlags`. A bailed-out fiber (Module 10) copies its alternate's value instead of recomputing. *First seen: Module 11.*

### `basicStateReducer`
The real reducer `useState` is secretly built on: `(state, action) => typeof action === 'function' ? action(state) : action`. Why `setState(5)` and `setState(c => c+1)` both work through the same path. *First seen: Module 13.*

### `beginWork`
Does one fiber's own work — creating fiber(s) for its immediate children only, never descending further — and returns the first child (or `null`). The loop, not this function, provides traversal depth. *First seen: Module 06.*

### `commitPlacement` / `getHostSibling`
Attaches a subtree to the real, live document: finds the nearest host-tagged ancestor as the real parent, finds a stable (not-also-`Placement`-flagged) real sibling to insert before (or `null` to append), and inserts. Only ever called on outermost new fibers. *First seen: Module 12.*

### `collectEffects`
A second, pruned walk over the SAME fiber tree Module 06 built: skips any branch whose `subtreeFlags` is `NoFlags` entirely, without descending into it. Verified to visit fewer fibers than exist when most of a tree is unchanged. *First seen: Module 11.*

### classic JSX runtime
The older JSX compilation mode that compiles JSX to `React.createElement(type, props, ...children)` calls, requiring `React` to be in scope in every file that uses JSX. Contrast: **automatic JSX runtime**, which is what current default tooling (including this repo's Vite config) actually uses. *First seen: Module 02.*

### element (React element)
The inert data structure `{ $$typeof, type, key, ref, props }` returned by `createElement`. Not a DOM node; not a component instance; just data describing an intention. *First seen: Module 01.*

### double buffering
The technique of keeping at most two objects per tree position — `current` and `workInProgress` — and reusing them forever via `.alternate`, rather than allocating a fresh tree every render. Guarantees an in-progress render can never corrupt what's on screen, since it never touches the `current` objects. *First seen: Module 05.*

### effect list (historical term)
A genuine linked list (`firstEffect`/`nextEffect`/`lastEffect`) that existed in React 16/17, collecting fibers with pending commit work. Removed in favor of `subtreeFlags` bitmask-bubbling — confirmed absent from real react-dom@18.3.1 by direct grep. The name persists in common usage; the mechanism it names does not, in this version. *First seen: Module 11.*

### hook
A linked-list node (`{ memoizedState, queue, next }`) living on a `FunctionComponent` fiber's own `memoizedState` field, addressed by call-order position, not by name. See <a href="../prereqs/prereq_closures_call_order.html">P5</a>. *First seen: Module 13.*

### fiber
A durable tree node that persists across renders (contrast: an element, rebuilt from scratch every render). Holds `pendingProps`/`memoizedProps` so "new" and "last time" can be compared, and `child`/`sibling`/`return` for tree shape. *First seen: Module 03.*

### `index` (on a fiber)
A fiber's position among its siblings. Becomes significant once list items can reorder between renders (Module 09) — it lets the diff detect "this item moved" without a full re-scan. *First seen: Module 03.*

### `jsx` / `jsxs`
The two entry points the automatic JSX runtime compiles to — `jsx(type, props, key)` for elements with 0-or-1 children (decided at compile time), `jsxs(type, props, key)` for elements with a statically-known 2+ children. In react@18.3.1's real source, both currently delegate to the identical underlying implementation. *First seen: Module 02.*

### `jsxImportSource`
A compiler option (esbuild/Babel) naming which package's `jsx-runtime` module to import from — `"react"` resolves to `react/jsx-runtime`. *First seen: Module 02.*

### `key`
A string identity you supply on an element, used by array reconciliation (Module 09) to answer "is this the same logical item as last render?" — a question reference equality can't answer, since a new object is built every render. *First seen: Module 01 (extraction); Module 09 (use).*

### `memo` (via `resolveMemoProps`)
Not a separate bailout mechanism — a way of substituting a fiber's OLD props object for a NEW one when `shallowEqual` says they match, so the existing reference-equality bailout check fires more often. Verified against real React's own source comment for this exact substitution. Module 14's `memo(Component)` is the opt-in wrapper that actually routes a component through this — proven necessary (not automatic) by a real bug where a "stable-looking" props reference still failed to bail out until wrapped. *First seen: Module 10 (mechanism); Module 14 (opt-in wrapper, applied live).*

### `mountApp`
Module 14's entry point: creates the root/app fiber pair, runs the full render loop, commits, and wires up `scheduleUpdate` so every `useState` call automatically triggers a real re-render. Returns a handle with `.update()` and `.hostRootFiber`. *First seen: Module 14.*

### `mountWorkInProgressHook` / `updateWorkInProgressHook`
The mount/update dispatcher pair for hooks: mount allocates a fresh hook node and appends it; update clones the previous render's corresponding hook (by position) forward onto the new fiber, never mutating the old one. *First seen: Module 13.*

### `mount`
The function that turns an element tree into a fully-linked fiber tree on first render — including calling every function component it encounters to discover what it renders. Recursive in this course's Track 1 (Module 04); Module 06 rebuilds the same tree-shape guarantee with an explicit, pausable loop instead. *First seen: Module 04.*

### `normalizeChildren`
Flattens `props.children` (whatever shape Module 01's children-collapse rule left it in) into a flat list, dropping exactly three values that render to nothing: `null`, `undefined`, `boolean`. Notably does *not* drop `0` or `''` — the real reason `{count && <Badge/>}` can render a stray visible "0". *First seen: Module 04.*

### `memoizedProps`
A fiber's props as of the last completed render — what's actually on screen right now. Compared against `pendingProps` by Module 10's bailout check. *First seen: Module 03.*

### `performUnitOfWork`
Runs `beginWork` on a fiber, marks its props as memoized, and decides what's next: the child `beginWork` produced, or (if none) whatever `completeUnitOfWork` finds. One call = one fiber visited. *First seen: Module 06.*

### `renderRootConcurrent`
Drives `workLoopConcurrent` across possibly many macrotask-scheduled chunks: run a chunk, check if the tree is done, else schedule a continuation and return — genuinely giving up control between chunks. *First seen: Module 07.*

### `placeChild`
Decides, per fiber, whether its position counts as "stayed" or "moved": a reused fiber whose OLD index is below the running high-water mark is flagged `Placement`; a brand-new fiber always is. A single forward pass, not a true minimal-moves computation — see Module 09's Scenario 4 for where that shows. *First seen: Module 09.*

### `Placement` (flag)
A bit (`2`, matching real React's actual value) recorded on a fiber's `flags` meaning "this needs a real DOM insert or move" — decided during reconciliation (Module 09), acted on during commit (Module 12). *First seen: Module 09.*

### `pendingProps`
A fiber's props for the render currently in progress — not yet reconciled or committed. *First seen: Module 03.*

### `prepareToUseHooks` / `finishHooks`
Resets the module-level hook render cursor (`currentlyRenderingFiber`, `workInProgressHook`, `currentHook`) to point at a given fiber before its render, and clears it after — matching real React's own module-level cursor variables of the same purpose. *First seen: Module 13.*

### `props`
The object holding every non-reserved field passed to `createElement`, plus `children` if any were given. *First seen: Module 01.*

### `props.children`
The field holding an element's children: `undefined` if none, a bare value if exactly one, an array if two or more. This three-way shape is a real React behavior, not a simplification. *First seen: Module 01.*

### `reconcileChildrenArray`
Reconciles a whole array of new children against the old sibling chain: a lockstep phase for the common case, then either a fast insert-only path or a key-`Map`-based lookup phase for leftovers, using `placeChild` to flag moves. *First seen: Module 09.*

### `reconcileSingleChild`
Given an old fiber and a new element for the same position, decides reuse (same key and type — clone via double buffering) or replace (create fresh, mark the old one for deletion). The first real diffing decision in this course. *First seen: Module 08.*

### `REACT_ELEMENT_TYPE`
The specific value `Symbol.for('react.element')` stored in every element's `$$typeof`. *First seen: Module 01.*

### `ref`
A reserved element field (extracted out of the props object passed to `createElement`, never left inside `props` itself) that will eventually point at a real DOM node or component instance once one exists. *First seen: Module 01.*

### unit of work
One fiber's worth of processing — one call to `performUnitOfWork`. A tree with N fibers takes exactly N units of work to fully process, regardless of the tree's shape or depth. *First seen: Module 06.*

### `shallowEqual`
Real React's actual equality check: same reference (via `Object.is`) short-circuits true; otherwise same key count and every value `Object.is`-equal. Inherits `Object.is`'s NaN/±0 quirks from `===`. *First seen: Module 10.*

### `shouldBailout`
The literal bailout question: is `current.memoizedProps` the exact same object as this render's `pendingProps`, and is there no scheduled update forcing work anyway? Reference equality, not value equality. *First seen: Module 10.*

### `shouldYield`
A function answering "should the work loop stop now?" — imported from a separate `scheduler` package in real React (confirmed by reading its actual `require('scheduler')` call), not decided by the reconciler itself. *First seen: Module 07.*

### `useState`
This course's hook, verified to be real React's actual `useReducer(basicStateReducer)` under the hood — not a separate mechanism. Returns `[currentValue, setState]`; `setState` only ever queues an action, applied on the next render. *First seen: Module 13.*

### `useFiber`
Real React's name (matched exactly by this course) for "clone a fiber for reuse": `createWorkInProgress` plus resetting `index` to 0 and `sibling` to null, since a reused fiber must not carry forward stale tree-shape data. *First seen: Module 08.*

### `stateNode`
A fiber's field pointing at the real underlying thing it represents once one exists — a real DOM node for a host component, a class instance for a class component. `null` until Module 04's mount pass creates one. *First seen: Module 03 (field reserved); Module 04 (populated).*

### `subtreeFlags`
A bitmask on a fiber meaning "something SOMEWHERE inside my children needs committing" — distinct from its own `flags` ("something about ME needs committing"). Bubbled bottom-up by `bubbleProperties`; used to prune the commit-phase walk. *First seen: Module 11.*

### `Symbol.for` (global symbol registry)
A `Symbol` creation method that returns the *same* symbol value for the same string key, across every place in a JS realm that calls it — unlike bare `Symbol()`, which is unique every call. Used for `REACT_ELEMENT_TYPE` specifically so two separately bundled copies of a React-like library still recognize each other's elements. *First seen: Module 01.*

### `tag` (WorkTag)
A small integer on a fiber identifying what kind of node it is: `FunctionComponent = 0`, `HostRoot = 3`, `HostComponent = 5` (a real DOM element), `HostText = 6` (a text node). Values verified directly from real `react-dom@18.3.1` source. *First seen: Module 03.*

### `workInProgress`
The buffered tree currently being built/updated — safe to mutate freely, because nothing else reads from it until it's swapped in to become `current`. *First seen: Module 05.*

### `workLoopSync`
Runs an entire tree to completion via `performUnitOfWork`, with no yielding — `next = rootFiber; while (next !== null) next = performUnitOfWork(next);`. Module 07 adds a deadline check to this same shape. *First seen: Module 06.*

<!-- Alphabetical. Insert new entries in place. -->
