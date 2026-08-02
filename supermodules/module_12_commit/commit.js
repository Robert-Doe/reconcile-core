// Module 12 — the commit: where every recorded intention (Placement flags
// from Module 09, deletions from Module 08, subtreeFlags pruning from
// Module 11) finally becomes real appendChild/insertBefore/removeChild
// calls on a real DOM. Verified structurally against real
// react-dom@18.3.1's actual appendAllChildren, getHostSibling,
// commitPlacement, and insertOrAppendPlacementNode
// (react-dom.development.js:21771-21800, 23815-23945).
import { HostComponent, HostText, HostRoot, FunctionComponent } from '../module_03_fiber_node/fiber.js';
import { bubbleProperties, collectEffects, Placement } from '../module_11_effect_list/effectList.js';

// --- Building real DOM nodes (the "complete" half — runs bottom-up) ---

function setInitialProperties(instance, props) {
  for (const key of Object.keys(props)) {
    if (key === 'children') continue;
    if (key === 'className') instance.className = props[key];
    else if (key === 'style' && typeof props[key] === 'object') {
      Object.assign(instance.style, props[key]);
    } else if (typeof props[key] === 'string' || typeof props[key] === 'number' || typeof props[key] === 'boolean') {
      instance.setAttribute(key, props[key]);
    }
    // Event handlers (onClick, etc.) are real React's biggest remaining
    // surface here (synthetic event delegation) — out of scope for this
    // course; see ROADMAP.md.
  }
}

function updateProperties(instance, oldProps, newProps) {
  for (const key of Object.keys(oldProps)) {
    if (key === 'children' || key === 'className' || key === 'style') continue;
    if (!(key in newProps)) instance.removeAttribute(key);
  }
  setInitialProperties(instance, newProps);
}

/**
 * Real React's actual algorithm (react-dom.development.js:21771-21800),
 * transcribed with the same non-recursive, return-pointer-patching shape:
 * walk `workInProgress`'s descendants, appending every HOST descendant's
 * `stateNode` into `parent`, in order — stopping the instant we walk back
 * up to `workInProgress` itself.
 */
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      parent.appendChild(node.stateNode);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === workInProgress) return;
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) return;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

/**
 * Runs once per fiber, bottom-up (Module 06's completion position),
 * BEFORE commit. Creates real (but still detached/off-screen) DOM nodes
 * for new host fibers, or updates existing ones in place for reused
 * fibers — matching real React's split between "build/update the
 * instance" (here) and "attach it to the live document" (commitPlacement,
 * below).
 */
export function completeDomWork(fiber, document) {
  if (fiber.tag === HostComponent) {
    if (fiber.stateNode === null) {
      const instance = document.createElement(fiber.type);
      setInitialProperties(instance, fiber.pendingProps);
      appendAllChildren(instance, fiber);
      fiber.stateNode = instance;
    } else {
      const oldProps = fiber.alternate ? fiber.alternate.memoizedProps : fiber.memoizedProps;
      if (oldProps !== fiber.pendingProps) {
        updateProperties(fiber.stateNode, oldProps || {}, fiber.pendingProps);
      }
      fiber.stateNode = fiber.alternate ? fiber.alternate.stateNode || fiber.stateNode : fiber.stateNode;
    }
  } else if (fiber.tag === HostText) {
    if (fiber.stateNode === null) {
      fiber.stateNode = document.createTextNode(fiber.pendingProps);
    } else {
      const oldText = fiber.alternate ? fiber.alternate.memoizedProps : fiber.memoizedProps;
      if (oldText !== fiber.pendingProps) fiber.stateNode.textContent = fiber.pendingProps;
    }
  }
  bubbleProperties(fiber);
}

/** Post-order (children-before-parents) walk, calling completeDomWork at each fiber. */
export function completeAllWork(root, document) {
  function walk(fiber) {
    let child = fiber.child;
    while (child !== null) { walk(child); child = child.sibling; }
    completeDomWork(fiber, document);
  }
  walk(root);
}

// --- Attaching to the real, live document (the "commit" half) ---

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function getHostParentFiber(fiber) {
  let node = fiber.return;
  while (node !== null) {
    if (isHostParent(node)) return node;
    node = node.return;
  }
  throw new Error('No host parent found.');
}

/**
 * Real React's actual forward search (react-dom.development.js:23815-23861),
 * simplified: find the next fiber, in tree order, that is ALREADY a stable
 * (non-`Placement`) host node — that's the real DOM node to insert before.
 * `null` means "insert at the end."
 */
function getHostSibling(fiber) {
  let node = fiber;
  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) return null;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
    while (node.tag !== HostComponent && node.tag !== HostText) {
      if (node.flags & Placement) continue siblings;
      if (node.child === null) continue siblings;
      node.child.return = node;
      node = node.child;
    }
    if (!(node.flags & Placement)) return node.stateNode;
  }
}

/** Real React's actual recursive descend-if-not-host insertion helper. */
function insertOrAppendPlacementNode(node, before, parent) {
  const isHost = node.tag === HostComponent || node.tag === HostText;
  if (isHost) {
    if (before) parent.insertBefore(node.stateNode, before);
    else parent.appendChild(node.stateNode);
  } else {
    let child = node.child;
    while (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      child = child.sibling;
    }
  }
}

export function commitPlacement(fiber) {
  const parentFiber = getHostParentFiber(fiber);
  const parent = parentFiber.tag === HostRoot ? parentFiber.stateNode.containerInfo : parentFiber.stateNode;
  const before = getHostSibling(fiber);
  insertOrAppendPlacementNode(fiber, before, parent);
}

function removeHostDescendants(fiber, parent) {
  if (fiber.tag === HostComponent || fiber.tag === HostText) {
    parent.removeChild(fiber.stateNode);
    return;
  }
  let child = fiber.child;
  while (child !== null) { removeHostDescendants(child, parent); child = child.sibling; }
}

export function commitDeletions(parentFiber) {
  if (!parentFiber.deletions) return;
  const hostParentFiber = isHostParent(parentFiber) ? parentFiber : getHostParentFiber(parentFiber);
  const parent = hostParentFiber.tag === HostRoot ? hostParentFiber.stateNode.containerInfo : hostParentFiber.stateNode;
  for (const deleted of parentFiber.deletions) {
    removeHostDescendants(deleted, parent);
  }
  parentFiber.deletions = null;
}

/**
 * The whole commit, top to bottom: build/update every host instance
 * (bottom-up), then walk the pruned effect list (Module 11) and act on
 * each flagged fiber — placements first (so deletions can't remove
 * something a placement still expects to find), then run deletions
 * recorded anywhere in the tree.
 */
export function commitRoot(rootFiber, document) {
  completeAllWork(rootFiber, document);
  const effects = collectEffects(rootFiber);
  for (const fiber of effects) {
    if (fiber.flags & Placement) commitPlacement(fiber);
  }
  function walkDeletions(fiber) {
    if (fiber.deletions) commitDeletions(fiber);
    let child = fiber.child;
    while (child !== null) { walkDeletions(child); child = child.sibling; }
  }
  walkDeletions(rootFiber);
}
