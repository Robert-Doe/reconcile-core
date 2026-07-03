"""
vuln_upload.py — Module 07's endpoints (SVG/namespace upload).

Blueprint `bp`:

    GET  /upload            an upload form + list of stored files
    POST /upload            accepts a file, stores it in-memory (no disk)
    GET  /uploads/<name>    serves it back SAME-ORIGIN with its declared type
    GET  /uploads-safe/<name>  serves it defensively (forced download, nosniff)

Teaching point: "it's just an image" is false for SVG. An SVG is an XML document
that can contain <script> and event handlers. Served same-origin with
Content-Type image/svg+xml and rendered as a *document* (navigated to directly,
or embedded as <object>/<iframe>), its script runs in your origin.

Files are kept in a process dict so nothing touches the student's disk and the
lab resets on restart.

DELIBERATELY VULNERABLE. Localhost study only.
"""
import html
from flask import Blueprint, request, Response, abort

bp = Blueprint("m07_upload", __name__)

# name -> (content_type, bytes). In-memory only.
_STORE: dict[str, tuple[str, bytes]] = {}

# A sample malicious SVG shipped so students see the payload even before upload.
_SAMPLE = (
    '<?xml version="1.0"?>\n'
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(document.domain)">\n'
    '  <script>alert("SVG script in " + document.domain)</script>\n'
    '  <text x="10" y="20">I look like an image.</text>\n'
    '</svg>\n'
)
_STORE["malicious.svg"] = ("image/svg+xml", _SAMPLE.encode())


def _list_html() -> str:
    rows = "".join(
        f'<li><code>{html.escape(n)}</code> ({html.escape(ct)}) — '
        f'<a href="/uploads/{n}" target="_blank">open (vulnerable)</a> · '
        f'<a href="/uploads-safe/{n}" target="_blank">open (safe)</a></li>'
        for n, (ct, _) in _STORE.items()
    )
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Uploads</title><link rel="stylesheet" href="/m/assets/lab.css"></head>
<body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_07_namespace/">◂ Module 07 tutorial</a></nav>
<h1>File uploads</h1>
<form method="post" action="/upload" enctype="multipart/form-data">
  <input type="file" name="f" accept=".svg,.html,.xml,image/*">
  <button>Upload</button>
</form>
<p class="lead">A <code>malicious.svg</code> is preloaded. Click "open
(vulnerable)" — it is served <b>same-origin</b> as <code>image/svg+xml</code> and
its script executes. "open (safe)" forces a download and cannot execute.</p>
<h2>Stored files</h2><ul>{rows}</ul>
</body></html>"""


@bp.route("/upload", methods=["GET", "POST"])
def upload():
    if request.method == "POST":
        f = request.files.get("f")
        if f and f.filename:
            data = f.read()
            # THE BUG: we trust the browser-provided content type and store as-is.
            ct = f.mimetype or "application/octet-stream"
            _STORE[f.filename] = (ct, data)
    return Response(_list_html(), mimetype="text/html")


@bp.route("/uploads/<path:name>")
def serve_vulnerable(name: str):
    if name not in _STORE:
        abort(404)
    ct, data = _STORE[name]
    # THE BUG: served same-origin, inline, with a content type that lets an SVG
    # render as an active document. Visiting this URL executes the SVG's script.
    return Response(data, mimetype=ct)


@bp.route("/uploads-safe/<path:name>")
def serve_safe(name: str):
    if name not in _STORE:
        abort(404)
    _, data = _STORE[name]
    # THE FIX (defense in depth):
    #   * force a neutral content type + nosniff so the browser won't treat SVG
    #     as an active document,
    #   * Content-Disposition: attachment forces download instead of render,
    #   * a restrictive CSP neuters any script if it somehow renders,
    #   * (best practice, not shown) serve user uploads from a SEPARATE origin.
    resp = Response(data, mimetype="application/octet-stream")
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Content-Disposition"] = "attachment; filename=download.bin"
    resp.headers["Content-Security-Policy"] = "default-src 'none'"
    return resp
