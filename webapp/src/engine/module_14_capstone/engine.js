// Module 14 — the capstone: every prior module's piece, wired together
// into one engine that can mount AND update a real, stateful, interactive
// app. Nothing here reimplements earlier modules — it imports and
// composes them. Where composition required a genuine new decision (not
// covered by any single earlier module), it's called out below and in
// DECISIONS.md.
import { createElement } from '../module_01_elements/createElement.js';
import { isElement } from '../module_02_jsx_desugar/jsx.js';
import {
  createFiber, forEachFiber,
  FunctionComponent, HostComponent, HostText, HostRoot,
} from '../module_03_fiber_node/fiber.js';
import { normalizeChildren } from '../module_04_mount/mount.js';
import { createWorkInProgress } from '../module_05_double_buffer/doubleBuffer.js';
import { reconcileSingleChild } from '../module_08_single_child/reconcile.js';
import { reconcileChildrenArray } from '../module_09_keyed_diff/keyedDiff.js';
import { shouldBailout, resolveMemoProps } from '../module_10_bailouts/bailout.js';
import { collectEffects, Placement } from '../module_11_effect_list/effectList.js';
import { completeDomWork, commitPlacement, commitDeletions } from '../module_12_commit/commit.js';
import {
  prepareToUseHooks, finishHooks, useState as useStateBase,
} from '../module_13_hooks/hooks.js';

export { createElement };

// --- Connecting Module 13's (deliberately scheduler-agnostic) useState to
// an actual re-render. Module 13's own useState only ever queues an
// action; nothing about it decides when to re-render. This is that
// decision, made exactly once, here. ---
let scheduleUpdateFn = null;
export function useState(initial) {
  const [value, rawSetState] = useStateBase(initial);
  const setState = (action) => {
    rawSetState(action);
    if (scheduleUpdateFn) scheduleUpdateFn();
  };
  return [value, setState];
}

/**
 * Opt-in, matching real `React.memo`: wraps a component so its props go
 * through Module 10's `resolveMemoProps` before the bailout check. Plain
 * components do NOT get this for free — see this module's DECISIONS.md
 * for the real bug that motivated making this explicit rather than
 * applying it to every component automatically.
 */
export function memo(Component) {
  const Memoized = (props) => Component(props);
  Memoized.isMemo = true;
  return Memoized;
}

function createFiberForValue(elementOrText) {
  if (typeof elementOrText === 'string' || typeof elementOrText === 'number') {
    return createFiber(HostText, null, String(elementOrText));
  }
  if (!isElement(elementOrText)) throw new Error('engine only accepts elements, strings, and numbers.');
  const { type, key, props } = elementOrText;
  const tag = typeof type === 'function' ? FunctionComponent : HostComponent;
  const fiber = createFiber(tag, key, props);
  fiber.type = type;
  return fiber;
}

/**
 * Real React tracks, per fiber, whether ITS OWN OR ANY DESCENDANT's lanes
 * indicate pending work (`childLanes`), which is how the top of a
 * scheduled update knows to keep walking down even when its own props are
 * unchanged. This course cut `childLanes` from Module 03 (out of scope —
 * a real, sizable mechanism in its own right). Without it, this engine
 * cannot tell "my own props/state are unchanged, but a bailout would
 * accidentally drop a descendant's pending update" apart from "genuinely
 * nothing below me changed" — so it makes the one call that keeps the
 * demo CORRECT without faking lane propagation: the fiber `scheduleUpdate`
 * starts from is never itself bailout-eligible. Every fiber below it still
 * goes through the real, unmodified bailout check from Module 10.
 */
