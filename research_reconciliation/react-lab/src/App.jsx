import React, { useEffect, useState } from 'react';
import { installMonitor, onHit, clearHits } from './monitor.js';
import { isUsingTrustedTypes } from './fallback/policy.js';
import E1 from './vulns/E1_DangerouslySetInnerHTML.jsx';
import E2 from './vulns/E2_UrlAndStyle.jsx';
import E3 from './vulns/E3_PropSpread.jsx';
import E4 from './vulns/E4_SsrStateEmbedding.jsx';
import E5 from './vulns/E5_MarkdownAndProps.jsx';
import E6 from './vulns/E6_MutationXSS.jsx';
import Evaluation from './harness/Evaluation.jsx';

installMonitor();

export default function App() {
  const [fallbackOn, setFallbackOn] = useState(false);
  const [hits, setHits] = useState([]);
  const tt = isUsingTrustedTypes();

  useEffect(() => onHit((_hit, all) => setHits(all)), []);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="kicker">Track E &amp; F · runnable lab</div>
          <h1>React XSS Surface &amp; the In-Browser Fallback</h1>
        </div>
        <div className="controls">
          <label className={'toggle ' + (fallbackOn ? 'on' : 'off')}>
            <input type="checkbox" checked={fallbackOn} onChange={(e) => setFallbackOn(e.target.checked)} />
            <span>Fallback defense: <strong>{fallbackOn ? 'ON' : 'OFF'}</strong></span>
          </label>
          <div className="tt-badge">Trusted Types: <strong>{tt ? 'enforced-capable' : 'polyfill (this browser)'}</strong></div>
        </div>
      </header>

      <div className="monitor">
        <strong>Execution monitor</strong>: {hits.length} proof-of-execution hit{hits.length === 1 ? '' : 's'}
        {hits.length > 0 && <span className="hitlog"> — last: <code>{hits[hits.length - 1].tag}</code> @ {hits[hits.length - 1].at}</span>}
        <button className="clear" onClick={() => { clearHits(); setHits([]); }}>clear</button>
        <p className="note">Payloads call <code>window.__xss(tag)</code>/<code>alert()</code>; we capture instead of popping modals.
          Flip the toggle and re-trigger each card: with the fallback <strong>ON</strong>, the counter should stop rising.</p>
      </div>

      <main>
        <p className="intro">Each card is a Track E vulnerability. With the fallback <strong>OFF</strong> it executes
          (watch the monitor). With it <strong>ON</strong>, the same data is forced through the Track F chokepoint —
          a Trusted Types policy whose <code>createHTML</code> sanitizes to a serialization fixed point — before it can reach a sink.</p>
        <E1 fallbackOn={fallbackOn} />
        <E2 fallbackOn={fallbackOn} />
        <E3 fallbackOn={fallbackOn} />
        <E4 fallbackOn={fallbackOn} />
        <E5 fallbackOn={fallbackOn} />
        <E6 fallbackOn={fallbackOn} />
        <Evaluation />
      </main>

      <footer className="foot">
        Localhost research lab · harmless proofs only · see <code>../track_e_react_xss/</code> and <code>../track_f_fallback/</code> for the write-ups.
      </footer>
    </div>
  );
}
