"""
waf_sim.py — Module 12's endpoints (filter evasion / obfuscation).

Blueprint `bp`:

    /waf-search?q=...    reflects q into HTML, but FIRST runs a keyword denylist
                         (blocks 'script', 'onerror', 'javascript', 'alert', '<>')
    /waf-info            explains the (bypassable) filter rules

The whole point: this denylist LOOKS reasonable and is trivially defeated. The
lab challenge is to pop an alert through /waf-search using several different
evasion techniques, demonstrating that pattern-matching on payload strings is a
fundamentally losing defense.

DELIBERATELY VULNERABLE (and deliberately WEAK). Localhost study only.
"""
import re
from flask import Blueprint, request, Response

bp = Blueprint("m12_waf", __name__)

# A "reasonable-looking" denylist — case-insensitive keyword blocking. Each of
# these is bypassable; that is the lesson.
BLOCKLIST = [
    r"<\s*script",     # block <script
    r"</\s*script",    # block </script
    r"onerror",        # block the famous handler
    r"javascript:",    # block the scheme
    r"alert",          # block the classic PoC function name
]
_RX = re.compile("|".join(BLOCKLIST), re.IGNORECASE)


def _blocked(q: str) -> str | None:
    m = _RX.search(q)
    return m.group(0) if m else None


PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Filtered search</title><link rel="stylesheet" href="/m/assets/lab.css"></head>
<body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_12_evasion/">◂ Module 12 tutorial</a>
<a href="/waf-info">/waf-info</a></nav>
<h1>Search (WAF-protected)</h1>
<form action="/waf-search" method="get">
  <input name="q" style="width:60%;padding:8px" placeholder="search...">
  <button>Search</button></form>
{body}
</body></html>"""


@bp.route("/waf-search")
def waf_search():
    q = request.args.get("q", "")
    hit = _blocked(q)
    if hit:
        body = (f"<p><span class='badge defense'>blocked</span> Your query "
                f"matched the denylist token <code>{_escape(hit)}</code>. "
                f"Try again — the filter is bypassable.</p>")
        return Response(PAGE.format(body=body), mimetype="text/html")
    # NOT blocked -> reflected UNENCODED (mechanism-agnostic sink). If your
    # payload slipped past the denylist, it executes here.
    body = f"<p>Results for: {q}</p>"
    return Response(PAGE.format(body=body), mimetype="text/html")


@bp.route("/waf-info")
def waf_info():
    rules = "".join(f"<li><code>{_escape(r)}</code></li>" for r in BLOCKLIST)
    body = ("<h2>Filter rules (case-insensitive regex denylist)</h2>"
            f"<ul>{rules}</ul>"
            "<p class='lead'>Reflection is UNENCODED when not blocked. Your job: "
            "pop an alert anyway, five different ways.</p>")
    return Response(PAGE.format(body=body), mimetype="text/html")


def _escape(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))
