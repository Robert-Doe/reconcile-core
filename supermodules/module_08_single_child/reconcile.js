// Module 08 — the single-child fast path: the first real DIFFING decision
// in this course. Given an existing (current) child fiber and a NEW
// element for the same position, decide whether to reuse the fiber
// (update in place) or throw it away and build a new one.
// Verified structurally against real react-dom@18.3.1's actual
// `reconcileSingleElement`, `useFiber`, `deleteChild`, and
// `deleteRemainingChildren` (react-dom.development.js:13151-13212,
// 13925-13992) — same key-then-type check, same reuse-via-createWorkInProgress
// call, same deletion-tracking-on-the-PARENT mechanism. Simplified by
// dropping Fragment/Lazy/hot-reload special cases (out of scope).
import { createWorkInProgress } from '../module_05_double_buffer/doubleBuffer.js';
import { createFiber, HostText, HostComponent, FunctionComponent } from '../module_03_fiber_node/fiber.js';
import { isElement } from '../module_02_jsx_desugar/jsx.js';

function createFiberForValue(elementOrText) {
  if (typeof elementOrText === 'string' || typeof elementOrText === 'number') {
    return createFiber(HostText, null, String(elementOrText));
  }
  if (!isElement(elementOrText)) {
    throw new Error('reconcileSingleChild only accepts elements, strings, and numbers.');
  }
  const { type, key, props } = elementOrText;
  const tag = typeof type === 'function' ? FunctionComponent : HostComponent;
  const fiber = createFiber(tag, key, props);
  fiber.type = type;
  return fiber;
}

/**
 * Real React's `useFiber`: clone via double buffering (Module 05), then
 * reset the two fields that only make sense in a list context. We're in
 * the single-child case, so a reused fiber is always the ONLY child —
 * `index` is always 0, `sibling` is always null, regardless of what they
 * were before.
 */
function useFiber(fiber, pendingProps) {
  const clone = createWorkInProgress(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}

/**
 * Marks a fiber for removal by recording it on its PARENT's `deletions`
 * list — introduced here (real React has this field on every fiber from
 * the start; this course cut it from Module 03's list until a module
 * actually needed it). Nothing is removed from the tree yet — Module 11's
 * effect list is where `deletions` actually gets consumed.
 */
function deleteChild(returnFiber, childToDelete) {
  if (returnFiber.deletions === null) returnFiber.deletions = [];
  returnFiber.deletions.push(childToDelete);
}

function deleteRemainingChildren(returnFiber, currentFirstChild) {
  let childToDelete = currentFirstChild;
  while (childToDelete !== null) {
    deleteChild(returnFiber, childToDelete);
    childToDelete = childToDelete.sibling;
  }
}

/**
 * @param returnFiber the parent fiber whose one child we're reconciling
 * @param currentFirstChild the OLD first child fiber (or null, if none/mounting)
 * @param element the NEW element (or string/number) for this position
 * @returns the fiber to use for this position from now on
 */
export function reconcileSingleChild(returnFiber, currentFirstChild, element) {
  const isText = typeof element === 'string' || typeof element === 'number';
  const key = isText ? null : element.key;
  const newType = isText ? null : element.type;

  let child = currentFirstChild;
  while (child !== null) {
    if (child.key === key) {
      const sameType = isText ? child.tag === HostText : child.type === newType;
      if (sameType) {
        // MATCH: reuse this fiber. Delete any leftover siblings — a
        // single-child position can only ever keep one survivor.
        deleteRemainingChildren(returnFiber, child.sibling);
        const props = isText ? String(element) : element.props;
        const existing = useFiber(child, props);
        existing.return = returnFiber;
        return existing;
      }
      // Key matched but type didn't: this child AND everything after it
      // in the sibling chain is going away. Fall through to create new.
      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      // Wrong key entirely — this specific child is going away, but a
      // LATER sibling might still match. Keep walking.
      deleteChild(returnFiber, child);
      child = child.sibling;
    }
  }

  // No reusable match found anywhere in the old sibling chain.
  const created = createFiberForValue(element);
  created.return = returnFiber;
  return created;
}
