# Module 02 — Decisions

Source: [`jsx.js`](jsx.js). Verified by [`verify.mjs`](verify.mjs), which does
something stronger than describe a compiler: it actually invokes **esbuild**
— the real compiler `research_reconciliation/react-lab`'s Vite dev server
uses for JSX (`@vitejs/plugin-react` delegates the JSX transform itself to
esbuild; Babel there is only for Fast Refresh) — on real JSX source, with
the exact `jsx: 'automatic'` setting this repo's `vite.config.js` implies by
default, then runs the resulting compiled code twice: once against real
`react/jsx-runtime`, once against our hand-written `jsx.js`, and diffs the
element trees field-by-field (recursively, through nested children).
Run it yourself: `node verify.mjs` from this folder.

## Line-by-line

**Two exports, `jsx` and `jsxs`, both delegating to one `jsxImpl`**
— **(b)**. Verified directly from `react-jsx-runtime.development.js:1327-1328`: `var jsx = jsxWithValidationDynamic; var jsxs = jsxWithValidationStatic;`, and the source's own comment above it: *"we may want to special case jsxs internally... for now we can ship identical prod functions."* Real React ships two names that currently do the same work. We match that exactly rather than "simplify" to one function, because the split is real, load-bearing information for Module 09 later — `jsxs` is the compiler's promise that "this children array is a fixed, statically-known list," which is precisely the shape a keyed-array diff wants to know it's looking at.

**Key comes from a 3rd positional argument (`maybeKey`), checked before `config.key`**
— **(b)**. Verified in `jsxDEV` (source lines 900-914): the positional key is checked first, then an explicit `config.key` is allowed to override it. This is a different calling convention from Module 01's `createElement`, where key only ever came from inside `config`. The reason, per the real source's own comment, is spread-key deprecation-in-progress (`<div {...props} key="Hi" />`) — out of scope for this course; we implement the same two-source precedence without implementing the spread-key warning machinery around it.

**No arity-based children collapsing inside `jsxImpl`**
— **(b)**, and the single most important divergence from Module 01. `verify.mjs`'s "Dispatch proof" section shows real, compiled evidence: a JSX element with exactly one child compiles to a call to `jsx(...)`; one with three compiles to a call to `jsxs(...)` — the *compiler* (esbuild) already decided the shape of `props.children` and which function name to emit, before either function ever runs. `jsxImpl` itself does no counting at all; it trusts `config.children` to already be correct. This is why Module 01's `createElement` and this module's `jsx`/`jsxs` cannot be unified into one function without either losing the compiler's static-children signal or reintroducing runtime counting the modern transform was specifically designed to avoid.

**`_owner` / `_store` omitted**
— **(c)**, same convention as Module 01, verified not to affect behavior by `verify.mjs`'s own necessarily-recursive field stripping (see the fix logged during this module's build: the first verification attempt failed only because it stripped these fields at the top level but not inside nested child elements — once stripped recursively, at every depth, real and ours matched exactly).

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `jsx`/`jsxs` both call one `jsxImpl` | (b) forced | Matches real source exactly — see above |
| Key: positional arg first, `config.key` overrides | (b) forced | Matches real `jsxDEV` precedence |
| No children-counting logic in the runtime functions | (b) forced | The compiler already decided; verified by compiled-output inspection |
| Omit `_owner`, `_store`, spread-key deprecation warnings | (c) convention | Zero effect on reconciliation; verified via recursive field comparison |

## What We Proved

Not "JSX desugars to function calls" as an assertion — an actual compiled
artifact, produced by the actual compiler this repo's dev server runs,
printed in full in `verify.mjs`'s output. And not "our implementation is
plausible" — a byte-level match, after normalizing only the fields real
React itself documents as dev-only bookkeeping, between what real
`react/jsx-runtime` returns and what our from-scratch `jsx.js` returns, for
the exact same compiled call sites. The remaining, load-bearing fact this
module establishes: **the choice between `jsx` and `jsxs` is made once, at
compile time, by counting children in the source text — never at runtime,
never by either function itself.**
