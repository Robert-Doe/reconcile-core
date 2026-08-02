// Four scenarios: no change, append, remove-from-middle, and a "move
// first-to-last" reorder — the last one produces a famous, counter-
// intuitive result: real (and, verified here, this course's) React flags
// EVERY OTHER item as moved, not just the one that logically moved.
// Run from this folder: node verify.mjs
import { createElement } from '../module_01_elements/createElement.js';
import { createFiber, appendChild, forEachFiber, HostComponent } from '../module_03_fiber_node/fiber.js';
import { reconcileChildrenArray, Placement } from './keyedDiff.js';

function buildOldChain(parent, keys) {
  let prev = null;
  const fibers = {};
  keys.forEach((k, i) => {
    const f = createFiber(HostComponent, k, {});
    f.type = 'li';
    f.index = i;
    fibers[k] = f;
    if (prev === null) parent.child = f; else prev.sibling = f;
    f.return = parent;
    prev = f;
  });
  return fibers;
}

function elementsFor(keys) {
  return keys.map((k) => createElement('li', { key: k }, k));
}

function movedKeys(firstNewFiber) {
  const moved = [];
  let f = firstNewFiber;
  while (f !== null) {
    if (f.flags & Placement) moved.push(f.key);
    f = f.sibling;
  }
  return moved;
}
function chainKeys(firstNewFiber) {
  const out = [];
  let f = firstNewFiber;
  while (f !== null) { out.push(f.key); f = f.sibling; }
  return out;
}

let allPass = true;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${label}: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)} → ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) allPass = false;
}

console.log('=== Scenario 1: no change (same keys, same order) ===');
{
  const parent = createFiber(HostComponent, null, {});
  buildOldChain(parent, ['A', 'B', 'C']);
  const oldFirst = parent.child;
  const result = reconcileChildrenArray(parent, oldFirst, elementsFor(['A', 'B', 'C']));
  check('order', chainKeys(result), ['A', 'B', 'C']);
  check('moved (should be none)', movedKeys(result), []);
  check('deletions (should be none)', parent.deletions, null);
}

console.log('\n=== Scenario 2: append C ===');
{
  const parent = createFiber(HostComponent, null, {});
  buildOldChain(parent, ['A', 'B']);
  const oldFirst = parent.child;
  const result = reconcileChildrenArray(parent, oldFirst, elementsFor(['A', 'B', 'C']));
  check('order', chainKeys(result), ['A', 'B', 'C']);
  check('moved (only the new C is a Placement — an insertion)', movedKeys(result), ['C']);
  check('deletions (none)', parent.deletions, null);
}

console.log('\n=== Scenario 3: remove middle (B) ===');
{
  const parent = createFiber(HostComponent, null, {});
  buildOldChain(parent, ['A', 'B', 'C']);
  const oldFirst = parent.child;
  const result = reconcileChildrenArray(parent, oldFirst, elementsFor(['A', 'C']));
  check('order', chainKeys(result), ['A', 'C']);
  check('moved (removing a middle item moves nothing)', movedKeys(result), []);
  const deletedKeys = (parent.deletions || []).map((f) => f.key);
  check('deletions', deletedKeys, ['B']);
}

console.log('\n=== Scenario 4: move last item (C) to the front — the famous case ===');
{
  const parent = createFiber(HostComponent, null, {});
  buildOldChain(parent, ['A', 'B', 'C']);
  const oldFirst = parent.child;
  const result = reconcileChildrenArray(parent, oldFirst, elementsFor(['C', 'A', 'B']));
  check('order', chainKeys(result), ['C', 'A', 'B']);
  check('moved — C (the one that ACTUALLY moved) is NOT flagged; A and B ARE', movedKeys(result), ['A', 'B']);
  check('deletions (none — everything reused)', parent.deletions, null);
}

console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
