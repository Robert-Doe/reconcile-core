// Two proofs, kept deliberately separate:
//   1. CORRECTNESS (deterministic, zero timing dependence): a mock
//      call-counted shouldYield forces a pause partway through a tree,
//      and resuming produces the exact same final tree as an unyielded run.
//   2. REAL YIELDING (uses actual setTimeout, a real macrotask): a
//      competing task queued before rendering starts is proven to run
//      BEFORE our rendering completes — meaning control genuinely returned
//      to the event loop mid-render, not just "the loop stopped."
// Run from this folder: node verify.mjs
import { createElement } from '../module_01_elements/createElement.js';
import { mount } from '../module_04_mount/mount.js';
import { workLoopSync } from '../module_06_work_loop/workLoop.js';
import { workLoopConcurrent, renderRootConcurrent, makeDeadlineShouldYield } from './yielding.js';
import { createFiber, forEachFiber, FunctionComponent, HostComponent } from '../module_03_fiber_node/fiber.js';

function tagName(f) {
  return f.tag === FunctionComponent ? 'Fn' : f.tag === HostComponent ? 'Host' : 'Text';
}
function trace(root) {
  const out = [];
  forEachFiber(root, (f) => out.push(tagName(f) + '(' + (f.type?.name || f.type || f.pendingProps) + ')'));
  return out;
}

// A linear chain of 12 nested single-child function components, so there
// are plenty of units of work to split across chunks.
function makeLink(depth) {
  return function Link(props) {
    if (depth === 0) return createElement('span', null, 'leaf');
    const Next = makeLink(depth - 1);
    return createElement('div', { className: 'd' + depth }, createElement(Next, {}));
  };
}
const Chain = makeLink(12);

console.log('=== Test 1: correctness under a forced mid-tree pause ===');
function makeRootFiber(element) {
  const tag = typeof element.type === 'function' ? FunctionComponent : HostComponent;
  const fiber = createFiber(tag, element.key, element.props);
  fiber.type = element.type;
  return fiber;
}

// Baseline: full, unyielded run.
const baselineRoot = makeRootFiber(createElement(Chain, {}));
workLoopSync(baselineRoot);
const baselineTrace = trace(baselineRoot);
console.log('Baseline (workLoopSync) fiber count:', baselineTrace.length);

// Chunked: yield after exactly 3 units, then resume to completion.
const chunkedRoot = makeRootFiber(createElement(Chain, {}));
let calls = 0;
const yieldAfter3 = () => { calls++; return calls > 3; };
const paused = workLoopConcurrent(chunkedRoot, yieldAfter3);
console.log('After forced pause: cursor is null (fully done)?', paused === null);
console.log('shouldYield was consulted', calls, 'times before pausing');
const pausedButNotDone = paused !== null;

const resumed = workLoopConcurrent(paused, () => false); // never yield again
console.log('After resuming with shouldYield=false, cursor is null (done):', resumed === null);

const chunkedTrace = trace(chunkedRoot);
const tracesMatch = JSON.stringify(baselineTrace) === JSON.stringify(chunkedTrace);
console.log('Chunked-and-resumed tree === baseline tree:', tracesMatch);

console.log('\n=== Test 2: real event-loop interleaving ===');
let competingTaskRan = false;
setTimeout(() => { competingTaskRan = true; }, 0); // queued BEFORE rendering starts

const chunkedRoot2 = makeRootFiber(createElement(Chain, {}));
// A FRESH counter each chunk — yields after 2 units of THIS chunk, every
// chunk. (The bug this course's own first draft hit: reusing one shared,
// never-reset counter across chunks meant chunk 2 saw an already-tripped
// condition and did zero work, forever. See DECISIONS.md.)
function createYieldAfter2() {
  let calls = 0;
  return () => { calls++; return calls > 2; };
}
let chunkCount = 0;
const competingRanBeforeCompletion = await new Promise((resolve, reject) => {
  const safety = setTimeout(() => reject(new Error('Test 2 did not complete in 5s — likely a stuck loop')), 5000);
  renderRootConcurrent(chunkedRoot2, {
    createShouldYield: createYieldAfter2,
    onChunk: () => { chunkCount++; if (chunkCount > 100) { clearTimeout(safety); reject(new Error('Too many chunks — likely a stuck loop')); } },
    onComplete: () => { clearTimeout(safety); resolve(competingTaskRan); },
  });
});
console.log('Number of real setTimeout-scheduled chunks used:', chunkCount);
console.log('Competing setTimeout(fn, 0), queued before rendering, ran before our rendering finished:', competingRanBeforeCompletion);
console.log('(This is only meaningful because chunkCount > 1 — otherwise nothing was there to interleave with.)');

console.log('\n=== Informational: a real, wall-clock deadline (not graded — timing varies by machine) ===');
const infoRoot = makeRootFiber(createElement(Chain, {}));
let infoChunks = 0;
await new Promise((resolve) => {
  renderRootConcurrent(infoRoot, {
    createShouldYield: () => makeDeadlineShouldYield(0.01), // fresh deadline every chunk
    onChunk: () => { infoChunks++; },
    onComplete: resolve,
  });
});
console.log('With a 0.01ms wall-clock budget, real chunk count on this machine:', infoChunks, '(informational only)');

const allPass = pausedButNotDone && resumed === null && tracesMatch && chunkCount > 1 && competingRanBeforeCompletion;
console.log('\nAll graded checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
