import React, { useState } from 'react';
import Demo, { Field } from './Demo.jsx';
import { safeHtmlProp } from '../fallback/policy.js';
import { sanitizeOnce, sanitizeToFixedPoint, containsSink } from '../fallback/sanitize.js';

/* E6 - mXSS meets React. Even sanitized HTML, once assigned to innerHTML by the
   host config, is RE-PARSED. If the sanitizer output is not a serialization
   fixed point, the reparse can regrow a handler. This card shows the difference
   between a single-pass sanitize (may still mutate) and a fixed-point sanitize
   (stable), and confirms the rendered result is inert. */
export default function E6({ fallbackOn }) {
  const [html, setHtml] = useState('<noscript><p title="</noscript><img src=x onerror=window.__xss(\'E6\')>">');

  const once = sanitizeOnce(html);
  const fixed = sanitizeToFixedPoint(html);
  const onceRegrows = containsSink(once);      // single pass may still be dangerous on reparse
  const fixedRegrows = containsSink(fixed);    // fixed point should be inert

  return (
    <Demo id="E6" title="mXSS inside dangerouslySetInnerHTML" sink="HTML(mXSS)"
      explain="Sanitize-then-React is necessary but not sufficient: a single-pass sanitize can leave a string that MUTATES on the host config's reparse. The fallback sanitizes to a fixed point, which is stable under reparse.">
      <Field label="Untrusted HTML (mXSS seed)" value={html} onChange={setHtml} />
      <div className="render-box">
        {/* When fallback ON, safeHtmlProp -> policy -> sanitizeToFixedPoint. */}
        <div dangerouslySetInnerHTML={safeHtmlProp(html, fallbackOn)} />
      </div>
      <table className="mini">
        <tbody>
          <tr><td>single-pass sanitize</td><td><code className="small">{once || '(empty)'}</code></td>
            <td className={onceRegrows ? 'err' : 'ok'}>{onceRegrows ? 'sink survives reparse' : 'inert'}</td></tr>
          <tr><td>fixed-point sanitize</td><td><code className="small">{fixed || '(refused / empty)'}</code></td>
            <td className={fixedRegrows ? 'err' : 'ok'}>{fixedRegrows ? 'sink survives reparse' : 'inert'}</td></tr>
        </tbody>
      </table>
      <pre className="src">{'// necessary AND sufficient: sanitize to a serialization fixed point'}</pre>
    </Demo>
  );
}
