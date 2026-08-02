// Module 09 — reconciling a whole ARRAY of children against a whole old
// array: the real two/three-phase algorithm, checked structurally against
// real react-dom@18.3.1's actual `reconcileChildrenArray` and `placeChild`
// (react-dom.development.js:13214-13242, 13544-13709). Real React's own
// comment above this function (quoted verbatim in DECISIONS.md) says it
// plainly: fibers have no back-pointers, so this can't be a real two-ended
// or LIS diff — it's a single forward pass with a "highest old index seen
// so far" heuristic. That heuristic, not a full LIS, is what real React
// ships.
import { createWorkInProgress } from '../module_05_double_buffer/doubleBuffer.js';
import { createFiber, HostText, HostComponent, FunctionComponent } from '../module_03_fiber_node/fiber.js';
import { isElement } from '../module_02_jsx_desugar/jsx.js';

// Real values, confirmed in react-dom.development.js:4349-4358 (the source
// comment there says "Don't change these two values" about NoFlags/
// PerformedWork; Placement's value has been stable alongside them).
export const NoFlags = 0;
export const Placement = 2;

function createFiberForValue(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return createFiber(HostText, null, String(value));
  }
  if (!isElement(value)) throw new Error('keyedDiff only accepts elements, strings, and numbers.');
  const { type, key, props } = value;
  const tag = typeof type === 'function' ? FunctionComponent : HostComponent;
  const fiber = createFiber(tag, key, props);
  fiber.type = type;
  return fiber;
}

function keyOf(value) {
  return (typeof value === 'string' || typeof value === 'number') ? null : value.key;
}
function typeOf(value) {
  return (typeof value === 'string' || typeof value === 'number') ? HostText : value.type;
}
function sameType(fiber, value) {
  return (typeof value === 'string' || typeof value === 'number')
    ? fiber.tag === HostText
    : fiber.type === value.type;
}

function useFiber(fiber, pendingProps) {
  const clone = createWorkInProgress(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}

function propsOf(value) {
  return (typeof value === 'string' || typeof value === 'number') ? String(value) : value.props;
}

function deleteChild(returnFiber, child) {
  if (returnFiber.deletions === null) returnFiber.deletions = [];
  returnFiber.deletions.push(child);
}
function deleteRemainingChildren(returnFiber, firstChild) {
  let c = firstChild;
  while (c !== null) { deleteChild(returnFiber, c); c = c.sibling; }
}

/**
 * Given a NEW fiber (freshly created or reused) and the highest old
 * `.index` placed so far, decide: does this fiber's position count as
 * "stayed in place" or "moved"? Verified against real React's actual
 * `placeChild` (line-cited above): a REUSED fiber whose OLD index is
 * below the high-water mark must have moved backward past something
 * already placed — flag it. A reused fiber at or above the mark extends
 * the mark. A brand-new fiber is always an insertion.
 */
function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex;
  const current = newFiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      newFiber.flags |= Placement; // moved
      return lastPlacedIndex;
    }
    return oldIndex; // stayed — raise the high-water mark
  }
  newFiber.flags |= Placement; // inserted
  return lastPlacedIndex;
}

/**
 * Reconciles an ARRAY of new children against the old sibling chain
 * starting at `currentFirstChild`. Returns the new first child (a linked
 * sibling chain), with `.flags` on each fiber recording Placement where
 * a physical DOM move/insert will be needed (Module 12's job to act on).
 */
export function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
  let resultingFirstChild = null;
  let previousNewFiber = null;
  let oldFiber = currentFirstChild;
  let lastPlacedIndex = 0;
  let newIdx = 0;

  // --- Phase 1: lockstep walk while keys line up at the same position ---
  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) break; // real React's out-of-order guard
    const newValue = newChildren[newIdx];
    if (keyOf(newValue) !== oldFiber.key) break; // key mismatch: stop the fast walk

    const matched = sameType(oldFiber, newValue);
    const newFiber = matched ? useFiber(oldFiber, propsOf(newValue)) : createFiberForValue(newValue);
    if (matched) {
      // reused
    } else if (oldFiber) {
      deleteChild(returnFiber, oldFiber); // same key, different type: old one goes
    }
    newFiber.return = returnFiber;

    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    if (previousNewFiber === null) resultingFirstChild = newFiber;
    else previousNewFiber.sibling = newFiber;
    previousNewFiber = newFiber;

    oldFiber = oldFiber.sibling;
  }

  // --- All new children consumed: whatever's left of the old chain is deleted ---
  if (newIdx === newChildren.length) {
    deleteRemainingChildren(returnFiber, oldFiber);
    return resultingFirstChild;
  }

  // --- Old chain exhausted first: fast path, everything left is an insertion ---
  if (oldFiber === null) {
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = createFiberForValue(newChildren[newIdx]);
      newFiber.return = returnFiber;
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) resultingFirstChild = newFiber;
      else previousNewFiber.sibling = newFiber;
      previousNewFiber = newFiber;
    }
    return resultingFirstChild;
  }

  // --- Phase 2: both sides still have leftovers whose order doesn't line
  // up — build a key map from the remaining OLD fibers, and look each
  // remaining NEW child up in it. This is the only phase that can find a
  // MOVE, because it's the only phase not assuming position tells you
  // identity. ---
  const existingChildren = new Map();
  for (let c = oldFiber; c !== null; c = c.sibling) {
    existingChildren.set(c.key !== null ? c.key : c.index, c);
  }

  for (; newIdx < newChildren.length; newIdx++) {
    const newValue = newChildren[newIdx];
    const lookupKey = keyOf(newValue) !== null ? keyOf(newValue) : newIdx;
    const matchedOld = existingChildren.get(lookupKey) ?? null;

    let newFiber;
    if (matchedOld !== null && sameType(matchedOld, newValue)) {
      newFiber = useFiber(matchedOld, propsOf(newValue));
      existingChildren.delete(lookupKey); // consumed — not a deletion
    } else {
      newFiber = createFiberForValue(newValue);
    }
    newFiber.return = returnFiber;

    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    if (previousNewFiber === null) resultingFirstChild = newFiber;
    else previousNewFiber.sibling = newFiber;
    previousNewFiber = newFiber;
  }

  // Anything still left in the map was never claimed by a new child.
  existingChildren.forEach((child) => deleteChild(returnFiber, child));

  return resultingFirstChild;
}
