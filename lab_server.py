#!/usr/bin/env python3
"""
lab_server.py — Master server for the XSS Attack & Defense Lab.

This single process ties together every module's vulnerable endpoints and
static tutorial pages. It is DELIBERATELY INSECURE. It exists only to run on
localhost for study. Never expose it to a network you do not fully control.

Architecture
------------
Each module that needs server-side behavior ships a Flask *Blueprint* in a
file named `vuln_*.py` inside its module folder (e.g.
`module_04_script_injection/vuln_reflect.py`). This file discovers those
blueprints and registers them. Missing modules are skipped gracefully, so the
course can be built up incrementally and the lab still boots.

Static tutorial pages (index.html, attack_*.html, ...) are served directly
from each module folder under the /m/<folder>/<file> path, and each module
folder is also exposed as a browsable index.

Run
---
    python lab_server.py
    # then open http://localhost:5000

Safety
------
Every payload in this lab uses a harmless proof-of-execution such as
`alert(1)` or a callback to your own local server. Nothing here attacks a
third party. The point is to *understand* execution so you can *prevent* it.
"""
from __future__ import annotations

import importlib.util
import mimetypes
import os
import sys
from pathlib import Path

from flask import Flask, Response, redirect, send_from_directory

# Serve Markdown (HEADFIRST.md / DECISIONS.md) as viewable text, not a download.
mimetypes.add_type("text/markdown", ".md")

ROOT = Path(__file__).resolve().parent
HOST = os.environ.get("LAB_HOST", "127.0.0.1")
PORT = int(os.environ.get("LAB_PORT", "5000"))

app = Flask(__name__, static_folder=None)

# ---------------------------------------------------------------------------
# Intentionally-weak global config.
#
# A real app would set these headers to harden the browser. We leave them OFF
# by default so the baseline lab is exploitable, and turn them ON per-response
# only in the Module 17 "defense" endpoints so you can A/B the effect.
# ---------------------------------------------------------------------------
LAB_HARDENING = os.environ.get("LAB_HARDENING", "0") == "1"


@app.after_request
def _maybe_harden(resp: Response) -> Response:
    resp.headers["X-Lab"] = "xss-teaching-lab; do-not-deploy"
    if LAB_HARDENING:
        # Flip this on with LAB_HARDENING=1 to feel how much the baseline
        # attacks stop working. Module 17 explains each directive.
        resp.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; object-src 'none'; "
            "base-uri 'none'",
        )
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    return resp


# ---------------------------------------------------------------------------
# Module registry. (folder, blueprint_module, blueprint_attr, human title)
# The blueprint entry may be None for modules that are pure static HTML.
# ---------------------------------------------------------------------------
MODULES = [
    ("module_01_setup", None, None, "01 — Environment Setup & Attacker Mindset"),
    ("module_02_parsing", None, None, "02 — How Browsers Parse HTML"),
    ("module_03_taxonomy", None, None, "03 — The 5 Execution Mechanisms"),
    ("module_04_script_injection", "vuln_reflect", "bp", "04 — Script Tag Injection"),
    ("module_05_event_handlers", None, None, "05 — Event Handler Injection"),
    ("module_06_uri_schemes", "vuln_redirect", "bp", "06 — URI Scheme Injection"),
    ("module_07_namespace", "vuln_upload", "bp", "07 — Tag & Namespace Confusion"),
    ("module_08_attribute", "vuln_profile", "bp", "08 — Attribute Injection"),
    ("module_09_dom", None, None, "09 — DOM-Based XSS & Client Sinks"),
    ("module_10_stored", "vuln_store", "bp", "10 — Stored & Second-Order XSS"),
    ("module_11_blind", "callback_server", "bp", "11 — Blind XSS & Out-of-Band"),
    ("module_12_evasion", "waf_sim", "bp", "12 — Filter Evasion & Obfuscation"),
    ("module_13_mxss", None, None, "13 — Mutation XSS (mXSS)"),
    ("module_14_proto", None, None, "14 — Prototype Pollution to DOM XSS"),
    ("module_15_chaining", "vuln_auth", "bp", "15 — Attack Chaining to ATO"),
    ("module_16_cases", None, None, "16 — Real-World Incidents"),
    ("module_17_defenses", "defense_encoding", "bp", "17 — Defenses"),
    ("module_18_threatmodel", None, None, "18 — Threat Model & Intervention"),
    ("module_19_payload_bank", None, None, "19 — The XSS Payload Bank (100+)"),
]


def _load_blueprint(folder: str, module_name: str, attr: str):
    """Import module_xx/<module_name>.py and return its `attr` (a Blueprint)."""
    path = ROOT / folder / f"{module_name}.py"
    if not path.exists():
        return None
    spec = importlib.util.spec_from_file_location(f"{folder}.{module_name}", path)
    if spec is None or spec.loader is None:
        return None
    mod = importlib.util.module_from_spec(spec)
    # Let vuln modules import sibling helpers if they want to.
    sys.modules[spec.name] = mod
    try:
        spec.loader.exec_module(mod)
    except Exception as exc:  # noqa: BLE001 — teaching lab, never hard-crash boot
        print(f"[lab] WARNING: could not load {path.name}: {exc}", file=sys.stderr)
        return None
    return getattr(mod, attr, None)


