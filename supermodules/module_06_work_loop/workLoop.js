// Module 06 — the unit-of-work loop: rebuilds Module 04's mount() behavior
// WITHOUT recursion, using only an explicit "what's next" pointer (see
// P3). Verified structurally against real react-dom@18.3.1's actual
// `performUnitOfWork` / `completeUnitOfWork` / `workLoopSync`
// (react-dom.development.js:26502-26610, 26615-26707) — same three-function
// split, same "beginWork returns child-or-null, completeUnitOfWork walks
// sibling-then-parent" structure. See DECISIONS.md for one deliberate
// difference: real React stores the cursor in a module-level variable;
// this course returns it explicitly, so Module 07 can hold onto it itself
// between yields instead of relying on hidden module state.
import { createFiber, appendChild, FunctionComponent, HostComponent, HostText } from '../module_03_fiber_node/fiber.js';
import { isElement } from '../module_02_jsx_desugar/jsx.js';
import { normalizeChildren } from '../module_04_mount/mount.js';

function createFiberForValue(elementOrText) {
  if (typeof elementOrText === 'string' || typeof elementOrText === 'number') {
    return createFiber(HostText, null, String(elementOrText));
  }
  if (!isElement(elementOrText)) {
    throw new Error('workLoop only accepts elements, strings, and numbers as children.');
  }
  const { type, key, props } = elementOrText;
  const tag = typeof type === 'function' ? FunctionComponent : HostComponent;
  const fiber = createFiber(tag, key, props);
  fiber.type = type;
  return fiber;
}

/**
 * Does ONE fiber's own work — never its descendants'. Creates fiber(s) for
 * this fiber's immediate children (one level deep only) and returns the
 * FIRST child, so the outer loop can decide to go one level deeper. This
 * is the crux of the whole module: Module 04's mount() went all the way
 * down in a single call; beginWork goes down exactly one level, every time
 * it's called, and lets repeated calls (from the loop) provide the depth.
 */
export function beginWork(fiber) {
  if (fiber.tag === HostText) {
    return null; // text nodes never have children
  }

  if (fiber.tag === FunctionComponent) {
    const rendered = fiber.type(fiber.pendingProps); // call it — same move as Module 04
    const child = createFiberForValue(rendered);
    appendChild(fiber, child);
    return fiber.child; // exactly one child, always
  }

  // HostComponent: create a fiber for EACH immediate child (siblings among
  // themselves), but do not descend into any of their children yet.
  const children = normalizeChildren(fiber.pendingProps.children);
  for (const child of children) {
    appendChild(fiber, createFiberForValue(child));
  }
  return fiber.child; // null if there were no children
}

/**
 * When a fiber has no more work of its own to spawn, find the next fiber
 * anywhere in the tree that still needs visiting: try this fiber's
 * sibling; if none, go up to the parent and try ITS sibling; repeat until
 * a sibling is found or the root's parent (null) is reached.
 */
export function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const returnFiber = completedWork.return;
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) return siblingFiber;
    completedWork = returnFiber;
  } while (completedWork !== null);
  return null; // walked off the top — the whole tree is done
}

/** One step: do this fiber's own work, then decide what's next. */
export function performUnitOfWork(fiber) {
  const next = beginWork(fiber);
  fiber.memoizedProps = fiber.pendingProps; // this fiber's own work is now "done"
  if (next !== null) return next;
  return completeUnitOfWork(fiber);
}

/**
 * Runs the ENTIRE tree to completion, synchronously, with no yielding.
 * Module 07 replaces this with a version that can stop early and resume —
 * everything else about the loop (beginWork/completeUnitOfWork/
 * performUnitOfWork) stays exactly the same.
 */
export function workLoopSync(rootFiber) {
  let next = rootFiber;
  while (next !== null) {
    next = performUnitOfWork(next);
  }
  return rootFiber;
}
