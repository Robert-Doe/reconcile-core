// Module 05 — double buffering: current vs. workInProgress.
// A from-scratch `createWorkInProgress`, checked line-by-line against real
// react-dom@18.3.1's actual function of the same name
// (react-dom.development.js:28183-28256). Only the fields this course
// tracks (see Module 03's DECISIONS.md for the full cut list) are copied;
// real React copies more (lanes, dependencies, profiler timers).
import { createFiber } from '../module_03_fiber_node/fiber.js';

/**
 * Given a `current` fiber (the one on screen right now) and new
 * `pendingProps` for the next render, returns the fiber to do THIS
 * render's work on — reusing `current.alternate` if one already exists,
 * rather than allocating a third fiber. There are only ever at most TWO
 * fiber objects per tree position, forever, no matter how many renders
 * happen.
 */
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;

  if (workInProgress === null) {
    // First time this position has ever needed a second buffer.
    workInProgress = createFiber(current.tag, current.key, pendingProps);
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    // The link is made in BOTH directions, once, here — never re-made
    // after this. This is why there are only ever two objects: every
    // future call for this position finds `current.alternate` already set.
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // Pool hit: reuse the exact same object from two renders ago.
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;
    workInProgress.flags = 0; // this render's effects haven't been discovered yet
  }

  // Whether freshly created or reused, workInProgress starts as a COPY of
  // current's tree-shape/data fields. Reconciliation (Module 08/09) will
  // overwrite `child` with THIS render's children; until that runs, the
  // two trees are indistinguishable except by identity.
  workInProgress.child = current.child;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.memoizedProps = current.memoizedProps;

  return workInProgress;
}

/**
 * A minimal stand-in for React's FiberRootNode: the ONE piece of mutable
 * state that says which tree is "real" right now. Swapping `.current` is a
 * single pointer write — nothing that reads `.current` can ever observe a
 * moment where it points at a half-built tree, because it only ever points
 * at a COMPLETE tree, before or after the swap.
 */
export function createContainer(initialCurrent) {
  return { current: initialCurrent };
}
