"""
vuln_auth.py — Module 15's endpoints (chaining XSS into account takeover).

Blueprint `bp`. A tiny account system with the ingredients an attacker chains
after landing XSS:

    GET  /auth/login             "log in" as victim; sets a session cookie
    GET  /auth/account           account page: shows a CSRF token + current pw
    POST /auth/change-password   requires the CSRF token; changes the password
    GET  /auth/status            JSON: who am I, current password, cookie flags
    GET  /auth/xss-entry?html=   an INTENTIONAL reflected-XSS entry point on the
                                 SAME ORIGIN, so a payload can drive the flow

The teaching arc: an alert() proves execution, but the *impact* is what the
script does with the origin's trust. Here the payload:
  (a) reads document.cookie (session theft — unless HttpOnly),
  (b) fetches /auth/account and scrapes the anti-CSRF token,
  (c) forges POST /auth/change-password with that token -> account takeover.

Toggle HttpOnly with ?httponly=1 on /auth/login to feel how it changes the
attack (theft blocked -> attacker pivots to on-page request forgery, which still
works because the script runs same-origin).

DELIBERATELY VULNERABLE. Localhost study only.
"""
import secrets
from flask import Blueprint, request, Response, make_response, jsonify

bp = Blueprint("m15_auth", __name__)

# sid -> {"user":..., "csrf":..., "password":...}
_SESSIONS: dict[str, dict] = {}


def _current():
    sid = request.cookies.get("sid", "")
    return sid, _SESSIONS.get(sid)


@bp.route("/auth/login")
def login():
    sid = secrets.token_hex(16)
    _SESSIONS[sid] = {
        "user": "victim",
        "csrf": secrets.token_hex(16),
        "password": "hunter2",
    }
    resp = make_response(
        "<p>Logged in as <b>victim</b>. "
        "<a href='/auth/account'>Go to account</a></p>"
        "<p class='lead'>Cookie set. Try /auth/login?httponly=1 to compare.</p>"
    )
    resp.headers["Content-Type"] = "text/html"
    # THE (default) BUG: session cookie is NOT HttpOnly, so document.cookie leaks
    # it. httponly=1 flips this to show the mitigation.
    http_only = request.args.get("httponly") == "1"
    resp.set_cookie("sid", sid, httponly=http_only, samesite="Lax")
    return resp


ACCOUNT = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Account</title><link rel="stylesheet" href="/m/assets/lab.css">
<meta name="csrf-token" content="{csrf}"></head>
<body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_15_chaining/">◂ Module 15 tutorial</a>
<a href="/auth/status">/auth/status</a></nav>
<h1>Account settings — {user}</h1>
<p>Current password (shown for the lab): <code>{password}</code></p>
<form method="post" action="/auth/change-password">
  <input type="hidden" name="csrf" value="{csrf}">
  <label>New password: <input name="newpw" value=""></label>
  <button>Change password</button>
</form>
<p class="lead">The change-password action is CSRF-protected by the token above.
An XSS running on THIS origin can simply read the token and submit the form —
that is the chain.</p>
</body></html>"""


@bp.route("/auth/account")
def account():
    sid, sess = _current()
    if not sess:
        return Response("<p>Not logged in. <a href='/auth/login'>Log in</a>.</p>",
                        mimetype="text/html")
    return Response(ACCOUNT.format(**sess), mimetype="text/html")


@bp.route("/auth/change-password", methods=["POST"])
def change_password():
    sid, sess = _current()
    if not sess:
        return Response("not logged in", status=401)
    token = request.form.get("csrf", "")
    # CSRF check: a cross-SITE attacker cannot read this token. But a SAME-ORIGIN
    # XSS can, which is why XSS defeats CSRF protection.
    if not secrets.compare_digest(token, sess["csrf"]):
        return Response("CSRF token invalid", status=403)
    sess["password"] = request.form.get("newpw", "")
    return Response(f"Password changed to: {sess['password']}", mimetype="text/plain")


@bp.route("/auth/status")
def status():
    sid, sess = _current()
    return jsonify({
        "logged_in": bool(sess),
        "user": sess["user"] if sess else None,
        "password": sess["password"] if sess else None,
        "sid_cookie_visible_to_js": "sid" in request.cookies,
        "note": "if you can read document.cookie, the session is stealable",
    })


@bp.route("/auth/xss-entry")
def xss_entry():
    # An intentional reflected XSS on the same origin as the account system, so
    # the chaining payload has somewhere to run. Reflects `html` unencoded.
    html = request.args.get("html", "")
    page = (f"<!doctype html><meta charset='utf-8'>"
            f"<link rel='stylesheet' href='/m/assets/lab.css'>"
            f"<body style='padding:24px'>"
            f"<nav class='nav'><a href='/'>◂ Lab home</a></nav>"
            f"<h1>Message board</h1><div class='card'>{html}</div>"
            f"<p class='lead'>Reflected unencoded — inject your chain here.</p>")
    return Response(page, mimetype="text/html")
