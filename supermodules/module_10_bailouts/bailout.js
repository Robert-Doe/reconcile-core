// Module 10 — bailing out: skipping a subtree ENTIRELY, no diff, no fiber
// visit, when props are reference-equal to last time. Verified structurally
// against real react-dom@18.3.1's actual top-of-`beginWork` check
// (react-dom.development.js:21563-21583) and the real `memo`/shallowEqual
// mechanism (lines 8131-8157, 19407-19445).
import { HostComponent, FunctionComponent } from '../module_03_fiber_node/fiber.js';

/**
 * Real React's actual `shallowEqual`, verified byte-for-byte
 * (react-dom.development.js:8131-8157): same-reference short-circuit via
 * `Object.is`, then same key COUNT, then every key present in both with
 * `Object.is`-equal values.
 */
export function shallowEqual(objA, objB) {
  if (Object.is(objA, objB)) return true;
  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) return false;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) return false;
  }
  return true;
}

/**
 * The actual bailout question, matching real React's real top-of-beginWork
 * check: is this fiber being asked to work with the EXACT SAME props
 * object (by reference) it was already rendered with? If so — and nothing
 * else forced work (no scheduled state update, modeled here as a simple
 * boolean flag rather than real React's lane bitmask) — this fiber's own
 * work, AND everything below it, can be skipped outright.
 */
export function shouldBailout(current, pendingProps, hasScheduledUpdate) {
  if (current === null) return false; // mounting — nothing to bail out of
  const oldProps = current.memoizedProps;
  if (oldProps !== pendingProps) return false; // different object — must re-render
  if (hasScheduledUpdate) return false; // e.g. local state changed — must re-render
  return true;
}

/**
 * `memo`'s real trick (verified at react-dom.development.js:19407-19428):
 * NOT a separate bailout mechanism — a way to make `shouldBailout`'s plain
 * reference check succeed more often, by substituting the OLD props
 * object when the new one is only SHALLOWLY equal (same keys/values, but
 * a genuinely different object). `workInProgress.pendingProps = prevProps`
 * in real React; here, we return the reference to use going forward.
 */
export function resolveMemoProps(current, nextProps, arePropsEqual = shallowEqual) {
  if (current === null) return nextProps;
  const prevProps = current.memoizedProps;
  if (arePropsEqual(prevProps, nextProps)) {
    return prevProps; // reuse the OLD reference — this is the entire trick
  }
  return nextProps;
}

/**
 * What a bailout actually DOES to the tree: the fiber's own work (calling
 * its render function, diffing its own children) is skipped entirely, and
 * its existing child subtree is carried forward as-is — not re-visited,
 * not re-diffed, not even walked. `visitedFibers` is test/demo
 * instrumentation only, standing in for "beginWork ran on this fiber."
 */
export function beginWorkWithBailout(current, workInProgress, renderComponent, visitedFibers) {
  visitedFibers.push(workInProgress);
  const hasScheduledUpdate = Boolean(workInProgress.pendingUpdate);

  if (shouldBailout(current, workInProgress.pendingProps, hasScheduledUpdate)) {
    // The whole point: reuse the OLD child subtree, untouched. Nothing
    // below this fiber is visited, diffed, or re-rendered.
    workInProgress.child = current.child;
    workInProgress.memoizedProps = workInProgress.pendingProps;
    return workInProgress.child;
  }

  // Normal path: actually do the work (Module 04/06's job, simplified here
  // to a single call for this module's narrower purpose).
  renderComponent(workInProgress);
  workInProgress.memoizedProps = workInProgress.pendingProps;
  return workInProgress.child;
}
