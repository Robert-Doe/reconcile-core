/* payloads.js - the React-facing evaluation corpus (F6).
 * Tagged by the Track E sub-module and the Track A5 sink class. Used by the
 * in-app Evaluation panel and by `npm run evaluate`.
 */
export const CORPUS = [
  // E1 - dangerouslySetInnerHTML
  { id: 'E1-a', track: 'E1', sink: 'HTML', html: '<img src=x onerror="window.__xss(\'E1-a\')">', note: 'classic img onerror' },
  { id: 'E1-b', track: 'E1', sink: 'HTML', html: '<svg onload="window.__xss(\'E1-b\')"></svg>', note: 'svg onload' },
  { id: 'E1-c', track: 'E1', sink: 'HTML', html: '<b>bold</b> <i>ok</i>', note: 'benign - must survive as markup' },

  // E2 - URL / style
  { id: 'E2-a', track: 'E2', sink: 'URL', html: '<a href="javascript:window.__xss(\'E2-a\')">click</a>', note: 'javascript: href' },
  { id: 'E2-b', track: 'E2', sink: 'URL', html: '<a href="jav&#x09;ascript:window.__xss(\'E2-b\')">t</a>', note: 'tab-obfuscated scheme' },
  { id: 'E2-c', track: 'E2', sink: 'URL', html: '<a href="https://example.com">ok</a>', note: 'benign https' },

  // E3 - prop spread (shape only; the component decides)
  { id: 'E3-a', track: 'E3', sink: 'HTML', html: '<div data-x="1" onmouseover="window.__xss(\'E3-a\')">hover</div>', note: 'handler via spread/attr' },

  // E4 - SSR JSON-in-<script> breakout (string form)
  { id: 'E4-a', track: 'E4', sink: 'HTML', html: '</script><script>window.__xss(\'E4-a\')</script>', note: 'script breakout' },

  // E5 - markdown/raw HTML
  { id: 'E5-a', track: 'E5', sink: 'HTML', html: '![x](x" onerror="window.__xss(\'E5-a\'))', note: 'markdown img title breakout (post-render HTML)' },
  { id: 'E5-b', track: 'E5', sink: 'HTML', html: '<p>Legit <strong>markdown</strong>.</p>', note: 'benign markdown output' },

  // E6 - mXSS (non-idempotent under reparse)
  { id: 'E6-a', track: 'E6', sink: 'HTML(mXSS)', html: '<noscript><p title="</noscript><img src=x onerror=window.__xss(\'E6-a\')>">', note: 'noscript mXSS' },
  { id: 'E6-b', track: 'E6', sink: 'HTML(mXSS)', html: '<table><td><style></style><img src=x onerror=window.__xss(\'E6-b\')></table>', note: 'foster-parent mXSS' },
  { id: 'E6-c', track: 'E6', sink: 'HTML(mXSS)', html: '<form><math><mtext></form><form><mglyph><style></math><img src onerror=window.__xss(\'E6-c\')>', note: 'mglyph mXSS' },
];

// Group helper for reports.
export function byTrack(corpus = CORPUS) {
  const m = new Map();
  for (const p of corpus) {
    if (!m.has(p.track)) m.set(p.track, []);
    m.get(p.track).push(p);
  }
  return m;
}
