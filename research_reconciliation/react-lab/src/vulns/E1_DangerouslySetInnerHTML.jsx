import React, { useState } from 'react';
import Demo, { Field } from './Demo.jsx';
import { safeHtmlProp } from '../fallback/policy.js';

/* E1 - the primary sink. `dangerouslySetInnerHTML` routes straight to
   node.innerHTML in the host config, bypassing all of React's escaping. */
export default function E1({ fallbackOn }) {
  const [html, setHtml] = useState("<img src=x onerror=\"window.__xss('E1')\"> comment");
  return (
    <Demo id="E1" title="dangerouslySetInnerHTML" sink="HTML"
      explain="With the fallback ON, the same string is sanitized to a fixed point (and typed as TrustedHTML where available) before it reaches innerHTML - the img/onerror is stripped, but benign markup survives.">
      <Field label="Untrusted HTML" value={html} onChange={setHtml} />
      <div className="render-box">
        {/* THE SINK. safeHtmlProp returns the raw __html when fallback is OFF. */}
        <div dangerouslySetInnerHTML={safeHtmlProp(html, fallbackOn)} />
      </div>
      <pre className="src">{'<div dangerouslySetInnerHTML={{ __html: userHtml }} />'}</pre>
    </Demo>
  );
}
