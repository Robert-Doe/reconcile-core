import React, { useState } from 'react';
import Demo, { Field } from './Demo.jsx';

/* E4 - SSR state embedding. Frameworks serialize state into an inline <script>
   for hydration. That JSON is raw text inside <script>, NOT a React-escaped
   context, so a value containing </script> breaks out. The fix is to escape
   </, <!--, and the JS line separators (U+2028/U+2029) when serializing. */

// UNSAFE: naive JSON.stringify placed directly into <script>.
function unsafeEmbed(state) {
  return '<script>window.__STATE__ = ' + JSON.stringify(state) + '</script>';
}
// SAFE: escape the characters that are dangerous inside <script> / as JS.
function safeEmbed(state) {
  const json = JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return '<script>window.__STATE__ = ' + json + '</script>';
}

function breaksOut(embedded) {
  // Does the serialized <script> contain a premature </script>?
  const inner = embedded.replace(/^<script>/, '').replace(/<\/script>$/, '');
  return /<\/script/i.test(inner);
}

export default function E4({ fallbackOn }) {
  const [bio, setBio] = useState("</script><script>window.__xss('E4')</script>");
  const state = { user: 'victim', bio };
  const embedded = fallbackOn ? safeEmbed(state) : unsafeEmbed(state);
  const broken = breaksOut(embedded);

  return (
    <Demo id="E4" title="SSR state embedding (__INITIAL_STATE__ / __NEXT_DATA__)" sink="HTML"
      explain="ON: < > & and U+2028/2029 are unicode-escaped inside the JSON, so no premature </script> can break out. This is OUTSIDE React's element escaping - it's the serializer's job.">
      <Field label="Untrusted state field (bio)" value={bio} onChange={setBio} />
      <div className="render-box">
        <div className={broken ? 'err' : 'ok'}>
          {broken ? 'BREAKOUT: a premature </script> escapes the state block' : 'safe: no premature </script>'}
        </div>
        <pre className="src small">{embedded}</pre>
      </div>
      <pre className="src">{'<script>window.__STATE__ = JSON.stringify(state)</script>  // breakout if unescaped'}</pre>
    </Demo>
  );
}