def register_all() -> list[tuple[str, str, bool]]:
    """Register every available blueprint. Returns (title, folder, live?)."""
    status = []
    for folder, mod_name, attr, title in MODULES:
        live = False
        if mod_name and attr:
            bp = _load_blueprint(folder, mod_name, attr)
            if bp is not None:
                try:
                    app.register_blueprint(bp)
                    live = True
                except Exception as exc:  # noqa: BLE001
                    print(f"[lab] WARNING: blueprint {folder} failed: {exc}",
                          file=sys.stderr)
        status.append((title, folder, live))
    return status


# ---------------------------------------------------------------------------
# Static file serving for each module's tutorial pages.
# ---------------------------------------------------------------------------
@app.route("/m/<folder>/")
def module_index(folder: str):
    target = ROOT / folder / "index.html"
    if target.exists():
        return send_from_directory(ROOT / folder, "index.html")
    # Fall back to a listing so students can find attack_*.html files.
    d = ROOT / folder
    if not d.is_dir():
        return Response("No such module", status=404)
    links = "".join(
        f'<li><a href="/m/{folder}/{p.name}">{p.name}</a></li>'
        for p in sorted(d.iterdir())
        if p.is_file() and p.suffix in (".html", ".js", ".svg", ".md")
    )
    return Response(f"<h1>{folder}</h1><ul>{links}</ul>", mimetype="text/html")


@app.route("/m/<folder>/<path:filename>")
def module_file(folder: str, filename: str):
    return send_from_directory(ROOT / folder, filename)


@app.route("/assets/<path:filename>")
def shared_assets(filename: str):
    # The research tracks reference shared CSS via ../assets/, which resolves to
    # /assets/ on the server; serve it from the repo-root assets/ folder.
    return send_from_directory(ROOT / "assets", filename)


@app.route("/research/", defaults={"subpath": ""})
@app.route("/research/<path:subpath>")
def research_files(subpath: str):
    base = (ROOT / "research_reconciliation").resolve()
    target = (base / subpath).resolve()
    if not str(target).startswith(str(base)):
        return Response("Forbidden", status=403)
    if subpath == "" or target.is_dir():
        target = target / "index.html"
    if not target.exists():
        return Response("Not found", status=404)
    return send_from_directory(target.parent, target.name)


@app.route("/")
def home():
    status = getattr(app, "_module_status", [])
    rows = []
    for title, folder, live in status:
        badge = (
            '<span style="color:#0a0">● server-live</span>'
            if live
            else '<span style="color:#888">○ static</span>'
        )
        rows.append(
            f'<tr><td><a href="/m/{folder}/">{title}</a></td><td>{badge}</td></tr>'
        )
    body = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>XSS Attack &amp; Defense Lab</title>
<style>
  body {{ font: 15px/1.55 system-ui, sans-serif; max-width: 860px;
         margin: 40px auto; padding: 0 20px; color: #1a1a1a; }}
  h1 {{ font-size: 1.6rem; }}
  table {{ border-collapse: collapse; width: 100%; margin-top: 1rem; }}
  td {{ padding: 8px 10px; border-bottom: 1px solid #eee; }}
  a {{ color: #0b5; text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
  .warn {{ background: #fff3cd; border: 1px solid #ffe08a; padding: 12px 16px;
           border-radius: 8px; }}
  code {{ background: #f4f4f4; padding: 1px 5px; border-radius: 4px; }}
</style></head><body>
<h1>XSS Attack &amp; Defense Lab</h1>
<p class="warn"><strong>Localhost only.</strong> This server is intentionally
vulnerable so you can study execution and design defenses. Do not deploy it.
Every payload uses a harmless <code>alert(1)</code>-style proof.</p>
<p>Origin under test: <code>http://{HOST}:{PORT}</code></p>
<p style="background:#eef6ff;border:1px solid #cfe3fb;padding:12px 16px;border-radius:8px">
<strong>📚 Research companion:</strong>
<a href="/research/">Reconciliation, Parsing &amp; the CSR XSS Frontier</a>
— PhD-level Tracks A–F (DOM inheritance, the parser, the speculative pipeline,
React Fiber/reconciliation, React's XSS surface, and the in-browser fallback),
with a runnable React lab.</p>
<table><tbody>{''.join(rows)}</tbody></table>
</body></html>"""
    return Response(body, mimetype="text/html")


@app.route("/favicon.ico")
def _favicon():
    return Response(status=204)


if __name__ == "__main__":
    app._module_status = register_all()  # type: ignore[attr-defined]
    live_count = sum(1 for _, _, live in app._module_status if live)  # type: ignore
    print("=" * 60)
    print(" XSS Attack & Defense Lab")
    print(f" Serving on http://{HOST}:{PORT}   (Ctrl+C to stop)")
    print(f" Server-live modules: {live_count}")
    print(f" Hardening headers:   {'ON' if LAB_HARDENING else 'OFF'}"
          " (set LAB_HARDENING=1 to enable)")
    print("=" * 60)
    # debug=True gives reload + tracebacks; fine for a local lab.
    app.run(host=HOST, port=PORT, debug=True)
