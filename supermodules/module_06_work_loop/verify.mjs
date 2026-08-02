// Proves the explicit work loop produces an IDENTICAL fiber tree to Module
// 04's recursive mount(), for the exact same input — the promised
// equivalence from Module 04's "What's Next" section — by tracing both
// with Module 03's unmodified forEachFiber and diffing the traces.
// Run from this folder: node verify.mjs
import { createElement } from '../module_01_elements/createElement.js';
import { mount } from '../module_04_mount/mount.js';
import { workLoopSync, beginWork, completeUnitOfWork, performUnitOfWork } from './workLoop.js';
import { createFiber, appendChild, forEachFiber, FunctionComponent, HostComponent, HostText } from '../module_03_fiber_node/fiber.js';
import { isElement } from '../module_02_jsx_desugar/jsx.js';

function Card({ title, showFooter }) {
  return createElement('div', { className: 'card' },
    createElement('h1', null, title),
    'plain text child',
    showFooter && createElement('footer', null, 'footer text'),
  );
}

function trace(root) {
  const tagName = { [FunctionComponent]: 'FunctionComponent', [HostComponent]: 'HostComponent', [HostText]: 'HostText' };
  const out = [];
  forEachFiber(root, (f) => {
    const label = f.tag === HostText ? JSON.stringify(f.pendingProps) : (f.type?.name || f.type || '?');
    out.push(`${tagName[f.tag]}(${label})`);
  });
  return out;
}

// --- Path A: Module 04's recursive mount() ---
const elementA = createElement(Card, { title: 'Hello', showFooter: false });
const rootA = mount(elementA);
const traceA = trace(rootA);

// --- Path B: this module's explicit work loop, starting from a bare fiber ---
const elementB = createElement(Card, { title: 'Hello', showFooter: false });
function makeRootFiber(element) {
  const tag = typeof element.type === 'function' ? FunctionComponent : HostComponent;
  const fiber = createFiber(tag, element.key, element.props);
  fiber.type = element.type;
  return fiber;
}
const rootB = makeRootFiber(elementB);
workLoopSync(rootB);
const traceB = trace(rootB);

console.log('Path A (recursive mount):', traceA.join(' → '));
console.log('Path B (explicit loop):  ', traceB.join(' → '));
const equivalent = JSON.stringify(traceA) === JSON.stringify(traceB);
console.log('\nIdentical traversal order and tags:', equivalent);

// --- Step-by-step trace of the loop itself, to show it really does go
// one level at a time (never recursing) ---
console.log('\n--- Manual single-step trace (proves no recursion happens) ---');
const elementC = createElement(Card, { title: 'Hi', showFooter: true });
const rootC = makeRootFiber(elementC);
let cursor = rootC;
let steps = 0;
const stepLabels = [];
while (cursor !== null) {
  const label = cursor.tag === HostText ? JSON.stringify(cursor.pendingProps) : (cursor.type?.name || cursor.type);
  stepLabels.push(label);
  cursor = performUnitOfWork(cursor);
  steps++;
  if (steps > 20) { console.log('RUNAWAY LOOP — aborting'); break; }
}
console.log('Fibers visited, one performUnitOfWork() call each, in order:');
stepLabels.forEach((l, i) => console.log('  step ' + i + ': ' + l));
console.log('Total steps:', steps);
// Card, div, h1, "Hi", "plain text child", footer, "footer text" = 7
const stepsOk = steps === 7;
console.log('Exactly 7 steps for 7 fibers (showFooter=true this time):', stepsOk);

const allPass = equivalent && stepsOk;
console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
