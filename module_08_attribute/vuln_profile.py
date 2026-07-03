"""
vuln_profile.py — Module 08's endpoints (attribute-context injection).

Blueprint `bp`:

    /profile?name=...&bio=...    reflects `name` INSIDE an attribute value and
                                 `bio` into HTML text, with no encoding
    /profile-safe?...            attribute- and text-encoded versions

Teaching point: injection does not need angle brackets. If your data lands inside
an existing tag's attribute value, a single quote character breaks out of the
attribute and lets you add a NEW attribute (an event handler) or even close the
tag. And "dangling markup" lets you exfiltrate data with no JavaScript at all.

DELIBERATELY VULNERABLE. Localhost study only.
"""
from flask import Blueprint, request, Response
from markupsafe import escape

bp = Blueprint("m08_profile", __name__)


def _page(name_attr: str, bio_text: str, note: str) -> str:
    # `name` is placed INSIDE a double-quoted attribute value:
    #   <input ... value="HERE">
    # `bio` is placed in HTML text context below.
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Profile</title><link rel="stylesheet" href="/m/assets/lab.css"></head>
<body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_08_attribute/">◂ Module 08 tutorial</a></nav>
<h1>Edit profile</h1>
<p>{note}</p>
<form action="/profile" method="get">
  <label>Display name:
    <input name="name" value="{name_attr}"></label>
  <br><br>
  <label>Bio:<br><textarea name="bio" rows="3" cols="40">edit me</textarea></label>
  <br><button>Save</button>
</form>
<h2>Preview</h2>
<div class="card">Name shown in an attribute above ↑. Bio in text: {bio_text}</div>
</body></html>"""


@bp.route("/profile")
def profile():
    # THE BUG: `name` reflected into an attribute value with no encoding, so a
    # double-quote closes value="..." and a following on* adds a handler.
    name = request.args.get("name", "")
    bio = request.args.get("bio", "")
    note = ("<span class='badge attack'>vulnerable</span> "
            "name → attribute value (unencoded); bio → HTML text (unencoded).")
    return Response(_page(name, bio, note), mimetype="text/html")


@bp.route("/profile-safe")
def profile_safe():
    # THE FIX: `escape` encodes the quote characters too, so the value cannot
    # break out of the attribute. Note it is the SAME encoder as text context in
    # Flask/Jinja because markupsafe encodes ", ', <, >, & — which happens to be
    # safe for BOTH double-quoted attributes and text. (For unquoted attributes
    # you would additionally need to forbid spaces/other terminators — which is
    # why "always quote your attributes" is a rule.)
    name = request.args.get("name", "")
    bio = request.args.get("bio", "")
    note = ("<span class='badge defense'>hardened</span> "
            "attribute + text contexts encoded; attribute is quoted.")
    return Response(_page(escape(name), escape(bio), note), mimetype="text/html")
