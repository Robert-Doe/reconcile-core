# Research Track — Reconciliation, Parsing & the CSR XSS Frontier

> The 19-module course (`../`) is **attack-first**: it teaches every XSS
> mechanism by exploiting it. This inner directory is the **research-grade
> companion** it kept promising — a deep, PhD-level descent into *how the DOM is
> actually built and reconciled*, so you can find the seams where XSS survives
> **even when a framework's inherent escaping is doing its job**.

This is the material from the original Track A–F proposal. It goes far past
"sanitize your inputs" into the machinery: the node-type inheritance graph, the
HTML tokenizer/tree-construction state machines, the speculative/preload
pipeline, React's Fiber reconciler and host-config, React's exact escaping
boundaries (and where they leak), and finally the design + evaluation of an
in-browser fallback defense.

Everything is written as **Head First publications** (conversational, with
*Brain Power*, *Sharpen your pencil*, and *There are no Dumb Questions*),
layered over rigorous spec-level detail. And everything is **runnable**.

## The six tracks

| Track | Title | Sub-modules | Runnable artifact |
|-------|-------|-------------|-------------------|
| **A** | DOM structure & the inheritance graph | A1–A5 | `track_a_dom/` live inheritance/sink explorer |
| **B** | Parsing: bytes → tree | B1–B6 | `track_b_parsing/` tokenizer + round-trip lab |
| **C** | The background/speculative pipeline | C1–C5 | `track_c_speculative/` + lab-server endpoints |
| **D** | React internals: Fiber & Reconciliation | D1–D5 | `track_d_fiber/` mini-reconciler visualizer |
| **E** | React's XSS surface | E1–E6 | `react-lab/` runnable Vite + React app |
| **F** | Designing the in-browser fallback | F1–F6 | `react-lab/` fallback + `harness/` differential rig |

## The research question

> **Where does XSS survive a correct, well-intentioned framework?**

React escapes text and attributes by default. Yet XSS still happens. This track
enumerates *why*, exhaustively:

1. **Sinks the escaper never sees** — `dangerouslySetInnerHTML`, `href`
   `javascript:` URLs, `srcDoc`, `{...spread}` props, `ref` smuggling (Track E).
2. **The parse/serialize non-idempotence** — mXSS: a value React inserts as
   "safe" HTML mutates when the browser re-parses it (Track B6 + E6).
3. **Timing & speculation** — the preload scanner and resource hints act on
   injected markup *before* your JS runs (Track C).
4. **Reconciliation invariants** — where interruption/replay, hydration
   mismatch, and host-config attribute/property routing can reintroduce a sink
   (Track D + E4/E5).

The payoff (Track F) is a defense that holds *by construction* against these,
with an evaluation harness to prove it.

## How to run everything

### Static tracks (A, B, C, D) — no build needed

Served by the existing lab server. From the repo root:

```bash
python lab_server.py        # or:  node server.js
```

Then open <http://localhost:5000/research/> for the hub. Each track page has
live in-browser demos (real parser, real DOM APIs). You can also open any
`research_reconciliation/**/index.html` directly from disk — CSS is loaded via a
relative path (dark theme, same as the main course).

### The React lab (Tracks E & F) — a real React app

```bash
cd research_reconciliation/react-lab
npm install
npm run dev            # Vite dev server, usually http://localhost:5173
```

It renders intentionally-vulnerable React components (E1–E6) side-by-side with
the **in-browser fallback** (F2–F4: Trusted Types policy + mXSS-resistant
sanitizer + a `react-dom` host-config shim), plus a live differential-testing
panel (F6). See `react-lab/README.md`.

### The differential mXSS harness — standalone, no build

```
research_reconciliation/harness/differential_harness.html
```

Open it in a browser (directly or via the lab server). It runs the
parse → serialize → re-parse oracle over a corpus and flags every string where
the tree is not stable — the raw material for evaluating any defense.

## Ethics & scope

Same as the parent course: **localhost, harmless `alert(1)`/marker proofs,
authorized study only.** These are tools for building defenses, evaluated
against payloads you run against software you control.

---

Start at [`index.html`](index.html) (the hub) or read the tracks in order —
A and B are the foundation everything else stands on.
