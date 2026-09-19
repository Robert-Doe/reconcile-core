#!/usr/bin/env node
/*
 * server.js — Node.js port of the XSS Attack & Defense Lab.
 *
 * A faithful mirror of lab_server.py using ONLY Node's built-in modules
 * (http, fs, path, url). No dependencies, no `npm install` — just:
 *
 *     node server.js
 *     # then open http://localhost:5000
 *
 * It serves every module's tutorial pages at /m/<folder>/ and reimplements the
 * same intentionally-vulnerable endpoints (with their safe twins) so you can run
 * and try each module under Node exactly as under Flask.
 *
 * DELIBERATELY INSECURE. Localhost study only. Harmless alert(1)-style proofs.
 *
 * One difference from the Python version: stored comments/feedback are kept
 * in-memory here (the Python lab uses SQLite). The teaching point — a payload
 * that survives storage and fires for every visitor — is identical; only the
 * persistence layer differs, and the lab resets on restart.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const HOST = process.env.LAB_HOST || '127.0.0.1';
const PORT = parseInt(process.env.LAB_PORT || '5000', 10);
const HARDENING = process.env.LAB_HARDENING === '1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]));
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers) {
  const h = Object.assign({ 'X-Lab': 'xss-teaching-lab; do-not-deploy' }, headers || {});
  if (HARDENING && !h['Content-Security-Policy']) {
    h['Content-Security-Policy'] =
      "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'";
    h['X-Content-Type-Options'] = 'nosniff';
  }
  res.writeHead(status, h);
  res.end(body);
}

function html(res, body, headers) {
  send(res, 200, body, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function parseForm(buf) {
  const out = {};
  buf.toString('utf8').split('&').forEach((kv) => {
    if (!kv) return;
    const i = kv.indexOf('=');
    const k = decodeURIComponent((i > -1 ? kv.slice(0, i) : kv).replace(/\+/g, ' '));
    const v = i > -1 ? decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')) : '';
    out[k] = v;
  });
  return out;
}

// Minimal multipart/form-data parser: returns { fields, files:{name:{filename,type,data}} }
function parseMultipart(buf, contentType) {
  const m = /boundary=(.+)$/.exec(contentType || '');
  if (!m) return { fields: {}, files: {} };
  const boundary = Buffer.from('--' + m[1].replace(/"/g, ''));
  const fields = {}, files = {};
  let start = buf.indexOf(boundary);
  while (start !== -1) {
    const next = buf.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    let part = buf.slice(start + boundary.length, next);
    // strip leading CRLF and trailing CRLF
    if (part.slice(0, 2).toString() === '\r\n') part = part.slice(2);
    if (part.slice(-2).toString() === '\r\n') part = part.slice(0, -2);
    const hdrEnd = part.indexOf('\r\n\r\n');
    if (hdrEnd !== -1) {
      const rawHdr = part.slice(0, hdrEnd).toString();
      const data = part.slice(hdrEnd + 4);
      const nameM = /name="([^"]*)"/.exec(rawHdr);
      const fileM = /filename="([^"]*)"/.exec(rawHdr);
      const typeM = /Content-Type:\s*([^\r\n]+)/i.exec(rawHdr);
      const name = nameM ? nameM[1] : '';
      if (fileM) {
        files[name] = { filename: fileM[1], type: typeM ? typeM[1].trim() : 'application/octet-stream', data };
      } else {
        fields[name] = data.toString('utf8');
      }
    }
    start = next;
  }
  return { fields, files };
}

// ---------------------------------------------------------------------------
// Module registry (mirrors lab_server.py MODULES)
// ---------------------------------------------------------------------------
const MODULES = [
  ['module_01_setup', '01 — Environment Setup & Attacker Mindset', false],
  ['module_02_parsing', '02 — How Browsers Parse HTML', false],
  ['module_03_taxonomy', '03 — The 5 Execution Mechanisms', false],
  ['module_04_script_injection', '04 — Script Tag Injection', true],
  ['module_05_event_handlers', '05 — Event Handler Injection', false],
  ['module_06_uri_schemes', '06 — URI Scheme Injection', true],
  ['module_07_namespace', '07 — Tag & Namespace Confusion', true],
  ['module_08_attribute', '08 — Attribute Injection', true],
  ['module_09_dom', '09 — DOM-Based XSS & Client Sinks', false],
  ['module_10_stored', '10 — Stored & Second-Order XSS', true],
  ['module_11_blind', '11 — Blind XSS & Out-of-Band', true],
  ['module_12_evasion', '12 — Filter Evasion & Obfuscation', true],
  ['module_13_mxss', '13 — Mutation XSS (mXSS)', false],
  ['module_14_proto', '14 — Prototype Pollution to DOM XSS', false],
  ['module_15_chaining', '15 — Attack Chaining to ATO', true],
  ['module_16_cases', '16 — Real-World Incidents', false],
  ['module_17_defenses', '17 — Defenses', true],
  ['module_18_threatmodel', '18 — Threat Model & Intervention', false],
  ['module_19_payload_bank', '19 — The XSS Payload Bank (100+)', false],
];

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------
const uploads = new Map(); // name -> {type, data}
uploads.set('malicious.svg', {
  type: 'image/svg+xml',
  data: Buffer.from(
    '<?xml version="1.0"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(document.domain)">\n' +
    '  <script>alert("SVG script in " + document.domain)</script>\n' +
    '  <text x="10" y="20">I look like an image.</text>\n</svg>\n'),
});
let comments = [{ author: 'alice', body: 'First! Great article.' }];
let feedback = ['The site is great, thanks!'];
let callbacks = [];
const sessions = new Map(); // sid -> {user, csrf, password}

// ---------------------------------------------------------------------------
// Static serving
// ---------------------------------------------------------------------------
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  });
}

function moduleIndex(res, folder) {
  const dir = path.join(ROOT, folder);
  const idx = path.join(dir, 'index.html');
  if (fs.existsSync(idx)) return serveFile(res, idx);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory())
    return send(res, 404, 'No such module', { 'Content-Type': 'text/plain' });
  const links = fs.readdirSync(dir)
    .filter((f) => /\.(html|js|svg|md)$/.test(f))
    .map((f) => `<li><a href="/m/${folder}/${f}">${esc(f)}</a></li>`).join('');
  html(res, `<h1>${esc(folder)}</h1><ul>${links}</ul>`);
}

// ---------------------------------------------------------------------------
// Endpoint handlers (mirror the Flask blueprints)
// ---------------------------------------------------------------------------
const SEARCH_PAGE = (q) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Lab Search</title><link rel="stylesheet" href="/m/assets/lab.css"></head>
<body style="padding:24px"><nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_04_script_injection/">◂ Module 04 tutorial</a></nav>
<h1>Search</h1><form action="/search" method="get">
<input name="q" value="" style="width:60%;padding:8px" placeholder="search...">
<button>Search</button></form>
<p>You searched for: ${q}</p><p class="lead">Results: 0 items found.</p></body></html>`;

function encHtmlText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function encHtmlAttr(s) { return encHtmlText(s).replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/`/g, '&#x60;'); }

const REDIRECT_PAGE = (urlAttr, note) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Redirect</title><link rel="stylesheet" href="/m/assets/lab.css"></head><body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a><a href="/m/module_06_uri_schemes/">◂ Module 06 tutorial</a></nav>
<h1>Leaving the site…</h1><p>${note}</p>
<p>You are being redirected to: <a id="dest" href="${encHtmlAttr(urlAttr)}">${encHtmlAttr(urlAttr)}</a></p>
<p class="lead">Click the link; if the scheme is javascript:, clicking executes it.</p></body></html>`;

const SAFE_SCHEMES = ['http:', 'https:', '/', '#', '?'];

const PROFILE_PAGE = (nameAttr, bioText, note) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Profile</title><link rel="stylesheet" href="/m/assets/lab.css"></head><body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a><a href="/m/module_08_attribute/">◂ Module 08 tutorial</a></nav>
<h1>Edit profile</h1><p>${note}</p><form action="/profile" method="get">
<label>Display name: <input name="name" value="${nameAttr}"></label><br><br>
<label>Bio:<br><textarea name="bio" rows="3" cols="40">edit me</textarea></label>
<br><button>Save</button></form><h2>Preview</h2>
<div class="card">Name shown in an attribute above ↑. Bio in text: ${bioText}</div></body></html>`;

function shell(title, inner, navExtra) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="/m/assets/lab.css"></head><body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a>${navExtra || ''}</nav>${inner}</body></html>`;
}

const WAF_BLOCK = [/<\s*script/i, /<\/\s*script/i, /onerror/i, /javascript:/i, /alert/i];
function wafPage(body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Filtered search</title>
<link rel="stylesheet" href="/m/assets/lab.css"></head><body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a><a href="/m/module_12_evasion/">◂ Module 12 tutorial</a>
<a href="/waf-info">/waf-info</a></nav><h1>Search (WAF-protected)</h1>
<form action="/waf-search" method="get"><input name="q" style="width:60%;padding:8px" placeholder="search...">
<button>Search</button></form>${body}</body></html>`;
}

// Defense encoders (mirror defense_encoding.py)
function encJsString(s) { return JSON.stringify(String(s)).replace(/<\//g, '<\\/'); }
function encUrl(s) { return encodeURIComponent(String(s)); }
function encCss(s) { return String(s).replace(/[^a-zA-Z0-9]/g, (c) => '\\' + c.charCodeAt(0).toString(16).padStart(6, '0')); }
const CONTEXTS = { html_text: encHtmlText, html_attr: encHtmlAttr, js_string: encJsString, url: encUrl, css_string: encCss };
const CSP_POLICIES = {
  none: '', loose: "script-src 'self' 'unsafe-inline'",
  strict: "script-src 'self'; object-src 'none'; base-uri 'none'",
  nonce: "script-src 'nonce-lab123' 'strict-dynamic'; object-src 'none'; base-uri 'none'",
  tt: "require-trusted-types-for 'script'; trusted-types default; script-src 'self'; object-src 'none'; base-uri 'none'",
};

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------
function homePage() {
  const rows = MODULES.map(([folder, title, live]) => {
    const badge = live ? '<span style="color:#0a0">● server-live</span>'
                       : '<span style="color:#888">○ static</span>';
    return `<tr><td><a href="/m/${folder}/">${esc(title)}</a></td><td>${badge}</td>
      <td><a href="/m/${folder}/HEADFIRST.md">HeadFirst</a> · <a href="/m/${folder}/DECISIONS.md">Decisions</a></td></tr>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>XSS Attack & Defense Lab (Node)</title>
<style>body{font:15px/1.55 system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#1a1a1a}
h1{font-size:1.6rem}table{border-collapse:collapse;width:100%;margin-top:1rem}
td{padding:8px 10px;border-bottom:1px solid #eee}a{color:#0b5;text-decoration:none}a:hover{text-decoration:underline}
.warn{background:#fff3cd;border:1px solid #ffe08a;padding:12px 16px;border-radius:8px}
code{background:#f4f4f4;padding:1px 5px;border-radius:4px}</style></head><body>
<h1>XSS Attack &amp; Defense Lab <small style="color:#888;font-size:1rem">(Node runtime)</small></h1>
<p class="warn"><strong>Localhost only.</strong> Intentionally vulnerable; study &amp; defense design.
Every payload uses a harmless <code>alert(1)</code>-style proof. Same lab as the Python version, run under Node.</p>
<p>Origin under test: <code>http://${HOST}:${PORT}</code> · Hardening: <code>${HARDENING ? 'ON' : 'OFF'}</code>
(set <code>LAB_HARDENING=1</code>)</p>
<p style="background:#eef6ff;border:1px solid #cfe3fb;padding:12px 16px;border-radius:8px">
<strong>📚 Research companion:</strong>
<a href="/research/">Reconciliation, Parsing &amp; the CSR XSS Frontier</a>
— PhD-level Tracks A–F, with a runnable React lab.</p>
<table><tbody>${rows}</tbody></table></body></html>`;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(u.pathname);
  const q = u.searchParams;
  const cookies = parseCookies(req);

  try {
    // --- static & home ---
    if (p === '/') return html(res, homePage());
    if (p === '/favicon.ico') return send(res, 204, '');

    if (p.startsWith('/m/')) {
      const rest = p.slice(3);
      const parts = rest.split('/').filter(Boolean);
      if (parts.length === 1 || (parts.length >= 1 && rest.endsWith('/'))) {
        return moduleIndex(res, parts[0]);
      }
      // static file under a module folder (supports nested paths e.g. case_studies/)
      const safe = path.normalize(path.join(ROOT, ...parts));
      if (!safe.startsWith(ROOT)) return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
      return serveFile(res, safe);
    }

    // --- shared assets (research tracks reference ../assets -> /assets) ---
    if (p.startsWith('/assets/')) {
      const safe = path.normalize(path.join(ROOT, 'assets', ...p.slice('/assets/'.length).split('/').filter(Boolean)));
      if (!safe.startsWith(path.join(ROOT, 'assets'))) return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
      return serveFile(res, safe);
    }

    // --- research companion (Tracks A-F static pages) ---
    if (p === '/research' || p.startsWith('/research/')) {
      const base = path.join(ROOT, 'research_reconciliation');
      let sub = p.replace(/^\/research\/?/, '');
      let safe = path.normalize(path.join(base, ...sub.split('/').filter(Boolean)));
      if (!safe.startsWith(base)) return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
      try {
        if (sub === '' || fs.statSync(safe).isDirectory()) safe = path.join(safe, 'index.html');
      } catch (_) { /* not a dir */ }
      return serveFile(res, safe);
    }

    // --- M04: reflected ---
    if (p === '/search') return html(res, SEARCH_PAGE(q.get('q') || ''));
    if (p === '/search-safe') return html(res, SEARCH_PAGE(encHtmlText(q.get('q') || '')));

    // --- M06: redirect / URI schemes ---
    if (p === '/go') {
      const url = q.get('url') || '';
      return html(res, REDIRECT_PAGE(url,
        "<span class='badge attack'>vulnerable</span> This endpoint does not check the URL scheme."));
    }
    if (p === '/go-safe') {
      const raw = q.get('url') || '';
      const s = raw.trim().toLowerCase();
      const ok = raw === '' || SAFE_SCHEMES.some((x) => s.startsWith(x));
      return html(res, REDIRECT_PAGE(ok ? raw : '/',
        `<span class='badge defense'>hardened</span> Scheme allowlist applied. Original allowed: <b>${ok}</b>.`));
    }

    // --- M07: upload / SVG ---
    if (p === '/upload') {
      if (req.method === 'POST') {
        const body = await readBody(req);
        const { files } = parseMultipart(body, req.headers['content-type']);
        const f = files['f'];
        if (f && f.filename) uploads.set(f.filename, { type: f.type, data: f.data });
      }
      const list = [...uploads.entries()].map(([n, v]) =>
        `<li><code>${esc(n)}</code> (${esc(v.type)}) — <a href="/uploads/${n}" target="_blank">open (vulnerable)</a>
         · <a href="/uploads-safe/${n}" target="_blank">open (safe)</a></li>`).join('');
      return html(res, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Uploads</title>
<link rel="stylesheet" href="/m/assets/lab.css"></head><body style="padding:24px">
<nav class="nav"><a href="/">◂ Lab home</a><a href="/m/module_07_namespace/">◂ Module 07 tutorial</a></nav>
<h1>File uploads</h1><form method="post" action="/upload" enctype="multipart/form-data">
<input type="file" name="f" accept=".svg,.html,.xml,image/*"><button>Upload</button></form>
<p class="lead">A <code>malicious.svg</code> is preloaded. "open (vulnerable)" serves it same-origin as
image/svg+xml and its script runs; "open (safe)" forces a download.</p>
<h2>Stored files</h2><ul>${list}</ul></body></html>`);
    }
    if (p.startsWith('/uploads/')) {
      const name = p.slice('/uploads/'.length);
      if (!uploads.has(name)) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
      const f = uploads.get(name);
      return send(res, 200, f.data, { 'Content-Type': f.type }); // vulnerable: inline, declared type
    }
    if (p.startsWith('/uploads-safe/')) {
      const name = p.slice('/uploads-safe/'.length);
      if (!uploads.has(name)) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
      return send(res, 200, uploads.get(name).data, {
        'Content-Type': 'application/octet-stream', 'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'attachment; filename=download.bin', 'Content-Security-Policy': "default-src 'none'",
      });
    }

    // --- M08: attribute injection ---
    if (p === '/profile') {
      return html(res, PROFILE_PAGE(q.get('name') || '', q.get('bio') || '',
        "<span class='badge attack'>vulnerable</span> name → attribute value (unencoded); bio → HTML text (unencoded)."));
    }
    if (p === '/profile-safe') {
      return html(res, PROFILE_PAGE(encHtmlAttr(q.get('name') || ''), encHtmlText(q.get('bio') || ''),
        "<span class='badge defense'>hardened</span> attribute + text contexts encoded; attribute is quoted."));
    }

    // --- M10: stored / second-order ---
    if (p === '/comments') {
      if (req.method === 'POST') {
        const f = parseForm(await readBody(req));
        comments.push({ author: f.author || '', body: f.body || '' });
        return send(res, 302, '', { Location: '/comments' });
      }
      const form = `<h1>Comments</h1><form method="post" action="/comments">
<input name="author" placeholder="name" value="guest"><br><br>
<textarea name="body" rows="3" cols="50" placeholder="comment...">Nice!</textarea>
<br><button>Post comment</button></form><hr>`;
      const items = comments.map((c) => `<div class="card"><b>${c.author}</b>: ${c.body}</div>`).join('');
      return html(res, shell('Comments', form +
        "<p><span class='badge attack'>vulnerable</span> stored comments rendered unencoded — a payload fires for every visitor.</p>" +
        items, '<a href="/m/module_10_stored/">◂ Module 10 tutorial</a> <a href="/comments-safe">/comments-safe</a> <a href="/admin/logs">/admin/logs</a>'));
    }
    if (p === '/comments-safe') {
      const items = comments.map((c) => `<div class="card"><b>${esc(c.author)}</b>: ${esc(c.body)}</div>`).join('');
      return html(res, shell('Comments (safe)',
        "<p><span class='badge defense'>hardened</span> same stored rows, encoded at output.</p>" + items,
        '<a href="/comments">/comments</a>'));
    }
    if (p === '/admin/logs') {
      const items = comments.map((c) => `<li><span title="${c.author}" data-user="${c.author}">${c.author}</span></li>`).join('');
      return html(res, shell('Admin logs',
        "<p><span class='badge attack'>second-order</span> author names re-rendered into attribute + tag context without re-encoding.</p><ul>" +
        items + '</ul>', '<a href="/comments">/comments</a>'));
    }

    // --- M11: blind / OOB ---
    if (p === '/feedback') {
      if (req.method === 'POST') {
        const f = parseForm(await readBody(req));
        feedback.push(f.msg || '');
        return send(res, 302, '', { Location: '/feedback' });
      }
      return html(res, shell('Feedback',
        `<h1>Send feedback</h1><p class="lead">You will NOT see it rendered here — it goes to /admin/feedback. That's what makes it blind.</p>
<form method="post" action="/feedback"><textarea name="msg" rows="3" cols="50">Please add dark mode.</textarea>
<br><button>Submit</button></form><p><span class="badge attack">vulnerable</span> queued and rendered unencoded in the admin view.</p>`,
        '<a href="/admin/feedback">/admin/feedback</a> <a href="/callbacks">/callbacks</a>'));
    }
    if (p === '/admin/feedback') {
      const items = feedback.map((m) => `<div class="card">${m}</div>`).join('');
      return html(res, shell('Admin feedback',
        "<h1>Admin · feedback queue</h1><p><span class='badge attack'>blind sink</span> rendered unencoded. If a payload beacons to /collect, check /callbacks.</p>" + items,
        '<a href="/callbacks">/callbacks</a>'));
    }
    if (p === '/collect') {
      callbacks.push({ ts: new Date().toTimeString().slice(0, 8), path: req.url,
        data: q.get('d') || '', ua: (req.headers['user-agent'] || '').slice(0, 80) });
      const gif = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64');
      return send(res, 200, gif, { 'Content-Type': 'image/gif' });
    }
    if (p === '/callbacks') {
      const rows = callbacks.length === 0
        ? "<p class='lead'>No callbacks yet. Plant a payload in feedback, load /admin/feedback, then refresh.</p>"
        : '<table><thead><tr><th>time</th><th>data</th><th>path</th><th>UA</th></tr></thead><tbody>' +
          callbacks.slice().reverse().map((h) =>
            `<tr><td>${h.ts}</td><td><code>${esc(h.data)}</code></td><td><code>${esc(h.path)}</code></td><td>${esc(h.ua)}</td></tr>`).join('') +
          '</tbody></table>';
      return html(res, shell('Callbacks',
        "<h1>Capture console · /callbacks</h1><form method='post' action='/callbacks/clear'><button>clear log</button></form>" + rows));
    }
    if (p === '/callbacks/clear' && req.method === 'POST') {
      callbacks = [];
      return send(res, 302, '', { Location: '/callbacks' });
    }

    // --- M12: WAF evasion ---
    if (p === '/waf-search') {
      const val = q.get('q') || '';
      const hit = WAF_BLOCK.find((rx) => rx.test(val));
      if (hit) {
        const m = val.match(hit);
        return html(res, wafPage(`<p><span class='badge defense'>blocked</span> Your query matched the denylist token <code>${esc(m[0])}</code>. Try again — the filter is bypassable.</p>`));
      }
      return html(res, wafPage(`<p>Results for: ${val}</p>`)); // reflected unencoded when not blocked
    }
    if (p === '/waf-info') {
      const rules = ['&lt;script', '&lt;/script', 'onerror', 'javascript:', 'alert']
        .map((r) => `<li><code>${r}</code></li>`).join('');
      return html(res, wafPage(`<h2>Filter rules (case-insensitive denylist)</h2><ul>${rules}</ul>
<p class='lead'>Reflection is UNENCODED when not blocked. Pop an alert anyway, five ways.</p>`));
    }

    // --- M15: auth / chaining ---
    if (p === '/auth/login') {
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, { user: 'victim', csrf: crypto.randomBytes(16).toString('hex'), password: 'hunter2' });
      const httpOnly = q.get('httponly') === '1';
      return send(res, 200,
        "<p>Logged in as <b>victim</b>. <a href='/auth/account'>Go to account</a></p>" +
        "<p class='lead'>Cookie set. Try /auth/login?httponly=1 to compare.</p>",
        { 'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': `sid=${sid}; Path=/; SameSite=Lax${httpOnly ? '; HttpOnly' : ''}` });
    }
    if (p === '/auth/account') {
      const sess = sessions.get(cookies.sid);
      if (!sess) return html(res, "<p>Not logged in. <a href='/auth/login'>Log in</a>.</p>");
      return html(res, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Account</title>
<link rel="stylesheet" href="/m/assets/lab.css"><meta name="csrf-token" content="${sess.csrf}"></head>
<body style="padding:24px"><nav class="nav"><a href="/">◂ Lab home</a>
<a href="/m/module_15_chaining/">◂ Module 15 tutorial</a> <a href="/auth/status">/auth/status</a></nav>
<h1>Account settings — ${sess.user}</h1><p>Current password (shown for the lab): <code>${sess.password}</code></p>
<form method="post" action="/auth/change-password"><input type="hidden" name="csrf" value="${sess.csrf}">
<label>New password: <input name="newpw" value=""></label><button>Change password</button></form>
<p class="lead">CSRF-protected by the token above. A same-origin XSS reads it and submits — that's the chain.</p></body></html>`);
    }
    if (p === '/auth/change-password' && req.method === 'POST') {
      const sess = sessions.get(cookies.sid);
      if (!sess) return send(res, 401, 'not logged in', { 'Content-Type': 'text/plain' });
      const f = parseForm(await readBody(req));
      const a = Buffer.from(f.csrf || ''), b = Buffer.from(sess.csrf);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
        return send(res, 403, 'CSRF token invalid', { 'Content-Type': 'text/plain' });
      sess.password = f.newpw || '';
      return send(res, 200, `Password changed to: ${sess.password}`, { 'Content-Type': 'text/plain' });
    }
    if (p === '/auth/status') {
      const sess = sessions.get(cookies.sid);
      return send(res, 200, JSON.stringify({
        logged_in: !!sess, user: sess ? sess.user : null, password: sess ? sess.password : null,
        sid_cookie_visible_to_js: 'sid' in cookies,
        note: 'if you can read document.cookie, the session is stealable',
      }, null, 2), { 'Content-Type': 'application/json' });
    }
    if (p === '/auth/xss-entry') {
      const h = q.get('html') || '';
      return html(res, `<!doctype html><meta charset='utf-8'><link rel='stylesheet' href='/m/assets/lab.css'>
<body style='padding:24px'><nav class='nav'><a href='/'>◂ Lab home</a></nav>
<h1>Message board</h1><div class='card'>${h}</div><p class='lead'>Reflected unencoded — inject your chain here.</p>`);
    }

    // --- M17: defenses ---
    if (p === '/defense/encoders') {
      const val = q.get('q') || '"><img src=x onerror=alert(1)>';
      const result = {};
      for (const [name, fn] of Object.entries(CONTEXTS)) result[name] = fn(val);
      result._input = val;
      result._note = 'Same bytes, different correct encoding per context.';
      return send(res, 200, JSON.stringify(result, null, 2), { 'Content-Type': 'application/json' });
    }
    if (p === '/defense/context') {
      const ctx = q.get('ctx') || 'html_text';
      const val = q.get('q') || '';
      const fn = CONTEXTS[ctx] || encHtmlText;
      const safe = fn(val);
      let sink;
      if (ctx === 'html_attr') sink = `<input value="${safe}">`;
      else if (ctx === 'js_string') sink = `<script>var x = ${safe}; document.title = x;</script>`;
      else if (ctx === 'url') sink = `<a href="/go?url=${safe}">link</a>`;
      else sink = `<div>${safe}</div>`;
      return html(res, `<!doctype html><meta charset='utf-8'><link rel='stylesheet' href='/m/assets/lab.css'>
<body style='padding:24px'><nav class='nav'><a href='/'>◂ Lab home</a><a href='/m/module_17_defenses/'>◂ Module 17</a></nav>
<h1>Context: ${esc(ctx)}</h1><p><span class='badge defense'>encoded</span> Encoded with the <code>${esc(ctx)}</code> encoder:</p>${sink}
<p class='lead'>Try earlier payloads — they should render inert.</p>`);
    }
    if (p === '/defense/csp-search') {
      const val = q.get('q') || '';
      const policy = q.get('policy') || 'strict';
      const csp = CSP_POLICIES[policy] !== undefined ? CSP_POLICIES[policy] : CSP_POLICIES.strict;
      const headers = { 'Content-Type': 'text/html; charset=utf-8' };
      if (csp) headers['Content-Security-Policy'] = csp;
      return send(res, 200, `<!doctype html><meta charset='utf-8'><link rel='stylesheet' href='/m/assets/lab.css'>
<body style='padding:24px'><nav class='nav'><a href='/'>◂ Lab home</a>
<a href='/m/module_17_defenses/defense_csp.html'>◂ CSP tutorial</a></nav>
<h1>CSP demo — policy: ${esc(policy)}</h1><p>Active policy: <code>${esc(csp) || '(none)'}</code></p>
<p>Reflected UNENCODED: ${val}</p>
<p class='lead'>Open DevTools console: with strict/nonce/tt, injected inline script/handlers are refused.</p>`, headers);
    }

    return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
  } catch (err) {
    send(res, 500, 'Lab error: ' + err.message, { 'Content-Type': 'text/plain' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log(' XSS Attack & Defense Lab (Node runtime)');
  console.log(` Serving on http://${HOST}:${PORT}   (Ctrl+C to stop)`);
  console.log(` Hardening headers: ${HARDENING ? 'ON' : 'OFF'} (set LAB_HARDENING=1)`);
  console.log('='.repeat(60));
});
