# React Reconciliation — from bundle to painted pixel

A code-first course: you build a real, working reconciler from scratch, then
verify every mechanism you built against the actual React/react-dom source.
Two tracks, the way an OS course splits kernel from the browser sitting on
top of it.

## Why two tracks

**Track 1 (the engine)** never imports React. You hand-build an element
representation, a fiber-shaped tree, a work loop, a keyed diff, and a commit
phase that calls real `appendChild`/`insertBefore`/`removeChild` — a working
mini-reconciler, small enough to hold in your head completely.

**Track 2 (reading the real engine)** imports actual `react` / `react-dom`,
opens its source and DevTools, and checks each Track-1 result against the
real implementation — same data shape? same algorithm? what did the real
engine add that yours doesn't have (priority, interruption, Suspense)? This
is the "applied layer" — it has nothing to prove on its own; every row
depends on a Track-1 module already existing.

---

## Track 1 — The Engine (build it, from zero, no React import)

### Phase 1: Elements — the data, before there's a tree walker

| # | Module | What it proves | Directory | Status |
|---|--------|-----------------|-----------|--------|
| 01 | `createElement` & the Element Shape | An "element" is a plain, inert JS object (`{type, props, key}`) — not a DOM node, not magic | `module_01_elements/` | Done |
| 02 | JSX Desugaring by Hand | JSX is pure syntax sugar for `createElement`/`jsx()` calls — proved by running real JSX through Babel and diffing the output against hand-written calls | `module_02_jsx_desugar/` | Done |

### Phase 2: The Fiber Tree — a durable structure to walk without recursion

| # | Module | What it proves | Directory | Status |
|---|--------|-----------------|-----------|--------|
| 03 | The Fiber Node & Linked-List Tree | A tree can be fully represented and walked (down, across, back up) using only `child`/`sibling`/`return` pointers — no recursion, no array-of-children | `module_03_fiber_node/` | Done |
| 04 | Mount: Element Tree → Fiber Tree | `createFiberFromElement` deterministically turns an element tree into a fiber tree on first render | `module_04_mount/` | Done |
| 05 | Double Buffering: `current` vs `workInProgress` | Two trees can coexist, and swapping which one is "live" can happen atomically, so the DOM never shows a half-built tree | `module_05_double_buffer/` | Done |

### Phase 3: The Work Loop — traversal as an explicit loop, not the call stack

| # | Module | What it proves | Directory | Status |
|---|--------|-----------------|-----------|--------|
| 06 | The Unit-of-Work Loop | A depth-first tree traversal can be written as an explicit `while` loop over a pointer, instead of recursive function calls — the precondition for ever being interruptible | `module_06_work_loop/` | Done |
| 07 | Yielding to the Browser | The loop can stop mid-tree, hand control back to the browser (paint, handle input), and resume later without losing or corrupting state | `module_07_yielding/` | Done |

### Phase 4: Reconciliation Proper — the actual diff

| # | Module | What it proves | Directory | Status |
|---|--------|-----------------|-----------|--------|
| 08 | The Single-Child Fast Path | Same-type single children update their existing fiber in place — no destroy/recreate, no array machinery needed | `module_08_single_child/` | Done |
| 09 | Keyed List Diffing | A two-pass, key-indexed algorithm reconciles arrays of children by reusing and *moving* fibers, not destroying and recreating them, and that keys are mechanically necessary for this | `module_09_keyed_diff/` | Done |
| 10 | Bailouts & Memoization | A subtree can be skipped entirely — no diff, no fiber visit — when its props are reference-equal to last time | `module_10_bailouts/` | Done |

### Phase 5: Committing to Reality — where pixels actually change

| # | Module | What it proves | Directory | Status |
|---|--------|-----------------|-----------|--------|
| 11 | The Effect List | Every mutation discovered during the (bottom-up) render phase can be collected into a flat list without a second tree walk | `module_11_effect_list/` | Done |
| 12 | The Commit: Real DOM Calls | The collected effect list, replayed in order, produces the exact `appendChild`/`insertBefore`/`removeChild`/attribute-set calls needed — and a real browser paints the result | `module_12_commit/` | Done |

### Phase 6: State — closing the loop back to "it's an app"

| # | Module | What it proves | Directory | Status |
|---|--------|-----------------|-----------|--------|
| 13 | Hooks as a Linked List on the Fiber | `useState`-like state can live on the fiber (not the function), and that call-order-must-never-change is a *mechanical* consequence of that storage, not a style rule | `module_13_hooks/` | Done |
| 14 | Capstone — The Full Loop, End to End | Every prior module composes into one engine that runs a real, clickable, stateful counter app in a real browser tab | `module_14_capstone/` | Done |

