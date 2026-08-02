/* monitor.js - a safe execution monitor.
 *
 * Payloads in this lab call window.__xss(tag) (and, for realism, alert()) to
 * "prove" execution. Instead of popping modals, we capture those calls so the
 * UI can show a live count and log. This is the in-app equivalent of the
 * Module 11 callback console: proof-of-execution without the noise or danger.
 */
const listeners = new Set();
const hits = [];

export function installMonitor() {
  if (window.__xss) return; // already installed
  window.__xss = (tag) => {
    const hit = { tag: String(tag || '(anon)'), at: new Date().toLocaleTimeString() };
    hits.push(hit);
    listeners.forEach((fn) => fn(hit, hits.slice()));
    return true;
  };
  // Route alert()/print() through the monitor too, so alert(1)-style payloads
  // are captured rather than blocking the page.
  const tag = () => window.__xss('alert');
  window.alert = tag;
  window.print = tag;
  window.confirm = () => { tag(); return false; };
  window.prompt = () => { tag(); return null; };
}

export function onHit(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getHits() { return hits.slice(); }
export function clearHits() { hits.length = 0; listeners.forEach((fn) => fn(null, [])); }
