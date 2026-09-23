# reconcile-core

I set out to attack the DOM, and then build the thing that reconciles it, because I kept noticing that virtual-DOM diffing, HTML parsing, and mutation XSS all live at the exact same seam and nobody was treating them that way.

## What this actually is

This repository holds three layers of the same investigation. How does a browser, and a framework sitting on top of it, decide what the real DOM should look like, and where does that decision process leave an opening for script execution the framework never intended?

The first layer is a 19-module attack and defense curriculum, `module_01_setup` through `module_19_payload_bank` at the top level, that walks all five XSS execution mechanisms, tag parsing, event-attribute handlers, URI schemes, DOM sinks, and context-escape/reparse (mXSS), attack-first, against a lab server you run locally. Flask or a dependency-free Node port, your call, same endpoints either way.

The second layer, `research_reconciliation/`, is a research-grade companion organized as six tracks (A through F) that sits underneath the curriculum: the DOM's node-type inheritance graph, the HTML5 tokenizer and tree-construction state machine, the browser's speculative and preload pipeline, React's Fiber reconciler and host config, React's actual escaping boundaries, and a from-scratch in-browser fallback defense I evaluated with a differential parse, serialize, re-parse harness.

The third layer, `supermodules/`, is a from-zero build of a React-shaped reconciler: elements, fiber tree, double buffering, an interruptible work loop, keyed diffing, bailouts, an effect list, a commit phase, and hooks, with a second track (currently planned) that checks every claim against the real `react`/`react-dom` source.

Here's the throughline. Reconciliation and parsing are not separate concerns from security. A diffing algorithm that reuses a DOM node instead of replacing it, or a browser that re-parses HTML a framework thought it had already sanitized, is exactly the seam where "React escapes by default" and "XSS still happens" stop looking like a contradiction and start looking like the same fact viewed from two sides.

## Module and track map

| Area | Location | Focus |
|---|---|---|
| XSS curriculum, M01-M03 | `module_01_setup` to `module_03_taxonomy` | Lab setup, HTML parsing basics, the five-mechanism taxonomy |
| XSS curriculum, M04-M08 | `module_04_script_injection` to `module_08_attribute` | One execution mechanism per module, attack-first |
| XSS curriculum, M09-M11 | `module_09_dom` to `module_11_blind` | DOM-based, stored/second-order, and blind/OOB XSS |
| XSS curriculum, M12-M14 | `module_12_evasion` to `module_14_proto` | Filter evasion, mutation XSS, prototype pollution |
| XSS curriculum, M15-M16 | `module_15_chaining`, `module_16_cases` | Chaining to account takeover; real-world incidents |
| XSS curriculum, M17-M19 | `module_17_defenses` to `module_19_payload_bank` | Defense toolbox, threat modeling, a payload bank of 100-plus |
| Research Track A | `research_reconciliation/content_categories`, `content_models` | DOM inheritance graph, node/content-model taxonomy |
| Research Track B | `research_reconciliation/track_b_parsing` | Tokenizer plus tree-construction, round-trip parser lab |
| Research Track C | `research_reconciliation/track_c_speculative` | Speculative/preload pipeline |
| Research Track D | `research_reconciliation/track_d_fiber` | Mini-reconciler visualizer |
| Research Track E/F | `research_reconciliation/react-lab`, `harness/` | Vulnerable React components, Trusted Types fallback, differential mXSS harness |
| Reconciler build, Phase 1-2 | `supermodules/module_01_elements` to `module_05_double_buffer` | Element shape, JSX desugaring, fiber tree, mount, double buffering |
| Reconciler build, Phase 3-4 | `supermodules/module_06_work_loop` to `module_10_bailouts` | Interruptible work loop, single-child fast path, keyed diff, bailouts |
| Reconciler build, Phase 5-6 | `supermodules/module_11_effect_list` to `module_14_capstone` | Effect list, real commit phase, hooks, end-to-end capstone |

Every `module_NN_*` and lesson folder stands on its own: `tutorial.html`/`HEADFIRST.md` for the narrative, `DECISIONS.md` for design rationale scoped to that unit, and whatever demo HTML, JS, or Python the module actually needs.

## Tech stack

The lab server is Python 3.12 with Flask (`lab_server.py`, blueprint-per-module auto-discovery) or a dependency-free Node.js port (`server.js`). Pick either, both serve identical endpoints on `localhost:5000`. The reconciler build in `supermodules/` runs on plain browser ES modules with zero build step, Babel standalone loaded through a script tag only for the JSX desugaring module. The React lab in `research_reconciliation/react-lab` runs Vite 5, React 18.3.1, and `@vitejs/plugin-react`. Everything else is static HTML, CSS, and JS, run by opening the file or through the lab server.

## Where this stands

The 19-module XSS curriculum and the 14-module reconciler build in `supermodules/` are complete end to end. The research tracks (A through F) have runnable artifacts for each track. Track E/F's applied "read the real engine" modules are the active, ongoing work. Check each area's own `DECISIONS.md`/`ROADMAP.md` for exact status and open questions, and notably the standing research question in `supermodules/ROADMAP.md`: whether an in-browser shim can cover all five XSS mechanisms without an allowlist that drifts as the DOM API keeps growing.

## How to explore or run it

```bash
# XSS lab (either runtime, same endpoints):
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
python lab_server.py            # Flask, Windows
# or:
node server.js                  # Node, zero dependencies

# then open http://localhost:5000
```

```bash
# React lab (Tracks E & F):
cd research_reconciliation/react-lab
npm install
npm run dev                     # Vite, usually http://localhost:5173
```

The `supermodules/` reconciler and most `research_reconciliation/` tracks need no server at all, just open the relevant `tutorial.html`/`index.html` directly in a browser. `make run`, `run.bat`, and `run-node.bat` are there as convenience wrappers for the lab server.

## A note on scope

The folder name and my original brief centered on DOM reconciliation, but the material that accreted around it, an attack-first XSS curriculum, a spec-level parsing deep dive, and a from-scratch React reconciler, is one research arc, not three unrelated projects. You genuinely cannot reason about where a diffing algorithm's reuse decisions create an XSS opening without first building the diffing algorithm and the parser underneath it yourself. This README describes the repository as it actually stands today, not as it was originally scoped.
