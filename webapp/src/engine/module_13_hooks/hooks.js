// Module 13 — hooks as a linked list living on the fiber, addressed by
// CALL ORDER (see P5), not by name. Verified structurally against real
// react-dom@18.3.1's actual mountWorkInProgressHook/updateWorkInProgressHook
// and mountState/updateState (react-dom.development.js:15632-15746,
// 16162-16186). Simplified: real React's pending-update queue is a
// circular linked list supporting priority (lane) skipping for concurrent
// rendering — out of scope here (Track 2's A3/A6). This course's queue is
// a plain array, applied in order, every time.

// Module-level render cursor — matching real React's OWN actual choice
// (currentlyRenderingFiber/workInProgressHook/currentHook are genuinely
// module-level variables in react-dom, not fields threaded through calls).
// See DECISIONS.md: this is the one place this course deliberately mirrors
// that choice rather than making the cursor an explicit parameter, because
// hook call order is fundamentally about an IMPLICIT position — hook
// functions never receive "which hook am I" as an argument from the
// component author, which is the entire point P5 makes.
let currentlyRenderingFiber = null;
let workInProgressHook = null;
let currentHook = null;

export function prepareToUseHooks(fiber) {
  currentlyRenderingFiber = fiber;
  workInProgressHook = null;
  currentHook = null;
}

export function finishHooks() {
  currentlyRenderingFiber = null;
}

/** Mount path: allocate a fresh hook node, append it to the fiber's list. */
function mountWorkInProgressHook() {
  const hook = { memoizedState: null, queue: null, next: null };
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

/**
 * Update path: advance ONE step through the PREVIOUS render's hook list
 * (via `currentHook`), cloning each node forward into a NEW list on the
 * new fiber. This is what makes "don't call hooks conditionally" a
 * mechanical requirement rather than a style rule: this function has no
 * idea which hook "useState(0)" or "useEffect(...)" was — it only knows
 * "give me whatever hook comes next in the list," by position.
 */
function updateWorkInProgressHook() {
  const nextCurrentHook = currentHook === null
    ? (currentlyRenderingFiber.alternate ? currentlyRenderingFiber.alternate.memoizedState : null)
    : currentHook.next;

  if (nextCurrentHook === null) {
    throw new Error('Rendered more hooks than during the previous render.');
  }
  currentHook = nextCurrentHook;

  const newHook = { memoizedState: currentHook.memoizedState, queue: currentHook.queue, next: null };
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    workInProgressHook = workInProgressHook.next = newHook;
  }
  return workInProgressHook;
}

function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action;
}

/** The dispatcher swap: mount allocates, update clones-and-advances. Both decided by `fiber.alternate`. */
function dispatcherFor(fiber) {
  return fiber.alternate === null ? mountWorkInProgressHook : updateWorkInProgressHook;
}

/**
 * Real React's actual useState IS useReducer(basicStateReducer) — verified
 * directly (react-dom.development.js:16184-16186: `function updateState
 * (initialState) { return updateReducer(basicStateReducer); }`). We match
 * that rather than giving useState its own separate implementation.
 */
export function useState(initialValue) {
  const fiber = currentlyRenderingFiber;
  const mountPath = fiber.alternate === null;
  const hook = dispatcherFor(fiber)();

  if (mountPath) {
    hook.memoizedState = typeof initialValue === 'function' ? initialValue() : initialValue;
    hook.queue = { pending: [] };
  } else {
    // Apply every queued action, in order, via basicStateReducer — the
    // simplified stand-in for real React's priority-aware queue processing.
    for (const action of hook.queue.pending) {
      hook.memoizedState = basicStateReducer(hook.memoizedState, action);
    }
    hook.queue.pending = [];
  }

  const queue = hook.queue;
  const setState = (action) => { queue.pending.push(action); };
  return [hook.memoizedState, setState];
}
