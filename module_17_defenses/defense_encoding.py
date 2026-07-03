"""
defense_encoding.py — Module 17's endpoints (defenses you can A/B).

Blueprint `bp`:

    /defense/encoders?q=...            shows the SAME input encoded correctly for
                                       five different output contexts (JSON)
    /defense/context?ctx=..&q=..       reflects q into a chosen context with the
                                       CORRECT encoder, so you can try to bypass it
    /defense/csp-search?q=..&policy=.. reflects q UNENCODED but sets a CSP header,
                                       so you can watch CSP block execution that
                                       encoding would also have stopped

This module is where the attacks from M04-M15 go to die. Point earlier payloads
at these endpoints and watch which mechanism each defense closes.

Localhost study lab.
"""
import json
from flask import Blueprint, request, Response
from markupsafe import escape

bp = Blueprint("m17_defense", __name__)


# --- Context-correct encoders ------------------------------------------------
def enc_html_text(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;"))


def enc_html_attr(s: str) -> str:
    # For quoted attributes: encode quotes + angle brackets + amp. A robust
    # encoder also handles backtick and, for unquoted attrs, whitespace.
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;").replace("'", "&#x27;").replace("`", "&#x60;"))


def enc_js_string(s: str) -> str:
    # For a value placed inside a JS string literal: JSON-encode, then escape
    # </ and unicode line separators so it can't break out of <script> or the
    # string. (Still: prefer NOT to interpolate data into inline JS at all.)
    out = json.dumps(s)
    return (out.replace("</", "<\\/")
               .replace(" ", "\\u2028").replace(" ", "\\u2029"))


def enc_url_component(s: str) -> str:
    from urllib.parse import quote
    return quote(s, safe="")


def enc_css_string(s: str) -> str:
    # CSS string: backslash-escape non-alphanumerics (conservative).
    return "".join(
        ch if ch.isalnum() else "\\%06x" % ord(ch) for ch in s
    )


CONTEXTS = {
    "html_text": enc_html_text,
    "html_attr": enc_html_attr,
    "js_string": enc_js_string,
    "url": enc_url_component,
    "css_string": enc_css_string,
}


@bp.route("/defense/encoders")
def encoders():
    q = request.args.get("q", '"><img src=x onerror=alert(1)>')
    result = {name: fn(q) for name, fn in CONTEXTS.items()}
    result["_input"] = q
    result["_note"] = ("Same bytes, different correct encoding per context. "
                       "Using the wrong one (e.g. html_text inside an attribute "
                       "or JS) is a real bug class.")
    return Response(json.dumps(result, indent=2), mimetype="application/json")


@bp.route("/defense/context")
def context_demo():
    ctx = request.args.get("ctx", "html_text")
    q = request.args.get("q", "")
    fn = CONTEXTS.get(ctx, enc_html_text)
    safe = fn(q)
    # Render the encoded value into a matching context so the student can try
    # (and fail) to break out.
    if ctx == "html_attr":
        sink = f'<input value="{safe}">'
    elif ctx == "js_string":
        sink = f'<script>var x = {safe}; document.title = x;</script>'
    elif ctx == "url":
        sink = f'<a href="/go?url={safe}">link</a>'
    else:
        sink = f"<div>{safe}</div>"
    page = (f"<!doctype html><meta charset='utf-8'>"
            f"<link rel='stylesheet' href='/m/assets/lab.css'>"
            f"<body style='padding:24px'><nav class='nav'><a href='/'>◂ Lab home</a>"
            f"<a href='/m/module_17_defenses/'>◂ Module 17</a></nav>"
            f"<h1>Context: {escape(ctx)}</h1>"
            f"<p><span class='badge defense'>encoded</span> Your input was encoded "
            f"with the <code>{escape(ctx)}</code> encoder, then placed in a matching "
            f"context:</p>{sink}"
            f"<p class='lead'>Try earlier payloads — they should render inert.</p>")
    return Response(page, mimetype="text/html")


POLICIES = {
    "none": "",
    "loose": "script-src 'self' 'unsafe-inline'",           # still allows inline!
    "strict": "script-src 'self'; object-src 'none'; base-uri 'none'",
    "nonce": "script-src 'nonce-lab123' 'strict-dynamic'; object-src 'none'; base-uri 'none'",
    "tt": "require-trusted-types-for 'script'; trusted-types default; "
          "script-src 'self'; object-src 'none'; base-uri 'none'",
}


@bp.route("/defense/csp-search")
def csp_search():
    # Reflects q UNENCODED (the vuln is intact) but applies a CSP header. This
    # isolates the CAPABILITY defense: injection succeeds at the HTML level, yet
    # execution is blocked by CSP for the stricter policies.
    q = request.args.get("q", "")
    policy = request.args.get("policy", "strict")
    csp = POLICIES.get(policy, POLICIES["strict"])
    body = (f"<!doctype html><meta charset='utf-8'>"
            f"<link rel='stylesheet' href='/m/assets/lab.css'>"
            f"<body style='padding:24px'><nav class='nav'><a href='/'>◂ Lab home</a>"
            f"<a href='/m/module_17_defenses/defense_csp.html'>◂ CSP tutorial</a></nav>"
            f"<h1>CSP demo — policy: {policy}</h1>"
            f"<p>Active policy: <code>{escape(csp) or '(none)'}</code></p>"
            f"<p>Reflected UNENCODED: {q}</p>"
            f"<p class='lead'>Open DevTools console: with <code>strict</code>/"
            f"<code>nonce</code>/<code>tt</code>, injected inline script/handlers "
            f"are refused and a CSP violation is logged, even though the HTML "
            f"injection itself succeeded.</p>")
    resp = Response(body, mimetype="text/html")
    if csp:
        resp.headers["Content-Security-Policy"] = csp
    return resp
