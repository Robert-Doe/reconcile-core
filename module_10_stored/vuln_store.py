"""
vuln_store.py — Module 10's endpoints (stored / persistent XSS).

Blueprint `bp`, backed by a local SQLite file created on first use:

    GET  /comments        renders all stored comments UNENCODED (stored XSS)
    POST /comments        stores a new comment verbatim
    GET  /comments-safe   renders the same rows, contextually encoded (the fix)
    GET  /admin/logs      "second-order": stores author name safely as text,
                          but re-renders it into a DIFFERENT (HTML) context

Teaching point: unlike reflected XSS, the payload is written to a database and
fires for EVERY visitor, every time, with no crafted link. Second-order XSS shows
that data stored "safely" for one context can be dangerous when later rendered in
another context.

DELIBERATELY VULNERABLE. Localhost study only. `make clean` deletes the DB.
"""
import sqlite3
from pathlib import Path
from flask import Blueprint, request, Response, redirect
from markupsafe import escape

bp = Blueprint("m10_store", __name__)

DB = Path(__file__).resolve().parent / "comments.sqlite3"


def _db() -> sqlite3.Connection:
    con = sqlite3.connect(DB)
    con.execute(
        "CREATE TABLE IF NOT EXISTS comments "
        "(id INTEGER PRIMARY KEY, author TEXT, body TEXT)"
    )
    # Seed once so the page isn't empty.
    if con.execute("SELECT COUNT(*) FROM comments").fetchone()[0] == 0:
        con.execute(
            "INSERT INTO comments(author, body) VALUES(?, ?)",
            ("alice", "First! Great article."),
        )
        con.commit()
    return con


def _shell(title: str, inner: str) -> str:
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>{title}</title><link rel="stylesheet" href="/m/assets/lab.css"></head>
<body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_10_stored/">◂ Module 10 tutorial</a>
<a href="/comments">/comments</a> · <a href="/comments-safe">/comments-safe</a>
· <a href="/admin/logs">/admin/logs</a></nav>
{inner}</body></html>"""


FORM = """
<h1>Comments</h1>
<form method="post" action="/comments">
  <input name="author" placeholder="name" value="guest">
  <br><br>
  <textarea name="body" rows="3" cols="50" placeholder="comment...">Nice!</textarea>
  <br><button>Post comment</button>
</form><hr>
"""


@bp.route("/comments", methods=["GET", "POST"])
def comments():
    con = _db()
    if request.method == "POST":
        # Parameterized query -> NO SQL injection. But we still store the raw
        # payload, and the bug is in how we RENDER it below.
        con.execute(
            "INSERT INTO comments(author, body) VALUES(?, ?)",
            (request.form.get("author", ""), request.form.get("body", "")),
        )
        con.commit()
        con.close()
        return redirect("/comments")

    rows = con.execute("SELECT author, body FROM comments ORDER BY id").fetchall()
    con.close()
    # THE BUG: author and body are concatenated into HTML with no encoding, so a
    # stored <img onerror> / <script> fires for every visitor.
    items = "".join(
        f'<div class="card"><b>{a}</b>: {b}</div>' for a, b in rows
    )
    note = ("<p><span class='badge attack'>vulnerable</span> stored comments "
            "rendered unencoded — a payload here fires for every visitor.</p>")
    return Response(_shell("Comments", FORM + note + items), mimetype="text/html")


@bp.route("/comments-safe")
def comments_safe():
    con = _db()
    rows = con.execute("SELECT author, body FROM comments ORDER BY id").fetchall()
    con.close()
    # THE FIX: encode at render time, for the HTML text context.
    items = "".join(
        f'<div class="card"><b>{escape(a)}</b>: {escape(b)}</div>' for a, b in rows
    )
    note = ("<p><span class='badge defense'>hardened</span> same stored rows, "
            "encoded at output. Stored payloads render as inert text.</p>")
    return Response(_shell("Comments (safe)", note + items), mimetype="text/html")


@bp.route("/admin/logs")
def admin_logs():
    con = _db()
    rows = con.execute("SELECT author FROM comments ORDER BY id").fetchall()
    con.close()
    # SECOND-ORDER: imagine `author` was validated as "safe text" on the way in
    # (no SQLi, stored fine). Here an admin tool renders that same author name
    # into an HTML attribute + tag context WITHOUT re-encoding for THIS context.
    # A value that was inert as plain text is now dangerous as markup.
    items = "".join(
        f'<li><span title="{a}" data-user="{a}">{a}</span></li>' for a, in rows
    )
    note = ("<p><span class='badge attack'>second-order</span> author names "
            "stored 'safely' but re-rendered here into attribute + tag context "
            "without re-encoding. Inert-at-input becomes active-at-output.</p>")
    return Response(_shell("Admin logs", note + f"<ul>{items}</ul>"),
                    mimetype="text/html")