---

## Track 2 — Reading the Real Engine (uses actual `react` / `react-dom`)

| # | Module | What it proves | Directory | Depends on (Track 1) | Status |
|---|--------|-----------------|-----------|------------------------|--------|
| A1 | The Real `jsx-runtime` Output | The actual Babel/`react/jsx-runtime` output matches your hand-desugared calls, checked byte-for-byte against a real build | `module_a1_real_jsx/` | M02 | Planned |
| A2 | The Real Fiber, Under a Debugger | A live React app's Fiber nodes have the same shape (`child`/`sibling`/`return`/`alternate`) you built, inspected via a debugger breakpoint inside `react-dom` and via React DevTools' raw tree | `module_a2_real_fiber/` | M03–M05 | Planned |
| A3 | The Real Scheduler & Lanes | React's actual Scheduler (`MessageChannel`-based yielding, lane-based priority) is the same yield/resume idea you hand-rolled, generalized to priorities you didn't implement | `module_a3_real_scheduler/` | M06–M07 | Planned |
| A4 | The Real Array-Diff Source | The actual `reconcileChildrenArray` in `react-reconciler` runs the same two-pass / `lastPlacedIndex` algorithm you implemented — read directly from React's published source | `module_a4_real_array_diff/` | M09–M10 | Planned |
| A5 | The Real Host Config | `react-dom`'s host config calls the exact DOM methods your engine did — proved by monkey-patching `appendChild`/`insertBefore` in a real React app and watching your instrumentation fire in the right order | `module_a5_real_commit/` | M11–M12 | Planned |
| A6 | Real Hooks & the Concurrent Frontier | `useState`'s real mount/update dispatcher-swap matches your hook list exactly — and what Concurrent Mode/Suspense add that your engine structurally cannot do (interruption mid-tree, re-entrant renders) | `module_a6_real_hooks_concurrent/` | M13–M14 | Planned |

34 modules total... no — **14 + 6 = 20 modules.** (Stating the count explicitly per your approval gate.)

---

## Recommended Stopping Points

| Your goal | Stop after |
|---|---|
| "I just want the virtual DOM concept to click" | M02 |
| "I want to understand *why* keys matter, mechanically" | M09 |
| "I want to have built something that actually paints to a real DOM" | M12 |
| "I want the full from-scratch engine, including state" | M14 (end of Track 1) |
| "I want to know my mental model matches real React, not just a toy" | A2 + A4 + A5 |
| "I want everything, including where real React outgrows this course" | A6 (full course) |

---

## Tools / Architecture Target

- **Runtime:** plain browser JS (ES modules), zero build step for Track 1 —
  every module's engine code runs by opening an HTML file. No bundler
  required to *use* the course.
- **Track 1 exception:** M02 needs Babel's standalone compiler (loaded via
  script tag, not npm) purely to produce real JSX-compiled output to diff
  against — it is not a build step for the engine itself.
- **Track 2:** a real `react` + `react-dom` via the existing
  `research_reconciliation/react-lab` Vite app (already in this repo) — no
  new app scaffolding needed, we add debug entry points to it.
- **Platform:** Windows + any modern browser; no Node required except to run
  the existing Vite dev server for Track 2.
- **Out of scope:** Suspense internals, transitions/`useTransition`
  internals, server components, the compiler (React Compiler/"Forget"),
  react-native's host config. These are named and pointed at in A6's
  "frontier" section but not built.
- **Style system for every `tutorial.html`:** the exact design system from
  `foster-parenting-course.html` — paper/notebook-grid background,
  Space Grotesk (display) / Newsreader (body) / IBM Plex Mono (code) via
  Google Fonts, one accent per module, `.analogy` ("THE PICTURE") /
  `.spec` ("THE MECHANISM") blocks, `.callout.watch/.brain/.crazy`,
  `.rail`/`.stk`/`.tree` diagrams, `.stamp` tactic badges, `<details>`
  self-checks, and a sourced `.colophon` citing the actual React source
  files / commits / RFCs each module's claims came from.

---

## Approval needed

Confirm before I write any code:
1. The 20-module count and split (14 engine + 6 applied) — trim, or full send?
2. Track 2 reusing `research_reconciliation/react-lab` rather than a fresh app — OK?
3. Anything in "out of scope" you actually want pulled in (e.g. Suspense)?
