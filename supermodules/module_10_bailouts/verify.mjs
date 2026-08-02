// Four checks: shallowEqual matches real Object.is-based semantics exactly;
// shouldBailout requires true reference equality, not "looks the same";
// resolveMemoProps (memo's real trick) can MAKE that reference equality
// hold; and beginWorkWithBailout, when it bails, never even clones the
// child subtree — proof of zero work, not just "skipped calling render."
// Run from this folder: node verify.mjs
import { createFiber, HostComponent, FunctionComponent } from '../module_03_fiber_node/fiber.js';
import { createWorkInProgress as cwip } from '../module_05_double_buffer/doubleBuffer.js';
import { shallowEqual, shouldBailout, resolveMemoProps, beginWorkWithBailout } from './bailout.js';

let allPass = true;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${label}: ${ok ? 'PASS' : 'FAIL (actual=' + JSON.stringify(actual) + ', expected=' + JSON.stringify(expected) + ')'}`);
  if (!ok) allPass = false;
}

console.log('=== shallowEqual, matched against real Object.is-based semantics ===');
{
  const obj = { a: 1 };
  check('identical reference → true', shallowEqual(obj, obj), true);
  check('same keys/values, different object → true (shallow)', shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
  check('different key count → false', shallowEqual({ a: 1 }, { a: 1, b: 2 }), false);
  check('different value → false', shallowEqual({ a: 1 }, { a: 2 }), false);
  check('NaN handled via Object.is (NaN "equals" NaN)', shallowEqual({ a: NaN }, { a: NaN }), true);
  check('+0 vs -0 distinguished via Object.is', shallowEqual({ a: 0 }, { a: -0 }), false);
}

console.log('\n=== shouldBailout requires TRUE reference equality ===');
{
  const current = createFiber(FunctionComponent, null, { title: 'x' });
  current.memoizedProps = { title: 'x' }; // note: different object than pendingProps below, deliberately
  const sameRefProps = current.memoizedProps;
  const newObjectSameValues = { title: 'x' };

  check('exact same reference, no scheduled update → bails out', shouldBailout(current, sameRefProps, false), true);
  check('new object with identical VALUES → does NOT bail (reference differs)', shouldBailout(current, newObjectSameValues, false), false);
  check('same reference, but a scheduled update exists → does NOT bail', shouldBailout(current, sameRefProps, true), false);
  check('mounting (current === null) → never bails', shouldBailout(null, sameRefProps, false), false);
}

console.log('\n=== resolveMemoProps can MAKE reference equality hold ===');
{
  const current = createFiber(FunctionComponent, null, {});
  current.memoizedProps = { title: 'x' };
  const newShallowEqualProps = { title: 'x' }; // different object, same shallow value

  const withoutMemo = shouldBailout(current, newShallowEqualProps, false);
  const resolved = resolveMemoProps(current, newShallowEqualProps);
  const withMemo = shouldBailout(current, resolved, false);

  check('without memo: new shallow-equal object does NOT bail', withoutMemo, false);
  check('resolveMemoProps returns the OLD reference (not the new object)', resolved === current.memoizedProps, true);
  check('with memo\'s substitution: NOW it bails', withMemo, true);
}

console.log('\n=== beginWorkWithBailout: a bailout never even clones the child subtree ===');
{
  const currentParent = createFiber(FunctionComponent, null, { title: 'x' });
  const currentChild = createFiber(HostComponent, null, {});
  currentChild.type = 'div';
  currentParent.child = currentChild;
  currentChild.return = currentParent;
  currentParent.memoizedProps = { title: 'x' };

  const sharedProps = currentParent.memoizedProps; // SAME object, next render
  const wipParent = cwip(currentParent, sharedProps);

  let renderCalls = 0;
  const visited = [];
  const resultChild = beginWorkWithBailout(currentParent, wipParent, () => { renderCalls++; }, visited);

  check('renderComponent was never called (bailed out)', renderCalls, 0);
  check('workInProgress.child === current.child (SAME object, not cloned)', resultChild === currentChild, true);

  // Contrast: a genuinely new props object forces real work.
  const wipParent2 = cwip(currentParent, { title: 'y' });
  let renderCalls2 = 0;
  beginWorkWithBailout(currentParent, wipParent2, () => { renderCalls2++; }, visited);
  check('different props object → renderComponent WAS called', renderCalls2, 1);
}

console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
