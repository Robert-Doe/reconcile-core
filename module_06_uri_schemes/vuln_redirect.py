"""
vuln_redirect.py — Module 06's endpoints (URI-scheme injection & open redirect).

Blueprint `bp`:

    /go?url=...          reflects `url` into an <a href> AND a meta-refresh,
                         with no scheme check -> javascript:/data: execute
    /go-safe?url=...     same, but with an allowlist applied AFTER decoding

Teaching point: a "redirect" or "return URL" parameter is a navigational sink.
If the app trusts the scheme, `javascript:` turns navigation into execution and
`data:text/html` turns it into an attacker-authored document. The fix is a
scheme allowlist applied to the *decoded* value.

DELIBERATELY VULNERABLE. Localhost study only.
"""
from urllib.parse import unquote
from flask import Blueprint, request, Response
from markupsafe import escape

bp = Blueprint("m06_redirect", __name__)

SAFE_SCHEMES = ("http:", "https:", "/", "#", "?")  # relative URLs are fine


def _page(url_for_href: str, note: str) -> str:
    # NOTE: we intentionally place the value into an href attribute. We DO encode
    # the quote/angle chars (so this is not an attribute-breakout bug) — the ONLY
    # variable here is whether the *scheme* is checked. That isolates mechanism 3
    # (URI schemes) from mechanism 5 (context escape).
    safe_attr = escape(url_for_href)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Redirect</title><link rel="stylesheet" href="/m/assets/lab.css"></head>
<body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_06_uri_schemes/">◂ Module 06 tutorial</a></nav>
<h1>Leaving the site…</h1>
<p>{note}</p>
<p>You are being redirected to:
   <a id="dest" href="{safe_attr}">{safe_attr}</a></p>
<p class="lead">Click the link (it carries your <code>url</code> value as its
href). If the scheme is <code>javascript:</code>, clicking executes it.</p>
</body></html>"""


@bp.route("/go")
def go():
    # THE BUG: no scheme validation. The raw (decoded) value becomes the href.
    url = unquote(request.args.get("url", ""))
    note = ("<span class='badge attack'>vulnerable</span> "
            "This endpoint does not check the URL scheme.")
    return Response(_page(url, note), mimetype="text/html")


@bp.route("/go-safe")
def go_safe():
    # THE FIX: decode first, then allowlist the scheme. `javascript:` and `data:`
    # are rejected and replaced with a safe default.
    raw = unquote(request.args.get("url", ""))
    stripped = raw.strip().lower()
    ok = any(stripped.startswith(s) for s in SAFE_SCHEMES) or stripped == ""
    url = raw if ok else "/"
    note = ("<span class='badge defense'>hardened</span> "
            f"Scheme allowlist applied. Original allowed: <b>{escape(str(ok))}</b>.")
    return Response(_page(url, note), mimetype="text/html")
