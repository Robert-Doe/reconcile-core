"""
callback_server.py — Module 11's endpoints (blind XSS / out-of-band).

Blueprint `bp`:

    POST /feedback           store a feedback message (attacker submits here)
    GET  /admin/feedback     the BLIND sink: an "admin" screen that renders
                             feedback unencoded -> payload fires in admin's view
    GET  /collect            the OOB beacon: records a hit (query + cookie snippet)
    GET  /callbacks          view the collected hits (your capture console)
    POST /callbacks/clear    clear the log

Teaching point: in blind XSS you cannot SEE the page where your payload lands
(an admin panel, a log viewer, a PDF/report generator, a support-ticket UI).
You detect execution out-of-band: the payload phones home to a server you
control. Here that server is local (/collect) so nothing leaves your machine.

DELIBERATELY VULNERABLE. Localhost study only.
"""
import html
import time
from flask import Blueprint, request, Response, redirect

bp = Blueprint("m11_blind", __name__)

_FEEDBACK: list[str] = ["The site is great, thanks!"]
_HITS: list[dict] = []  # each: {ts, path, data, ua, note}


def _shell(title: str, inner: str) -> str:
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>{title}</title><link rel="stylesheet" href="/m/assets/lab.css"></head>
<body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_11_blind/">◂ Module 11 tutorial</a>
<a href="/feedback">/feedback</a> · <a href="/admin/feedback">/admin/feedback</a>
· <a href="/callbacks">/callbacks (capture console)</a></nav>
{inner}</body></html>"""


@bp.route("/feedback", methods=["GET", "POST"])
def feedback():
    if request.method == "POST":
        _FEEDBACK.append(request.form.get("msg", ""))
        return redirect("/feedback")
    form = """
    <h1>Send feedback</h1>
    <p class="lead">Submit feedback. You will NOT see it rendered here — it goes
    to an internal admin queue (/admin/feedback). That is what makes this
    <b>blind</b>.</p>
    <form method="post" action="/feedback">
      <textarea name="msg" rows="3" cols="50">Please add dark mode.</textarea>
      <br><button>Submit</button>
    </form>
    <p><span class="badge attack">vulnerable</span> Your message is queued and
    rendered unencoded in the admin view.</p>"""
    return Response(_shell("Feedback", form), mimetype="text/html")


@bp.route("/admin/feedback")
def admin_feedback():
    # THE BLIND SINK: renders every feedback message unencoded. An attacker never
    # loads this page; only an admin does. Execution happens in the admin's
    # session, which the attacker cannot observe directly -> needs OOB callback.
    items = "".join(f'<div class="card">{m}</div>' for m in _FEEDBACK)
    body = ("<h1>Admin · feedback queue</h1>"
            "<p><span class='badge attack'>blind sink</span> messages rendered "
            "unencoded. If a payload beacons to /collect, check /callbacks.</p>"
            + items)
    return Response(_shell("Admin feedback", body), mimetype="text/html")


@bp.route("/collect")
def collect():
    # THE OOB BEACON. A payload does e.g.
    #   new Image().src='/collect?d='+encodeURIComponent(document.domain)
    # and this records the hit. In a real engagement this would be an external
    # host you own; here it is local so nothing leaves the machine.
    _HITS.append({
        "ts": time.strftime("%H:%M:%S"),
        "path": request.full_path,
        "data": request.args.get("d", ""),
        "ua": request.headers.get("User-Agent", "")[:80],
    })
    # 1x1 transparent GIF so the beacon looks like an image load.
    gif = (b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!"
           b"\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00"
           b"\x00\x02\x02D\x01\x00;")
    return Response(gif, mimetype="image/gif")


@bp.route("/callbacks")
def callbacks():
    if not _HITS:
        rows = "<p class='lead'>No callbacks yet. Plant a payload in feedback, " \
               "load /admin/feedback (as the 'admin'), then refresh here.</p>"
    else:
        rows = "<table><thead><tr><th>time</th><th>data</th><th>path</th>" \
               "<th>UA</th></tr></thead><tbody>" + "".join(
            f"<tr><td>{h['ts']}</td><td><code>{html.escape(h['data'])}</code></td>"
            f"<td><code>{html.escape(h['path'])}</code></td>"
            f"<td>{html.escape(h['ua'])}</td></tr>" for h in reversed(_HITS)
        ) + "</tbody></table>"
    body = ("<h1>Capture console · /callbacks</h1>"
            "<form method='post' action='/callbacks/clear'>"
            "<button>clear log</button></form>" + rows)
    return Response(_shell("Callbacks", body), mimetype="text/html")


@bp.route("/callbacks/clear", methods=["POST"])
def callbacks_clear():
    _HITS.clear()
    return redirect("/callbacks")
