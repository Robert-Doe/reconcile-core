// Mounts a small element tree (a function component rendering nested host
// elements, text, and a conditionally-absent child) and checks the
// resulting fiber tree's shape, tags, and dropped-falsy-child behavior
// against independently hand-computed expectations.
// Run from this folder: node verify.mjs
import { createElement } from '../module_01_elements/createElement.js';
import { mount, normalizeChildren } from './mount.js';
import { forEachFiber, FunctionComponent, HostComponent, HostText } from '../module_03_fiber_node/fiber.js';

function Card({ title, showFooter }) {
  return createElement('div', { className: 'card' },
    createElement('h1', null, title),
    'plain text child',
    showFooter && createElement('footer', null, 'footer text'),
  );
}

const element = createElement(Card, { title: 'Hello', showFooter: false });
const root = mount(element);

const tagName = { [FunctionComponent]: 'FunctionComponent', [HostComponent]: 'HostComponent', [HostText]: 'HostText' };
const trace = [];
forEachFiber(root, (f) => {
  const label = f.tag === HostText ? JSON.stringify(f.pendingProps) : (f.type?.name || f.type || '?');
  trace.push(`${tagName[f.tag]}(${label})`);
});

console.log('Mounted fiber tree, depth-first:');
trace.forEach((t, i) => console.log('  ' + i + ': ' + t));

const expected = [
  'FunctionComponent(Card)',
  'HostComponent(div)',
  'HostComponent(h1)',
  'HostText("Hello")',
  'HostText("plain text child")',
];
const matches = JSON.stringify(trace) === JSON.stringify(expected);
console.log('\nExpected:');
expected.forEach((t, i) => console.log('  ' + i + ': ' + t));
console.log('\nMatches expected (footer correctly dropped, since showFooter=false):', matches);

console.log('\n--- Structural spot-checks ---');
const cardFiber = root;
const divFiber = cardFiber.child;
console.log('root.tag === FunctionComponent:', root.tag === FunctionComponent);
console.log('root.child.tag === HostComponent (the div):', divFiber.tag === HostComponent);
console.log('div has exactly 2 children (h1 + text, footer dropped):',
  (() => { let n = 0, c = divFiber.child; while (c) { n++; c = c.sibling; } return n === 2; })());
console.log('div.child.child.pendingProps === "Hello" (h1 text):', divFiber.child.child.pendingProps === 'Hello');

console.log('\n--- normalizeChildren edge cases ---');
const norm1 = normalizeChildren([1, null, 'x', undefined, false, [true, 'y', null]]);
console.log('normalizeChildren([1,null,"x",undefined,false,[true,"y",null]]) →', JSON.stringify(norm1));
const norm1Ok = JSON.stringify(norm1) === JSON.stringify([1, 'x', 'y']);
console.log('drops null/undefined/boolean, flattens nested arrays:', norm1Ok);

const allPass = matches && divFiber.tag === HostComponent && norm1Ok;
console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
