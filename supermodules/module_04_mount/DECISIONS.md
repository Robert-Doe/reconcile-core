# Module 04 — Decisions

Source: [`mount.js`](mount.js). Verified by [`verify.mjs`](verify.mjs): a
function component rendering nested host elements, a text child, and a
conditionally-absent child (`showFooter && <footer/>`, which evaluates to
`false`) is mounted, and the resulting fiber tree's tags, nesting, and
"the falsy child produced no fiber at all" behavior are checked against
independently hand-computed expectations. Run it yourself: `node verify.mjs`.

## Line-by-line

**A `FunctionComponent` fiber's only child is the fiber for whatever the function returned**
— **(b)**. Verified structurally against real React: `updateFunctionComponent` (`react-dom.development.js:19585`) calls `renderWithHooks(...)` to obtain `nextChildren` (line 19617) *before* reconciling children — i.e., real React also calls the function first, then treats its return value as "the children to mount," rather than treating the function component itself as a container with independent children of its own. We match this exactly: `mount()`'s `FunctionComponent` branch calls `fiber.type(fiber.pendingProps)`, then mounts the result as a single child.

**`normalizeChildren` drops `null`, `undefined`, and `boolean`**
— **(b)**. This is why `{condition && <Thing/>}` — a common JSX idiom — silently renders nothing when `condition` is falsy: the expression evaluates to `false`, and `false` is one of exactly three values real React (and this course) treats as "renders to nothing." We verified this is not incidentally true of our normalizer but a specific, tested case (`verify.mjs`'s "footer correctly dropped" and "normalizeChildren edge cases" checks) — `0` and `''`, notably, are *not* in this drop-list, which is the real, sometimes-surprising reason `{count && <Badge/>}` renders a stray `0` in the DOM when `count` is `0`.

**Recursive `mount()`, not yet an explicit loop**
— **(c)**, a deliberate, temporary convention. Real React's actual mount/update traversal is an explicit loop (Module 06) specifically so it can be paused (Module 07). This module's job is narrower: prove the *shape* of the produced fiber tree is correct. Using recursion here is honest about what's not yet built — Module 06 replaces this function's recursive calls with an explicit work loop that produces an *identical* tree, and that equivalence is exactly what Module 06 verifies.

**Text and numbers become `HostText` fibers with the raw value as `pendingProps`**
— **(b)**. Real React's `createFiberFromText` (visible in `react-dom.development.js`, called during child reconciliation) does the same: a `HostText` fiber's "props" is just the text content itself, not an object — there's no analog of `className` for a text node. We mirror that rather than wrapping text in an artificial `{ children: text }` object, because Module 12's commit phase needs to tell "this fiber's entire purpose is textContent" apart from "this fiber has a props object with a children field," and a bare string value is the simplest possible signal for that.

**A separate `createFiberFromElement` helper is NOT exported — inlined as a private function**
— **(c)**. Unlike Module 03's `createFiber` (a general constructor call, useful standalone, so exported), this module's element→fiber-for-one-node step is only ever meaningful as part of the larger `mount()` traversal — nothing later in this course calls it on its own. Real React does export an equivalent (`createFiberFromElement`) because its reconciler is split across many files that all need it (child reconciliation, portals, suspense); this course keeps everything mount-related in one file, so there's no cross-file need to expose it.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| FunctionComponent fiber's child = fiber for its rendered output | (b) forced | Matches real `updateFunctionComponent`/`renderWithHooks` flow |
| Drop `null`/`undefined`/`boolean` children, keep `0`/`''` | (b) forced | Matches real React; explains a well-known real-world footgun |
| Recursive traversal for now | (c) convention, temporary | Isolates "is the tree shape right" from "can the loop pause"; Module 06 replaces it |
| Text/number children → `HostText` fiber with raw value as props | (b) forced | Matches real `createFiberFromText`; gives Module 12 a clean signal |
| `createFiberFromElement` kept private, not exported | (c) convention | No other module in this course needs it standalone |

## What We Proved

Given a function component that renders a `<div>` containing an `<h1>`, a
plain-text sibling, and a conditionally-present `<footer>` that evaluates
to `false`, `mount()` produces a fiber tree whose depth-first traversal
(via Module 03's `forEachFiber`, completely unmodified) is exactly
`FunctionComponent(Card) → HostComponent(div) → HostComponent(h1) →
HostText("Hello") → HostText("plain text child")` — five fibers, not six;
the falsy footer produced *zero* fibers, not a placeholder, not a null
fiber to be cleaned up later. The element tree from Modules 01-02 and the
fiber tree from Module 03 are now mechanically connected: one specific,
tested function turns one into the other.
