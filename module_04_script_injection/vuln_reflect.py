"""
vuln_reflect.py — Module 04's vulnerable endpoints (reflected XSS).

Exposes a Flask Blueprint `bp` that lab_server.py auto-registers.

    /search?q=...        reflects `q` into HTML with NO encoding (mechanism 1)
    /search-safe?q=...   the same, but contextually encoded (the fix)

This is the baseline: the server takes a URL parameter and echoes it straight
into the HTML response. Whatever you put in `q` becomes part of the document the
browser parses.

DELIBERATELY VULNERABLE. Localhost study only.
"""
from flask import Blueprint, request, Response
from markupsafe import escape  # Flask ships this; it's the "correct encoding" side

bp = Blueprint("m04_reflect", __name__)


PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Lab Search</title>
<link rel="stylesheet" href="/m/assets/lab.css"></head>
<body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_04_script_injection/">◂ Module 04 tutorial</a></nav>
<h1>Search</h1>
<form action="/search" method="get">
  <input name="q" value="" style="width:60%%;padding:8px" placeholder="search...">
  <button>Search</button>
</form>
<!-- THE VULNERABILITY: `q` is interpolated with no encoding. -->
<p>You searched for: %s</p>
<p class="lead">Results: 0 items found.</p>
<hr>
<p class="lead">Try <code>/search-safe?q=...</code> to see the encoded (fixed)
version reflect the same input inertly.</p>
</body></html>"""


@bp.route("/search")
def search():
    # Mechanism 1/2/5 playground: the raw value is placed into HTML text context.
    q = request.args.get("q", "")
    html = PAGE % q  # <-- no escaping: this is the bug
    return Response(html, mimetype="text/html")


@bp.route("/search-safe")
def search_safe():
    # The fix for HTML *text* context: encode < > & " ' so the bytes can never
    # leave text context and become tags/attributes. `escape` is context-correct
    # HERE because the sink is HTML text. (A different context — attribute, JS,
    # URL — would need a different encoder; see Module 17.)
    q = request.args.get("q", "")
    html = PAGE % escape(q)
    return Response(html, mimetype="text/html")
