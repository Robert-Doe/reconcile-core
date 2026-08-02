/* sanitize.js - the mXSS-resistant sanitizer at the heart of the fallback (F3).
 *
 * Design goals:
 *   - ALLOWLIST tags/attributes (deny by default).
 *   - Neutralize URL attributes whose scheme isn't allowlisted (after decode).
 *   - Be IDEMPOTENT under re-serialization: sanitize to a FIXED POINT so the
 *     browser's re-parse (Track B6 / E6) cannot regrow a handler.
 *
 * Prefers the native Sanitizer API where available; otherwise a DOM-based
 * allowlist pass. (DOMPurify is a drop-in for sanitizeOnce - omitted here to
 * keep dependencies to react + vite; see README.)
 */

const ALLOWED_TAGS = new Set([
  'A', 'B', 'I', 'EM', 'STRONG', 'P', 'BR', 'UL', 'OL', 'LI', 'SPAN', 'DIV',
  'CODE', 'PRE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'IMG', 'HR', 'TABLE',
  'THEAD', 'TBODY', 'TR', 'TD', 'TH',
]);
const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'class', 'colspan', 'rowspan', 'width', 'height',
]);
const URL_ATTRS = new Set(['href', 'src']);
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

// Strip ASCII control chars and spaces used to obfuscate schemes
// (e.g. "jav\tascript:"). Written with unicode escapes to stay ASCII-only.
const STRIP_WS = /[\u0000-\u0020]+/g;

function schemeIsSafe(rawUrl) {
  const v = String(rawUrl).trim();
  // Relative URLs (no scheme) are allowed.
  if (v === '' || v.startsWith('/') || v.startsWith('#') || v.startsWith('?')) return true;
  const normalized = v.replace(STRIP_WS, '').toLowerCase();
  if (/^[a-z][a-z0-9+.-]*:/.test(normalized)) {
    return SAFE_SCHEMES.some((s) => normalized.startsWith(s));
  }
  return true; // no scheme detected -> treat as relative
}

// One sanitation pass over a string -> a cleaned string.
export function sanitizeOnce(input) {
  // Native Sanitizer API path (mutation-aware, where supported).
  try {
    if (typeof Element !== 'undefined' && typeof Element.prototype.setHTML === 'function') {
      const t = document.createElement('template');
      t.setHTML(String(input));       // browser's built-in safe defaults
      return dropDisallowed(t.content); // then apply our tighter allowlist
    }
  } catch (_) { /* fall through to DOM pass */ }

  const doc = new DOMParser().parseFromString(String(input), 'text/html');
  return dropDisallowed(doc.body);
}

function dropDisallowed(root) {
  root.querySelectorAll('*').forEach((el) => {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.remove();
      return;
    }
    [...el.attributes].forEach((a) => {
      const name = a.name.toLowerCase();
      if (name.startsWith('on') || !ALLOWED_ATTRS.has(name)) {
        el.removeAttribute(a.name);
        return;
      }
      if (URL_ATTRS.has(name) && !schemeIsSafe(a.value)) {
        el.removeAttribute(a.name);
      }
    });
  });
  const box = document.createElement('div');
  box.appendChild(root.cloneNode(true));
  return box.innerHTML;
}

/**
 * Sanitize to a serialization FIXED POINT (the mXSS defense, F3).
 * Returns the stabilized string, or '' if it does not converge (fail closed).
 */
export function sanitizeToFixedPoint(input, maxIterations = 5) {
  let cur = String(input);
  for (let i = 0; i < maxIterations; i++) {
    const next = sanitizeOnce(cur);
    if (next === cur) return cur; // stable: reparse cannot change it
    cur = next;
  }
  return ''; // did not converge -> refuse rather than ship a mutating string
}

/** Diagnostic: does `html`, once parsed, contain a live handler / <script> / js: URL? */
export function containsSink(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html);
  for (const el of t.content.querySelectorAll('*')) {
    if (el.tagName === 'SCRIPT') return true;
    for (const a of el.attributes) if (/^on/i.test(a.name)) return true;
    for (const attr of ['href', 'src']) {
      const v = (el.getAttribute(attr) || '').replace(STRIP_WS, '').toLowerCase();
      if (v.startsWith('javascript:')) return true;
    }
  }
  return false;
}
