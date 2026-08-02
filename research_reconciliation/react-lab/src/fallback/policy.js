/* policy.js - the Trusted Types policy + the React-facing chokepoint (F2/F3).
 *
 * getHtmlPolicy(): creates (once) a Trusted Types policy named 'app#html' whose
 * createHTML runs sanitizeToFixedPoint. Where Trusted Types is unavailable
 * (non-Chromium - the "fallback" case), it returns a shim object with the same
 * createHTML method returning a plain (sanitized) string.
 *
 * safeHtmlProp(html, fallbackOn): returns the object you spread into
 * `dangerouslySetInnerHTML`. With fallback OFF it's the RAW string (vulnerable,
 * for A/B). With fallback ON it's the policy-produced value (TrustedHTML where
 * available), i.e. sanitized to a fixed point. This models "wire React's
 * dangerous path through the policy" without patching react-dom internals.
 */
import { sanitizeToFixedPoint } from './sanitize.js';

let _policy = null;
let _usingTrustedTypes = false;

export function getHtmlPolicy() {
  if (_policy) return _policy;
  if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      _policy = window.trustedTypes.createPolicy('app#html', {
        createHTML: (s) => sanitizeToFixedPoint(s),
        createScriptURL: (u) => u,     // (allowlist in a real deployment)
        createScript: () => { throw new Error('app#html: dynamic script forbidden'); },
      });
      _usingTrustedTypes = true;
      return _policy;
    } catch (_) {
      // A policy named 'app#html' may already exist (HMR) - fall through.
    }
  }
  // Fallback shim for non-Chromium / no Trusted Types.
  _policy = { createHTML: (s) => sanitizeToFixedPoint(s) };
  _usingTrustedTypes = false;
  return _policy;
}

export function isUsingTrustedTypes() {
  getHtmlPolicy();
  return _usingTrustedTypes;
}

/**
 * The single helper every "dangerous" render site uses.
 * @param {string} html   untrusted HTML
 * @param {boolean} fallbackOn  toggle the defense
 */
export function safeHtmlProp(html, fallbackOn) {
  if (!fallbackOn) {
    return { __html: html }; // RAW - vulnerable baseline for A/B
  }
  const trusted = getHtmlPolicy().createHTML(html); // sanitized-to-fixed-point (TrustedHTML where available)
  return { __html: trusted };
}
