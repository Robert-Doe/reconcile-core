import React, { useState } from 'react';
import Demo, { Field } from './Demo.jsx';
import { safeHtmlProp } from '../fallback/policy.js';

// Fallback: only allow a small set of safe props to be spread onto a host element.
const SAFE_KEYS = new Set(['className', 'title', 'id', 'role', 'children']);
function filterProps(obj) {
  const out = {};
  for (const k of Object.keys(obj || {})) if (SAFE_KEYS.has(k)) out[k] = obj[k];
  return out;
}

/* E3 - spreading an untrusted object onto a host element. If it carries
   dangerouslySetInnerHTML (or an attribute-routed handler), the spread injects
   the sink. Never spread untrusted objects onto DOM elements. */
export default function E3({ fallbackOn }) {
  const [json, setJson] = useState('{"title":"hi","dangerouslySetInnerHTML":{"__html":"<img src=x onerror=window.__xss(\'E3\')>"}}');
  let parsed = {};
  let error = '';
  try { parsed = JSON.parse(json); } catch (e) { error = e.message; }

  // With fallback ON: filter to safe keys. If dangerouslySetInnerHTML survives
  // (it won't, once filtered), it would still pass through the policy.
  let props = fallbackOn ? filterProps(parsed) : parsed;
  if (props && props.dangerouslySetInnerHTML && props.dangerouslySetInnerHTML.__html != null) {
    props = { ...props, dangerouslySetInnerHTML: safeHtmlProp(props.dangerouslySetInnerHTML.__html, fallbackOn) };
  }

  return (
    <Demo id="E3" title="Prop spreading {...untrusted}" sink="HTML"
      explain="ON: untrusted keys are filtered to a safe allowlist before spreading, and any surviving __html still passes the policy. OFF: the spread injects whatever keys the attacker put in the object.">
      <Field label="Untrusted props (JSON)" value={json} onChange={setJson} />
      {error && <p className="err">JSON error: {error}</p>}
      <div className="render-box">
        <div {...props} />
      </div>
      <pre className="src">{'<div {...JSON.parse(untrusted)} />   // spreads attacker keys'}</pre>
    </Demo>
  );
}
