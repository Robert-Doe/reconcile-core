import React, { useState } from 'react';
import Demo, { Field } from './Demo.jsx';
import { safeHtmlProp } from '../fallback/policy.js';

/* E5 - ecosystem sinks. A naive markdown renderer emits raw HTML which is then
   fed to dangerouslySetInnerHTML. The app's own code is "fine" - the dependency
   opens the hole. This is the most common real-world React XSS shape. */

// A deliberately-naive markdown -> HTML (emits raw HTML, does not sanitize).
function naiveMarkdown(md) {
  return String(md)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '<img alt="$1" src="$2">') // src is attacker-influenced
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>');
}

export default function E5({ fallbackOn }) {
  const [md, setMd] = useState('Nice **post**! ![pic](x" onerror="window.__xss(\'E5\'))');
  const rendered = naiveMarkdown(md);
  return (
    <Demo id="E5" title="Markdown / component raw-HTML prop" sink="HTML"
      explain="ON: the markdown renderer's raw HTML output is sanitized to a fixed point before hitting the sink. Sanitize the RENDERED HTML, not the markdown source - the renderer is where injection is introduced.">
      <Field label="Markdown source" value={md} onChange={setMd} />
      <div className="render-box">
        <div dangerouslySetInnerHTML={safeHtmlProp(rendered, fallbackOn)} />
      </div>
      <pre className="src small">{'renderer output: ' + rendered}</pre>
      <pre className="src">{'<div dangerouslySetInnerHTML={{ __html: marked(userMarkdown) }} />'}</pre>
    </Demo>
  );
}
