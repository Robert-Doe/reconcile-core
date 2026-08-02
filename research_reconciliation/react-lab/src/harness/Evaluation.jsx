import React, { useMemo, useState } from 'react';
import { CORPUS } from '../corpus/payloads.js';
import { sanitizeToFixedPoint, containsSink } from '../fallback/sanitize.js';

/* Evaluation.jsx - the in-app differential harness (F6).
 * For each corpus payload, compute whether it "would execute" with the defense
 * OFF vs ON, and whether its sanitized form is idempotent under reparse. This is
 * the results table your thesis reports. */
function serialize(str) {
  const t = document.createElement('template');
  t.innerHTML = String(str);
  return t.innerHTML;
}
function idempotent(str) {
  const p1 = serialize(str);
  return p1 === serialize(p1);
}

function evaluate() {
  return CORPUS.map((p) => {
    const rawExecutes = containsSink(p.html);
    const defended = sanitizeToFixedPoint(p.html);
    const defendedExecutes = containsSink(defended);
    return {
      ...p,
      rawExecutes,
      defendedExecutes,
      idempotent: idempotent(defended),
      neutralized: rawExecutes && !defendedExecutes,
      benignPreserved: !rawExecutes && defended.length > 0,
    };
  });
}

export default function Evaluation() {
  const [rows] = useState(evaluate);
  const summary = useMemo(() => {
    const dangerous = rows.filter((r) => r.rawExecutes);
    const bypass = rows.filter((r) => r.defendedExecutes);
    const byTrack = {};
    for (const r of rows) {
      byTrack[r.track] = byTrack[r.track] || { total: 0, neutralized: 0 };
      byTrack[r.track].total++;
      if (!r.rawExecutes || r.neutralized) byTrack[r.track].neutralized++;
    }
    return { n: rows.length, dangerous: dangerous.length, bypass: bypass.length, byTrack };
  }, [rows]);

  return (
    <section className="panel">
      <h2>F6 - Differential evaluation over the corpus</h2>
      <div className="metrics">
        <div className="metric"><div className="v">{summary.n}</div><div className="l">payloads</div></div>
        <div className="metric"><div className="v">{summary.dangerous}</div><div className="l">execute (defense off)</div></div>
        <div className="metric"><div className="v" style={{ color: summary.bypass ? '#f87171' : '#4ade80' }}>{summary.bypass}</div><div className="l">bypass (defense on)</div></div>
        <div className="metric"><div className="v">{Object.keys(summary.byTrack).length}</div><div className="l">tracks covered</div></div>
      </div>

      <table className="eval">
        <thead><tr><th>id</th><th>track</th><th>sink</th><th>off</th><th>on</th><th>idempotent</th><th>verdict</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><code>{r.id}</code></td>
              <td>{r.track}</td>
              <td>{r.sink}</td>
              <td className={r.rawExecutes ? 'err' : 'ok'}>{r.rawExecutes ? 'executes' : 'inert'}</td>
              <td className={r.defendedExecutes ? 'err' : 'ok'}>{r.defendedExecutes ? 'EXECUTES' : 'inert'}</td>
              <td className={r.idempotent ? 'ok' : 'err'}>{String(r.idempotent)}</td>
              <td className={r.defendedExecutes ? 'err' : 'ok'}>{r.defendedExecutes ? 'BYPASS' : (r.neutralized ? 'neutralized' : 'benign')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">Coverage per track: {Object.entries(summary.byTrack).map(([t, s]) => `${t} ${s.neutralized}/${s.total}`).join(' · ')}.
        A sound defense drives "bypass (defense on)" to 0 while keeping benign rows present. This table is the F6 results section.</p>
    </section>
  );
}
