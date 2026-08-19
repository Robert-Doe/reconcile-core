// Runs our createElement against real React's, on the same inputs, and
// diffs the fields that matter for reconciliation ($$typeof, type, key,
// ref, props). Run from this folder: node verify.mjs
import { createElement, isElement, REACT_ELEMENT_TYPE } from './createElement.js';

process.env.NODE_ENV = 'development';
const require = (await import('module')).createRequire(import.meta.url);
const RealReact = require('../../research_reconciliation/react-lab/node_modules/react');

function relevantFields(el) {
  return { $$typeof: el.$$typeof, type: el.type, key: el.key, ref: el.ref, props: el.props };
}

function check(label, ours, real) {
  const a = JSON.stringify(relevantFields(ours), (_, v) => (typeof v === 'symbol' ? v.toString() : v));
  const b = JSON.stringify(relevantFields(real), (_, v) => (typeof v === 'symbol' ? v.toString() : v));
  const same = a === b;
  console.log(`\n[${label}] match: ${same}`);
  console.log('  ours:', a);
  console.log('  real:', b);
  if (!same) process.exitCode = 1;
}

// Case 1: no props, no children.
check(
  'div, no props, no children',
  createElement('div', null),
  RealReact.createElement('div', null)
);

// Case 2: props + single text child.
check(
  'span, className + one text child',
  createElement('span', { className: 'x' }, 'hi'),
  RealReact.createElement('span', { className: 'x' }, 'hi')
);

// Case 3: multiple children -> array.
check(
  'ul, three li children',
  createElement('ul', null, 'a', 'b', 'c'),
  RealReact.createElement('ul', null, 'a', 'b', 'c')
);

// Case 4: key + ref extraction, not leaking into props.
const refObj = { current: null };
check(
  'li with key and ref, must not appear in props',
  createElement('li', { key: 'row-1', ref: refObj, 'data-x': 1 }),
  RealReact.createElement('li', { key: 'row-1', ref: refObj, 'data-x': 1 })
);

// Case 5: defaultProps backfill.
function Widget() {}
Widget.defaultProps = { color: 'blue', size: 10 };
check(
  'Widget with defaultProps, one overridden',
  createElement(Widget, { size: 99 }),
  RealReact.createElement(Widget, { size: 99 })
);

// Case 6: nested element as a child — proves the "virtual DOM" is just
// plain objects nested inside other plain objects' props.children.
const inner = createElement('b', null, 'bold');
const outer = createElement('p', null, 'text before ', inner, ' text after');
console.log('\n[nested] outer.props.children[1] === inner:', outer.props.children[1] === inner);
console.log('[nested] isElement(inner):', isElement(inner));
console.log('[nested] isElement("plain string"):', isElement('plain string'));
console.log('[nested] typeof REACT_ELEMENT_TYPE:', typeof REACT_ELEMENT_TYPE, REACT_ELEMENT_TYPE.toString());

console.log('\nAll checks ' + (process.exitCode ? 'FAILED (see above)' : 'PASSED') + '.');
