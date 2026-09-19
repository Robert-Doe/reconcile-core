# Reconcile Core — Virtual DOM Diff Visualizer (web demo)

A small, real, interactive web app built on top of this repo's from-scratch
React-style fiber reconciler (`supermodules/module_01` through `module_14`).

Nothing here reimplements diffing. `src/engine/` is a verbatim copy of the
real course modules (`createElement`, the fiber node shape, double
buffering, the single-child and keyed-array reconcilers, bailouts, the
effect-list bitmask, commit, hooks, and the module 14 capstone `mountApp`).
The demo page mounts a real function component with `useState`, mutates its
list from native buttons, and reads the **real** `Fiber.flags`/`.alternate`
the algorithm produced to report reused/moved/inserted/deleted — then
applies the same real `commitPlacement`/`commitDeletions` calls to a live
DOM preview pane.

## Local development

```bash
cd webapp
npm install
npm run dev
```

Opens a local dev server (Vite) with hot reload.

## Production build

```bash
npm run build
```

Type-checks (`tsc --noEmit`) then builds to `webapp/dist/`. Must succeed
with zero errors before deploying.

```bash
npm run preview
```

Serves the built `dist/` output locally, for a final check before deploying.

## Deploying (static hosting)

This is a fully static site — no backend, no environment variables.

**Vercel / Netlify / Cloudflare Pages**, using this repo as the source:

- Root directory: `webapp`
- Build command: `npm run build`
- Output directory: `dist`

That's the entire configuration.
