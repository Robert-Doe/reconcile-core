// Proves the double-buffer pool: at most 2 fiber objects ever exist per
// tree position, no matter how many renders happen, and the "which tree
// is current" swap is a single, atomic pointer write.
// Run from this folder: node verify.mjs
import { createElement } from '../module_01_elements/createElement.js';
import { mount } from '../module_04_mount/mount.js';
import { createWorkInProgress, createContainer } from './doubleBuffer.js';

function Counter({ count }) {
  return createElement('button', null, 'count: ' + count);
}

// Render 1: mount from scratch. This is `current`.
const current1 = mount(createElement(Counter, { count: 0 }));
const container = createContainer(current1);
const check1_startedWithNoAlternate = current1.alternate === null;
console.log('After render 1:');
console.log('  current1.alternate === null:', check1_startedWithNoAlternate);

// Render 2: build a workInProgress for the SAME position.
const wip2 = createWorkInProgress(container.current, { count: 1 });
const check2_isNewObject = wip2 !== current1;
const check2_linkedBothWays = wip2.alternate === current1 && current1.alternate === wip2;
console.log('\nAfter render 2 (createWorkInProgress called once):');
console.log('  wip2 !== current1 (a real second object):', check2_isNewObject);
console.log('  wip2.alternate === current1:', wip2.alternate === current1);
console.log('  current1.alternate === wip2:', current1.alternate === wip2);
console.log('  wip2.pendingProps:', JSON.stringify(wip2.pendingProps));

// Commit render 2: the swap is one assignment.
container.current = wip2;
console.log('  container.current === wip2 after swap:', container.current === wip2);

// Render 3: build a workInProgress again. It MUST be the same object as
// current1 (the original) — reused from the pool, not a third allocation.
const wip3 = createWorkInProgress(container.current, { count: 2 });
const check3_pooledReuse = wip3 === current1;
console.log('\nAfter render 3 (createWorkInProgress called again):');
console.log('  wip3 === current1 (pool reuse, NOT a 3rd object):', check3_pooledReuse);
console.log('  wip3.pendingProps:', JSON.stringify(wip3.pendingProps));
console.log('  wip3.alternate === wip2:', wip3.alternate === wip2);

// Commit render 3.
container.current = wip3;

// Render 4: prove the cycle continues to alternate between exactly 2 objects.
const wip4 = createWorkInProgress(container.current, { count: 3 });
const check4_pooledReuse = wip4 === wip2;
console.log('\nAfter render 4:');
console.log('  wip4 === wip2 (back to the other pooled object):', check4_pooledReuse);

const allObjectsEverCreated = new Set([current1, wip2]);
console.log('\nTotal distinct fiber objects used across 4 renders:', allObjectsEverCreated.size);

const allPass =
  check1_startedWithNoAlternate &&
  check2_isNewObject && check2_linkedBothWays &&
  check3_pooledReuse &&
  check4_pooledReuse &&
  allObjectsEverCreated.size === 2;

console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
