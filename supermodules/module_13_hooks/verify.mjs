// Three proofs: hooks build a real linked list on the fiber in call
// order; state persists correctly across a real double-buffered update
// (via Module 05's createWorkInProgress, not a toy substitute); and
// calling hooks conditionally produces the exact real failure real React
// throws for — not a hypothetical, an actually-thrown error.
// Run from this folder: node verify.mjs
import { createFiber, FunctionComponent } from '../module_03_fiber_node/fiber.js';
import { createWorkInProgress } from '../module_05_double_buffer/doubleBuffer.js';
import { prepareToUseHooks, finishHooks, useState } from './hooks.js';

let allPass = true;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${label}: ${ok ? 'PASS' : 'FAIL (actual=' + JSON.stringify(actual) + ')'}`);
  if (!ok) allPass = false;
}

console.log('=== Proof 1: mount builds a real linked list, in call order ===');
const fiberA = createFiber(FunctionComponent, null, {});
let setCountA, setLabelA;
prepareToUseHooks(fiberA);
const [count0] = (() => { const [c, setC] = useState(0); setCountA = setC; return [c]; })();
const [label0] = (() => { const [l, setL] = useState('clicks'); setLabelA = setL; return [l]; })();
finishHooks();

check('count0 === 0', count0, 0);
check('label0 === "clicks"', label0, 'clicks');
check('fiberA.memoizedState is hook #1 (count)', fiberA.memoizedState.memoizedState, 0);
check('fiberA.memoizedState.next is hook #2 (label)', fiberA.memoizedState.next.memoizedState, 'clicks');
check('fiberA.memoizedState.next.next is null (exactly 2 hooks)', fiberA.memoizedState.next.next, null);

console.log('\n=== Proof 2: state survives a REAL double-buffered update ===');
setCountA(5);           // queue an update via the closure captured above
setCountA((c) => c + 1); // queue a second, functional update

const fiberB = createWorkInProgress(fiberA, {}); // Module 05 — a real second buffer
let count1, label1, setCountB;
prepareToUseHooks(fiberB);
[count1] = (() => { const [c, setC] = useState(0); setCountB = setC; return [c]; })();
[label1] = (() => { const [l] = useState('clicks'); return [l]; })();
finishHooks();

check('count1 reflects BOTH queued updates: 0 -> 5 -> 6', count1, 6);
check('label1 unaffected: still "clicks"', label1, 'clicks');
check('fiberB.memoizedState !== fiberA.memoizedState (a new hook list, not the same object)',
  fiberB.memoizedState !== fiberA.memoizedState, true);
check('fiberA.memoizedState still reads 0 (untouched — Module 05\'s guarantee, one module later)',
  fiberA.memoizedState.memoizedState, 0);

console.log('\n=== Proof 3: a conditionally-skipped hook derails the NEXT render, not this one ===');
// Step 1: a normal mount with two hooks.
const mountFiber = createFiber(FunctionComponent, null, {});
prepareToUseHooks(mountFiber);
useState(1);
useState(2);
finishHooks();
check('mountFiber has 2 hooks', [mountFiber.memoizedState.memoizedState, mountFiber.memoizedState.next.memoizedState], [1, 2]);

// Step 2: an update that SKIPS the second hook — e.g. `if (cond) useState(2)`
// where `cond` happened to be false this render. This does NOT throw.
const skippedFiber = createWorkInProgress(mountFiber, {});
prepareToUseHooks(skippedFiber);
useState(1); // only ONE hook called this render
finishHooks();
check('skippedFiber ends up with only 1 hook in its list (not an error, yet)',
  skippedFiber.memoizedState.next, null);

// Step 3: the NEXT render tries to call a second hook again — and THIS is
// where it breaks, because skippedFiber's hook list (what THIS render's
// "previous" list is) only has 1 entry.
const nextFiber = createWorkInProgress(skippedFiber, {});
let threw = null;
prepareToUseHooks(nextFiber);
try {
  useState(1); // fine — position 1 exists
  useState(2); // ← throws: position 2 doesn't exist in skippedFiber's list
} catch (e) {
  threw = e.message;
} finally {
  finishHooks();
}
console.log('Error thrown on the render AFTER the skip:', threw);
check('matches real React\'s actual error message', threw, 'Rendered more hooks than during the previous render.');

console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
