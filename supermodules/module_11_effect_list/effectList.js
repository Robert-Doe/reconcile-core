// Module 11 — "the effect list," and the real surprise: in react-dom@18.3.1
// as actually installed in this repo, there is NO separate linked list of
// effects anymore. Grepping the real source turns up no `firstEffect`/
// `lastEffect` fields at all — only `subtreeFlags`, a bitmask bubbled
// bottom-up during completion (react-dom.development.js:21923-21970,
// function `bubbleProperties`), and `nextEffect`, which is just a CURSOR
// re-walking the real fiber tree during commit, pruned by that bitmask
// (react-dom.development.js:22990-23003). "Effect list" is a name that
// outlived the linked list it originally described.
import { HostComponent, HostText } from '../module_03_fiber_node/fiber.js';

export const NoFlags = 0;
export const Placement = 2;
export const Update = 4;

/**
 * Runs during the "complete" step of the work loop (Module 06's
 * completeUnitOfWork position) for ONE fiber, after all its children have
 * already completed. Verified against real `bubbleProperties`
 * (line-cited above): OR every immediate child's `subtreeFlags | flags`
 * into this fiber's `subtreeFlags`. One level only — by the time this
 * runs, each child already bubbled ITS children into ITS OWN subtreeFlags,
 * so one level of OR-ing here is enough to represent everything below.
 *
 * The short-circuit for a bailed-out fiber (Module 10) is real too: if
 * this fiber's child subtree is IDENTICAL to last render's (proven by
 * `alternate.child === child`, the same reference-equality evidence
 * Module 10 produced), there is nothing new to bubble — reuse last
 * render's subtreeFlags outright.
 */
export function bubbleProperties(completedWork) {
  const didBailout = completedWork.alternate !== null && completedWork.alternate.child === completedWork.child;

  if (didBailout) {
    completedWork.subtreeFlags = completedWork.alternate.subtreeFlags;
    return;
  }

  let subtreeFlags = NoFlags;
  let child = completedWork.child;
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child = child.sibling;
  }
  completedWork.subtreeFlags |= subtreeFlags;
}

/**
 * A SECOND traversal, over the SAME tree Module 06 built, pruned by the
 * bitmask `bubbleProperties` just computed. If a fiber's `subtreeFlags`
 * is `NoFlags`, NOTHING inside that entire branch changed — skip it,
 * children and all, without visiting a single fiber inside it.
 * `visitCount` is test/demo instrumentation, standing in for real
 * per-fiber commit work, so this module can prove how much got skipped.
 */
export function collectEffects(root, visitCount = { value: 0 }) {
  const effects = [];
  function walk(fiber) {
    visitCount.value++;
    if (fiber.flags !== NoFlags) effects.push(fiber);
    if (fiber.subtreeFlags === NoFlags) return; // ← the entire branch is pruned here
    let child = fiber.child;
    while (child !== null) {
      walk(child);
      child = child.sibling;
    }
  }
  walk(root);
  return effects;
}
