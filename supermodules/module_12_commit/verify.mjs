// Two proofs: (1) mounting a real element tree produces real DOM nodes,
// correctly nested and attached, via commitRoot; (2) updating a single
// text fiber mutates the ALREADY-ATTACHED real node in place — no new
// insertion, no replacement — proven by object identity, not just by the
// text changing.
// Run from this folder: node verify.mjs
import { createElement } from '../module_01_elements/createElement.js';
import { mount } from '../module_04_mount/mount.js';
import { createFiber, forEachFiber, HostRoot, HostText } from '../module_03_fiber_node/fiber.js';
import { createWorkInProgress } from '../module_05_double_buffer/doubleBuffer.js';
import { Placement } from '../module_11_effect_list/effectList.js';
import { commitRoot, completeDomWork } from './commit.js';
import { fakeDocument, serialize } from './fakeDom.mjs';

let allPass = true;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${label}: ${ok ? 'PASS' : 'FAIL (actual=' + JSON.stringify(actual) + ')'}`);
  if (!ok) allPass = false;
}

console.log('=== Proof 1: mounting produces real, correctly-nested DOM ===');
function Card({ title }) {
  return createElement('div', { className: 'card' },
    createElement('h1', null, title),
    'plain text child',
  );
}
const element = createElement(Card, { title: 'Hello' });
const cardFiber = mount(element); // Module 04's recursive mount — no flags set yet
cardFiber.flags |= Placement; // only the OUTERMOST new fiber needs this — see tutorial

const container = fakeDocument.createElement('div'); // stands in for the real page's root container
const hostRoot = createFiber(HostRoot, null, {});
hostRoot.stateNode = { containerInfo: container }; // matches real FiberRootNode shape
hostRoot.child = cardFiber;
cardFiber.return = hostRoot;

commitRoot(hostRoot, fakeDocument);

const html = serialize(container);
console.log('Resulting real (fake) DOM, serialized:', html);
check('mounted DOM matches expected structure', html, '<div><div class="card"><h1>Hello</h1>plain text child</div></div>');

console.log('\n=== Proof 2: updating mutates the ALREADY-ATTACHED node in place ===');
// Find the committed text fiber for "Hello" by walking the real tree.
let currentTextFiber = null;
forEachFiber(hostRoot, (f) => { if (f.tag === HostText && f.pendingProps === 'Hello') currentTextFiber = f; });
const attachedNode = currentTextFiber.stateNode;
console.log('attachedNode.textContent before update:', attachedNode.textContent);

const wipTextFiber = createWorkInProgress(currentTextFiber, 'Hi there');
completeDomWork(wipTextFiber, fakeDocument);

console.log('attachedNode.textContent after update:', attachedNode.textContent);
check('the REAL node object was mutated (not replaced)', wipTextFiber.stateNode === attachedNode, true);
check('its textContent actually changed', attachedNode.textContent, 'Hi there');
check('the DOM, re-serialized, reflects the update with no other change', serialize(container),
  '<div><div class="card"><h1>Hi there</h1>plain text child</div></div>');

console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
