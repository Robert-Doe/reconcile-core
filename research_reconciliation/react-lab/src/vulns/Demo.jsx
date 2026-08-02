import React from 'react';

/* Demo.jsx - shared layout for each Track E vulnerability card. */
export default function Demo({ id, title, sink, children, explain }) {
  return (
    <section className="demo" id={id}>
      <div className="demo-head">
        <span className="demo-id">{id}</span>
        <h3>{title}</h3>
        <span className={'sink sink-' + (sink || 'html').toLowerCase()}>{sink} sink</span>
      </div>
      <div className="demo-body">{children}</div>
      {explain && <p className="demo-explain">{explain}</p>}
    </section>
  );
}

export function Field({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
    </label>
  );
}
