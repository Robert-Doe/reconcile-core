// Module 03 — the Fiber node shape and pure tree-linking/traversal helpers.
// Field names and their meanings are checked line-by-line against real
// react-dom@18.3.1's actual `FiberNode` constructor
// (node_modules/react-dom/cjs/react-dom.development.js, lines 28073-28098,
// function `FiberNode`) in research_reconciliation/react-lab. That function
// is internal (not exported by react-dom's public API), so unlike Modules
// 01-02 we can't require-and-diff live — instead this file's field names
// are a direct, line-numbered transcription of the real source (quoted in
// DECISIONS.md), and what we DO verify by running real code is our own
// traversal logic's correctness on real, constructed trees.

// Work-in-progress subset of real React's WorkTag enum (react-dom.development.js:90-100).
// We only need enough tags to distinguish "a real DOM element" from
// "a function component" from "plain text" for this course's purposes.
export const FunctionComponent = 0;
export const HostRoot = 3;
export const HostComponent = 5;
export const HostText = 6;

/**
 * A fiber node. Real React's constructor initializes ~25 fields (dev-mode
 * profiling timers, debug hooks, etc.) — we keep only the ones every later
 * module in this course actually reads or writes. Every field kept here
 * uses React's own name for it, so DECISIONS.md's line-by-line source
 * citations apply directly, with no renaming to reconcile.
 */
export function FiberNode(tag, key, pendingProps) {
  // Identity: what kind of node, and (for host components) what element type.
  this.tag = tag;
  this.key = key;
  this.type = null;       // e.g. 'div', or a function component reference
  this.stateNode = null;  // the real DOM node, once one exists (Module 04)

  // Tree structure — the ENTIRE point of this module. Three pointers,
  // nothing else, are sufficient to represent and walk any tree shape.
  this.return = null;   // parent
  this.child = null;     // first child
  this.sibling = null;   // next sibling (same parent)
  this.index = 0;        // this fiber's position among its siblings

  // Data for this render pass. "pending" because it hasn't been
  // reconciled/applied yet — Module 04 is where that happens.
  this.pendingProps = pendingProps;
  this.memoizedProps = null; // props actually applied last completed render

  // Reserved for later modules — present now so field names never change
  // underneath you: alternate (Module 05), deletions (Module 08), effect
  // tracking (Module 11).
  this.alternate = null;
  this.flags = 0;
  this.deletions = null; // children of THIS fiber marked for removal (Module 08)
}

export function createFiber(tag, key, pendingProps) {
  return new FiberNode(tag, key, pendingProps);
}

/** Links `child` as the last child of `parent`, setting `return` and `index`. */
export function appendChild(parent, child) {
  child.return = parent;
  if (parent.child === null) {
    child.index = 0;
    parent.child = child;
    return child;
  }
  let last = parent.child;
  let i = 0;
  while (last.sibling !== null) {
    last = last.sibling;
    i++;
  }
  child.index = i + 1;
  last.sibling = child;
  return child;
}

/** Depth-first, parent-before-children, using ONLY child/sibling/return. */
export function forEachFiber(root, visit) {
  let next = root;
  while (next !== null) {
    visit(next);
    if (next.child !== null) {
      next = next.child;
      continue;
    }
    let node = next;
    while (node !== null && node.sibling === null) {
      node = node.return;
    }
    next = node === null ? null : node.sibling;
  }
}