function beginWork(current, workInProgress, forceUpdate) {
  if (workInProgress.tag === FunctionComponent) {
    let pendingProps = workInProgress.pendingProps;

    // Only `memo`-wrapped components get the shallow-equal-then-substitute
    // treatment (Module 10) — matching real React, where this is opt-in,
    // not automatic for every function component.
    if (current !== null && workInProgress.type.isMemo) {
      pendingProps = resolveMemoProps(current, pendingProps);
      workInProgress.pendingProps = pendingProps;
    }

    if (!forceUpdate && current !== null && shouldBailout(current, pendingProps, false)) {
      // A REAL bailout means zero work below this fiber — not "visit the
      // old child once more." Returning it as `next` here (an earlier,
      // buggy version of this file did exactly that) makes the work loop
      // treat the OLD, already-committed child as if it were a fresh
      // workInProgress fiber to reconcile — which re-mounts its children
      // against a stale/null `.alternate` and duplicates real DOM nodes.
      // Returning `null` tells performUnitOfWork "nothing to descend
      // into"; completeUnitOfWork still runs for THIS fiber (bubbling
      // flags), but nothing inside the bailed-out subtree is ever visited.
      workInProgress.child = current.child;
      workInProgress.memoizedProps = pendingProps;
      return null;
    }
    prepareToUseHooks(workInProgress);
    const rendered = workInProgress.type(pendingProps);
    finishHooks();
    workInProgress.child = reconcileSingleChild(workInProgress, current ? current.child : null, rendered);
    return workInProgress.child;
  }

  if (workInProgress.tag === HostComponent) {
    const children = normalizeChildren(workInProgress.pendingProps.children);
    workInProgress.child = reconcileChildrenArray(workInProgress, current ? current.child : null, children);
    return workInProgress.child;
  }

  return null; // HostText — no children
}

/** Same shape as Module 06's completeUnitOfWork, fused with Module 12's
 * per-fiber DOM building (which also bubbles Module 11's flags) — matching
 * real React's real phase boundary: off-screen DOM creation happens during
 * the (interruptible, in real React) render/complete step; only ATTACHING
 * to the live document is deferred to a separate commit pass below. */
function completeUnitOfWork(unitOfWork, document) {
  let completedWork = unitOfWork;
  do {
    completeDomWork(completedWork, document);
    const returnFiber = completedWork.return;
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) return siblingFiber;
    completedWork = returnFiber;
  } while (completedWork !== null);
  return null;
}

function performUnitOfWork(fiber, forceUpdate, document) {
  const current = fiber.alternate;
  const next = beginWork(current, fiber, forceUpdate);
  fiber.memoizedProps = fiber.pendingProps;
  if (next !== null) return next;
  return completeUnitOfWork(fiber, document);
}

function renderFiber(root, document) {
  let next = root;
  let forceUpdate = true; // only the entry fiber — see beginWork's doc comment
  while (next !== null) {
    next = performUnitOfWork(next, forceUpdate, document);
    forceUpdate = false;
  }
}

/** Attach phase: Module 11's pruned walk finds what changed; Module 12
 * attaches/removes real nodes. Never rebuilds instances — that already
 * happened, per-fiber, during renderFiber above. */
function commit(hostRootFiber) {
  const effects = collectEffects(hostRootFiber);
  for (const fiber of effects) {
    if (fiber.flags & Placement) commitPlacement(fiber);
  }
  (function walkDeletions(fiber) {
    if (fiber.deletions) commitDeletions(fiber);
    let child = fiber.child;
    while (child !== null) { walkDeletions(child); child = child.sibling; }
  })(hostRootFiber);
}

/** Mounts `element` into `containerRealNode` (a real or fake DOM node with
 * appendChild/insertBefore/removeChild) using `document` (real or fake) to
 * create instances. Returns a handle whose `.update()` re-renders on
 * demand — wired automatically to every `useState` call via this file's
 * `useState`. */
export function mountApp(element, containerRealNode, document) {
  const appFiber = createFiberForValue(element);
  appFiber.flags |= Placement;

  const hostRootFiber = createFiber(HostRoot, null, {});
  hostRootFiber.stateNode = { containerInfo: containerRealNode };
  hostRootFiber.child = appFiber;
  appFiber.return = hostRootFiber;

  renderFiber(appFiber, document);
  commit(hostRootFiber);

  function update() {
    const current = hostRootFiber.child;
    const wip = createWorkInProgress(current, current.pendingProps); // same reference, deliberately
    wip.return = hostRootFiber;
    hostRootFiber.child = wip;
    renderFiber(wip, document);
    commit(hostRootFiber);
  }
  scheduleUpdateFn = update;

  return { hostRootFiber, update, forEachFiber: (fn) => forEachFiber(hostRootFiber, fn) };
}
