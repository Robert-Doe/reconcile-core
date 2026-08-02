// Three scenarios, each checked against independently reasoned expectations.
// Run from this folder: node verify.mjs
import { createElement } from '../module_01_elements/createElement.js';
import { createFiber, appendChild, HostComponent } from '../module_03_fiber_node/fiber.js';
import { reconcileSingleChild } from './reconcile.js';

function freshParent() {
  return createFiber(HostComponent, null, {});
}

const results = {};

console.log('=== Scenario 1: same type, same key → REUSE ===');
{
  const parent = freshParent();
  const oldChild = createFiber(HostComponent, null, { className: 'old' });
  oldChild.type = 'div';
  oldChild.memoizedProps = { className: 'old' };
  appendChild(parent, oldChild);

  const newElement = createElement('div', { className: 'new' });
  const result = reconcileSingleChild(parent, oldChild, newElement);

  console.log('result !== oldChild (double-buffer clone, not same object):', result !== oldChild);
  console.log('result.alternate === oldChild (pooled via Module 05):', result.alternate === oldChild);
  console.log('result.pendingProps.className === "new":', result.pendingProps.className === 'new');
  console.log('oldChild.memoizedProps.className still "old" (untouched):', oldChild.memoizedProps.className === 'old');
  console.log('result.index === 0, result.sibling === null:', result.index === 0 && result.sibling === null);
  console.log('parent.deletions is null (nothing deleted):', parent.deletions === null);

  const scenario1Ok = result !== oldChild && result.alternate === oldChild &&
    result.pendingProps.className === 'new' && oldChild.memoizedProps.className === 'old' &&
    result.index === 0 && result.sibling === null && parent.deletions === null;
  console.log('Scenario 1:', scenario1Ok ? 'PASS' : 'FAIL');
  results.s1 = scenario1Ok;
}

console.log('\n=== Scenario 2: different type, same key → REPLACE, old marked for deletion ===');
{
  const parent = freshParent();
  const oldChild = createFiber(HostComponent, null, {});
  oldChild.type = 'div';
  appendChild(parent, oldChild);

  const newElement = createElement('span', { className: 'new' }); // different type
  const result = reconcileSingleChild(parent, oldChild, newElement);

  console.log('result.type === "span" (brand new fiber):', result.type === 'span');
  console.log('result !== oldChild:', result !== oldChild);
  console.log('result.alternate is null (never pooled — brand new):', result.alternate === null);
  console.log('parent.deletions === [oldChild]:', Array.isArray(parent.deletions) && parent.deletions[0] === oldChild && parent.deletions.length === 1);

  const scenario2Ok = result.type === 'span' && result !== oldChild && result.alternate === null &&
    Array.isArray(parent.deletions) && parent.deletions[0] === oldChild && parent.deletions.length === 1;
  console.log('Scenario 2:', scenario2Ok ? 'PASS' : 'FAIL');
  results.s2 = scenario2Ok;
}

console.log('\n=== Scenario 3: old tree had TWO children, new element matches the first — second must also be deleted ===');
{
  const parent = freshParent();
  const oldFirst = createFiber(HostComponent, null, {});
  oldFirst.type = 'div';
  const oldSecond = createFiber(HostComponent, null, {});
  oldSecond.type = 'p';
  appendChild(parent, oldFirst);
  appendChild(parent, oldSecond); // oldFirst.sibling = oldSecond

  const newElement = createElement('div', { className: 'still div' });
  const result = reconcileSingleChild(parent, oldFirst, newElement);

  console.log('result reused oldFirst (same type):', result.alternate === oldFirst);
  console.log('result.sibling === null (single-child position, no siblings survive):', result.sibling === null);
  console.log('parent.deletions includes the ORPHANED oldSecond:',
    Array.isArray(parent.deletions) && parent.deletions.includes(oldSecond));

  const scenario3Ok = result.alternate === oldFirst && result.sibling === null &&
    Array.isArray(parent.deletions) && parent.deletions.includes(oldSecond);
  console.log('Scenario 3:', scenario3Ok ? 'PASS' : 'FAIL');
  results.s3 = scenario3Ok;
}

const allPass = results.s1 && results.s2 && results.s3;
console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
