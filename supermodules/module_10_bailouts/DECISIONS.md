# Module 10 — Decisions

Source: [`bailout.js`](bailout.js). Verified by [`verify.mjs`](verify.mjs)
across 16 checks in four groups: `shallowEqual`'s exact semantics
(including `Object.is` edge cases), `shouldBailout`'s reference-equality
requirement, `memo`'s real reference-substitution trick, and — the
strongest proof — that a bailout never even clones the child subtree, let
alone visits it. Run it yourself: `node verify.mjs`.

## Line-by-line

**The bailout condition: `current !== null && current.memoizedProps === pendingProps && !hasScheduledUpdate`**
— **(b)**, verified against real React's actual top-of-`beginWork` check (`react-dom.development.js:21563-21583`): `if (oldProps !== newProps || hasContextChanged() || ...) { didReceiveUpdate = true; } else { ...if (!hasScheduledUpdateOrContext) { return attemptEarlyBailoutIfNoScheduledUpdate(...); } }`. We match the structure exactly, simplified to drop legacy context and hot-reload-type-change checks (out of scope; this course has neither).

**Reference equality, not shallow equality, is the actual bailout check**
— **(b)**, and the single most commonly misunderstood fact this module exists to correct. Real React's own check is `oldProps !== newProps` — `!==`, meaning *reference* inequality forces work. `verify.mjs`'s "new object with identical VALUES → does NOT bail" check proves this directly: an object with exactly the same keys and values as last time, but a *different* object, does not bail out on its own. Shallow equality is a *separate* mechanism (`memo`) layered on top, not the default behavior.

**`shallowEqual` uses `Object.is`, not `===`, per key**
— **(b)**, verified byte-for-byte against real React's actual function (`react-dom.development.js:8131-8157`). The practical difference `verify.mjs` demonstrates: `Object.is(NaN, NaN)` is `true` (unlike `NaN === NaN`, which is famously `false`), and `Object.is(0, -0)` is `false` (unlike `0 === -0`, which is `true`). Real React's shallow comparison inherits both of these differences from `===`'s well-known quirks — verified, not assumed.

**`memo`'s real mechanism: substitute the OLD props reference when shallowly equal, then let the SAME reference-equality bailout run**
— **(b)**, verified against real React's actual comment at the exact substitution line (`react-dom.development.js:19412-19428`, quoted in full in this module's source): *"The props are shallowly equal. Reuse the previous props object, like we would during a normal fiber bailout."* `memo` is not a second, independent bailout path — it is a way of making the *first* one's reference check succeed more often. `verify.mjs`'s "resolveMemoProps returns the OLD reference" check proves the substitution directly, and "with memo's substitution: NOW it bails" proves it actually changes the outcome of the same `shouldBailout` function, unmodified.

**A bailout reuses `current.child` by reference, not by cloning it**
— **(b)**, matching real React's `bailoutOnAlreadyFinishedWork`'s essential behavior (the child fiber(s) are carried forward, not re-created via `createWorkInProgress`). `verify.mjs`'s strongest check, `workInProgress.child === current.child`, confirms this is the *exact same object* — not a fresh clone with identical contents. This is the concrete difference between "the props update was skipped" and "literally nothing downstream was touched, allocated, or visited."

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Bailout requires reference equality, not shallow equality | (b) forced | Matches real React's actual top-of-`beginWork` check |
| `shallowEqual` uses `Object.is` per key | (b) forced | Matches real React's real function, including NaN/±0 edge cases |
| `memo` substitutes the old props reference, doesn't bailout independently | (b) forced | Matches real React's own source comment, quoted directly |
| Bailout reuses `child` by reference, no clone | (b) forced | The actual "zero work" proof — matches real bailout behavior |
| `hasScheduledUpdate` modeled as a plain boolean, not a lane bitmask | (c) convention | Real React's version tracks per-lane scheduled work; this course has no priority system yet (that's Track 2's A3) |

## What We Proved

Sixteen checks, four groups, all passing on the first fully-corrected run.
The two that matter most: first, that passing a *new* object with
*identical* values does **not** trigger a bailout on its own — proving
that "the data looks the same" and "React will skip this" are genuinely
different claims, and conflating them is the single most common
misunderstanding about how memoization works in React. Second, that when
a bailout *does* fire, the evidence isn't merely "the render function
wasn't called" — it's that `workInProgress.child` is `===` to
`current.child`, the literal same object, meaning no new fiber was
allocated for the subtree at all. That's the difference between "we
decided not to update it" and "we never touched it," and only the second
one is actually free.
