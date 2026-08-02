# Module 12 — Decisions

Source: [`commit.js`](commit.js). Verified by [`verify.mjs`](verify.mjs)
against a minimal hand-rolled DOM stand-in ([`fakeDom.mjs`](fakeDom.mjs) —
test scaffolding only, not part of the taught mechanism; Node has no
built-in `document` and this repo has no jsdom installed) — a mount and an
in-place update, both checked against real serialized DOM structure and
real object identity. [`demo.html`](demo.html) runs the exact same engine
against a genuine browser `document` — open it directly to see it live.

**A note on this module's own verification:** the live in-browser check
that would normally accompany a DOM-touching module could not be completed
in this build session — the Browser pane tool reported itself unavailable
("Browser pane gone, gate off, or tab cap reached") on every attempt,
including re-opening files that had rendered successfully earlier in this
same session. This is reported here plainly rather than papered over:
`demo.html` is written, real, and uses the actual browser `document` API
with no shim — it has simply not been re-confirmed live in this session.
Open it yourself to see the real result.

## Line-by-line

**Two halves: "build/update the instance" (`completeDomWork`, bottom-up) vs. "attach it to the live document" (`commitPlacement`, top-down over the pruned effect list)**
— **(b)**, matching real React's actual split exactly: `completeWork` creates and configures DOM nodes *off-screen* (a new host instance starts detached), and only `commitPlacement` (a separate phase, over Module 11's pruned effect list) attaches something to the real, visible document.

**`appendAllChildren`'s non-recursive, return-pointer-patching traversal**
— **(b)**, transcribed directly from real React's actual function (`react-dom.development.js:21771-21800`). It walks a *subtree that isn't attached to anything yet* — appending each host descendant's `stateNode` into the new parent instance, entirely in memory, before that parent instance is ever inserted into the live document. This is why nested new elements never need their own individual `commitPlacement` call: they arrive already-attached-to-their-parent, and only the outermost new fiber needs placing into the live document.

**Only the OUTERMOST new fiber in a subtree needs a `Placement` flag**
— **(b)**, a direct, verified consequence of the point above. `verify.mjs`'s Proof 1 sets `Placement` on exactly one fiber (`cardFiber`, a `FunctionComponent`) — none of its host descendants (`div`, `h1`, the text fibers) carry the flag — and `commitPlacement`'s non-host recursive branch (`insertOrAppendPlacementNode`) still finds and attaches the right single real DOM node (the `div`), because everything inside it was already assembled by `appendAllChildren` during completion.

**`getHostSibling` skips anything ALSO flagged `Placement`**
— **(b)**, verified against real React's actual function (`react-dom.development.js:23815-23861`): a fiber that's itself about to be newly placed cannot be used as a stable "insert before this" reference, because its own real DOM node might not exist yet (or might be about to move) — real React's source comment describes searching *past* such nodes explicitly.

**Updates mutate the existing `stateNode` in place; they never go through `commitPlacement`**
— **(b)**, verified by Proof 2's central assertion: `wipTextFiber.stateNode === attachedNode` — the exact same real DOM object, before and after. An update with no `Placement` flag never gets picked up by the placement loop in `commitRoot` at all (it's filtered by `fiber.flags & Placement` in the effects loop); it was already handled by `completeDomWork`'s "existing stateNode → update in place" branch during the bottom-up pass, before commit-time placement even runs.

**Attribute handling is a small, explicit allowlist (`className`, `style`, and primitive-valued attributes), no event delegation**
— **(c)**, a documented scope cut. Real `react-dom`'s synthetic event system (delegated listeners, the `SyntheticEvent` wrapper, event pooling history) is an entire subsystem this course does not build — named explicitly in ROADMAP.md's out-of-scope list. `className` is special-cased because it's a genuinely real DOM quirk (the property is `className`, not `class`, since `class` is a reserved word) that real `react-dom` also special-cases.

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Two-phase split: build off-screen, then attach | (b) forced | Matches real React's actual `completeWork`/`commitPlacement` split |
| `appendAllChildren`'s exact traversal shape | (b) forced | Transcribed directly from real source |
| Only outermost new fiber needs `Placement` | (b) forced, verified | Proven by Proof 1 using exactly one flagged fiber |
| `getHostSibling` skips other `Placement`-flagged nodes | (b) forced | Matches real React; a not-yet-real node can't be a stable reference |
| Updates never touch `commitPlacement` | (b) forced, verified | Proven by object-identity check in Proof 2 |
| No event delegation system | (c) scope cut | Named explicitly out of scope in ROADMAP.md |

## What We Proved

A real (structurally faithful, if hand-rolled) DOM, built entirely by this
course's own engine across Modules 01 through 12, serialized to exactly
`<div class="card"><h1>Hello</h1>plain text child</div>` — nested
correctly, attributes applied correctly, text content correct. And,
separately, a targeted update that changed exactly one word: the
resulting serialization changed accordingly, and — the claim that
actually matters — `wip.stateNode === attachedNode` proved the *same*
object already living in the document was mutated, not replaced. That
distinction (mutate vs. replace) is the entire reason Modules 08-11 spent
so much effort deciding what could be reused: reuse only pays off if the
commit phase actually honors it by mutating instead of recreating, and
this module is the proof that it does.
