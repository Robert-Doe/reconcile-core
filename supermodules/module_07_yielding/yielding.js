// Module 07 — yielding: the SAME work loop as Module 06, with exactly one
// thing added — a check, before each unit, for whether to stop and hand
// control back. Verified structurally against real react-dom@18.3.1's
// actual `workLoopConcurrent` (react-dom.development.js:26579-26584):
//   while (workInProgress !== null && !shouldYield()) { performUnitOfWork(workInProgress); }
// — check-before-process, identical to what's below. Real React imports
// `shouldYield` from a SEPARATE package, `scheduler`
// (react-dom.development.js:27, 4759: `Scheduler.unstable_shouldYield`) —
// confirmed by reading that require call directly. That package boundary
// is exactly why this module treats `shouldYield` as an injected function
// rather than something workLoopConcurrent decides for itself: real React
// does the same, and it's *why* react-dom even ships a
// `scheduler-unstable_mock` build for deterministic testing (also present
// in node_modules/scheduler/cjs) — this module's deterministic tests use
// the same strategy, a swapped-in mock `shouldYield`, for the same reason.
import { performUnitOfWork } from '../module_06_work_loop/workLoop.js';

/** Identical shape to Module 06's workLoopSync, plus one condition. */
export function workLoopConcurrent(next, shouldYield) {
  while (next !== null && !shouldYield()) {
    next = performUnitOfWork(next);
  }
  return next; // null = fully done; non-null = "here's where to resume"
}

/** The real, production-shaped shouldYield: a wall-clock deadline. */
export function makeDeadlineShouldYield(budgetMs, getNow = () => performance.now()) {
  const deadline = getNow() + budgetMs;
  return () => getNow() >= deadline;
}

/**
 * Runs a tree to completion across possibly many macrotask-scheduled
 * chunks. `createShouldYield` is a FACTORY, called fresh at the start of
 * every chunk — not one shared function reused across chunks. This
 * matters mechanically: real React's Scheduler recomputes its deadline
 * every time a new callback (chunk) begins, rather than checking a
 * deadline that was computed once for the entire render. If `shouldYield`
 * were shared and stateful (e.g. a call counter), its state from chunk 1
 * would leak into chunk 2 and could cause it to yield immediately, forever,
 * without ever making progress — a real bug this course's own first draft
 * of `verify.mjs` hit (see DECISIONS.md).
 * `schedule`'s real equivalent is the `scheduler` package's
 * `MessageChannel`-based callback (not `setTimeout`; see Track 2 A3).
 */
export function renderRootConcurrent(rootFiber, { createShouldYield, schedule = (cb) => setTimeout(cb, 0), onChunk, onComplete }) {
  let cursor = rootFiber;
  function runChunk() {
    const shouldYield = createShouldYield(); // fresh every chunk
    cursor = workLoopConcurrent(cursor, shouldYield);
    if (onChunk) onChunk(cursor);
    if (cursor === null) {
      if (onComplete) onComplete(rootFiber);
    } else {
      schedule(runChunk);
    }
  }
  runChunk();
}
