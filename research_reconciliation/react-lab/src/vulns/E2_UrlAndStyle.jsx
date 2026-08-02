import React, { useState } from 'react';
import Demo, { Field } from './Demo.jsx';

// Scheme allowlist applied to a decoded URL (the fallback for URL props).
function safeUrl(raw) {
  const v = String(raw).trim();
  if (v === '' || v.startsWith('/') || v.startsWith('#') || v.startsWith('?')) return v;
  const normalized = v.replace(/\s+/g, '').toLowerCase();
  const ok = ['http:', 'https:', 'mailto:', 'tel:'].some((s) => normalized.startsWith(s));
  return ok ? v : '#blocked';
}

/* E2 - auto-escaping doesn't understand URL semantics. A javascript: URL has no
   HTML metacharacters to escape, so JSX's escaping is irrelevant here. */
export default function E2({ fallbackOn }) {
  const [url, setUrl] = useState("javascript:window.__xss('E2')");
  const [css, setCss] = useState("background:url(javascript:0);color:red");
  const href = fallbackOn ? safeUrl(url) : url;

  return (
    <Demo id="E2" title="URL & style props (javascript:, CSS)" sink="URL"
      explain="ON: the URL passes a scheme allowlist AFTER decoding (defeats tab/entity obfuscation); the inline style string is dropped in favor of a vetted object. JSX text/attribute escaping never covered these.">
      <Field label="Link URL" value={url} onChange={setUrl} />
      <div className="render-box">
        {/* click to test; with fallback OFF a javascript: URL executes on click */}
        <a href={href} onClick={(e) => { if (href.startsWith('#')) e.preventDefault(); }}>
          the link (click it)
        </a>
      </div>
      <Field label="Inline style string" value={css} onChange={setCss} />
      <div className="render-box">
        {/* Passing a raw string to style is not valid React, but libraries do
            build style strings; we show the safe pattern: a vetted object. */}
        <div style={fallbackOn ? { color: 'inherit' } : undefined}
             data-note="style-string injection is a CSS-exfil vector">styled sample</div>
      </div>
      <pre className="src">{'<a href={userUrl} />   // javascript: executes unless scheme-checked'}</pre>
    </Demo>
  );
}
