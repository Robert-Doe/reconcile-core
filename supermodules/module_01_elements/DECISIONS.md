# Module 01 — Decisions

Source: [`createElement.js`](createElement.js). Verified against real
`react@18.3.1` in `research_reconciliation/react-lab/node_modules/react` by
[`verify.mjs`](verify.mjs) — 6/6 checks pass, comparing our output field-for-field
against `React.createElement` on identical inputs. Run it yourself:
`node verify.mjs` from this folder.

Every non-obvious line is categorized as:
- **(a) Forced by the platform/spec** — not a choice; JS or the DOM leaves no alternative.
- **(b) Forced by an external contract** — an API surface this course chose to match (real React's actual behavior), which downstream modules and Track 2 rely on staying compatible.
- **(c) Our own convention** — chosen for clarity/safety here; a different consistent choice would also have worked.

## Line-by-line

**`REACT_ELEMENT_TYPE = Symbol.for('react.element')`**
— **(b)**. Verified in `react.development.js:32`: real React uses the exact same value. `Symbol.for` (not `Symbol()`) uses the *global* symbol registry — meaning if two separately-bundled copies of a "react-like" library exist in the same JS realm, `Symbol.for('react.element')` still resolves to the identical symbol in both, so an element created by one is still recognized by the other. `Symbol()` would not have this property. We match this exactly rather than substitute a string tag, because a string tag *can* come from `JSON.parse` — defeating the entire reason the tag exists.

**`RESERVED_PROPS = { key: true, ref: true }`**
— **(c)**, simplified from a **(b)**. Real React also reserves `__self`/`__source`, injected by the JSX compiler purely for dev-mode warning messages ("this component was defined here"). We omit them: they carry zero reconciliation behavior. Reconciliation-relevant reserved props are exactly `key` and `ref`, and that subset is what we implement.

**`key = '' + config.key`** (coercion to string)
— **(b)**. Verified in source (`checkKeyStringCoercion` guards this in dev). Keys are compared for equality during array diffing (Module 09); if one render passed `key={1}` (number) and another passed `key={"1"}` (string) without coercion, `1 === "1"` is `false` and the diff would wrongly treat them as different logical items. Coercing at creation time means the diff algorithm downstream never has to think about key *type*, only key *value*.

**Children collapse: 1 child → bare value, 2+ children → array, 0 children → `undefined`**
— **(b)**, verified by `verify.mjs` case "ul, three li children" and "span, ... one text child" matching real React exactly. This is *not* the simpler, more uniform choice (always an array, or always whatever was passed) — it is what real React does, and Module 02 needs `props.children` to genuinely be either shape, because that's what real JSX output produces.

**`defaultProps` backfill only for `props[propName] === undefined`** (not merely absent)
— **(b)**. Verified by the "Widget with defaultProps" case. This means `<Widget size={undefined} />` *does* get the default, but `<Widget size={null} />` does not — `null` is a deliberate value, `undefined` reads as "nothing was provided." This is a real, sometimes-surprising React behavior, not an invention of this course.

**Returning a plain object literal, not a class instance**
— **(c)**. Real React does the same (see `ReactElement` factory in source) for a **(b)**-flavored reason we keep as convention here: plain objects are trivially structurally comparable, serializable-looking (but never actually valid JSON, because of the Symbol — see above), and impose no prototype chain that a `_owner`/instrumentation layer would need to reason about. We drop `_owner` and `_store` entirely (real React's dev-only bookkeeping for "which component created this" and validation-flag caching) — no module in this course needs them.

## What We Proved

Running `node verify.mjs` demonstrates, with real executed output rather than
description:

1. An "element" is inert data — a plain object with `$$typeof`, `type`,
   `key`, `ref`, `props` — indistinguishable in shape from what real React
   18.3.1 produces for the same JSX-equivalent calls.
2. Nesting elements as children is just nesting plain objects inside
   `props.children` — confirmed by `outer.props.children[1] === inner`
   being `true`: the *same* object reference, not a copy.
3. `isElement` correctly separates real elements (tagged with the Symbol)
   from look-alikes (a plain string), which is exactly the security property
   the Symbol tag exists to provide.

This module proves the "virtual DOM," at its very first layer, is nothing
more than nested plain-object literals with one unforgeable tag — not a
DOM-adjacent structure, not a class hierarchy, not anything the browser
knows about yet.
