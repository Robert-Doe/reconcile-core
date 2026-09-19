// Module 04 — turning an element tree (Module 01/02) into a fiber tree
// (Module 03), on first render ("mount"). Structurally mirrors real React's
// approach: a FunctionComponent fiber's children come from CALLING the
// function to get its returned element, then mounting THAT — verified
// against real react-dom's updateFunctionComponent → renderWithHooks →
// reconcileChildren flow (react-dom.development.js:19585-19624 calls
// renderWithHooks to obtain nextChildren before reconciling them; see
// DECISIONS.md for the exact citation).
import { createFiber, appendChild, FunctionComponent, HostComponent, HostText } from '../module_03_fiber_node/fiber.js';
import { isElement } from '../module_02_jsx_desugar/jsx.js';

/**
 * Flattens `props.children` (undefined | bare value | array, possibly
 * nested) into a flat list, dropping null/undefined/boolean — exactly the
 * three "renders to nothing" values real React drops during child
 * reconciliation, so `{condition && <X/>}` (false) and `{maybe}` (undefined)
 * silently disappear instead of becoming a fiber.
 */
export function normalizeChildren(children) {
  const out = [];
  function visit(child) {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (Array.isArray(child)) {
      for (const c of child) visit(c);
      return;
    }
    out.push(child);
  }
  visit(children);
  return out;
}

/** Creates ONE fiber for one element or text value. Does not mount children. */
function createFiberFromElement(elementOrText) {
  if (typeof elementOrText === 'string' || typeof elementOrText === 'number') {
    return createFiber(HostText, null, String(elementOrText));
  }
  if (!isElement(elementOrText)) {
    throw new Error('mount() only accepts elements, strings, and numbers as children.');
  }
  const { type, key, props } = elementOrText;
  const tag = typeof type === 'function' ? FunctionComponent : HostComponent;
  const fiber = createFiber(tag, key, props);
  fiber.type = type;
  return fiber;
}

/**
 * Mounts one element (or string/number) into a fully-linked fiber subtree
 * and returns its root fiber. Recursive by design — Module 06 replaces the
 * recursion with an explicit loop, but the tree it PRODUCES is identical;
 * this module proves the shape is right before Module 06 proves the shape
 * can be built without the call stack.
 */
export function mount(elementOrText) {
  const fiber = createFiberFromElement(elementOrText);

  if (fiber.tag === HostText) {
    return fiber; // text nodes never have children of their own
  }

  if (fiber.tag === FunctionComponent) {
    // The defining move of a function component: call it to find out what
    // it renders, THEN mount that. The fiber for the component itself has
    // exactly one child — the fiber for whatever it returned.
    const rendered = fiber.type(fiber.pendingProps);
    const childFiber = mount(rendered);
    appendChild(fiber, childFiber);
    return fiber;
  }

  // HostComponent: children come directly from props.children.
  const children = normalizeChildren(fiber.pendingProps.children);
  for (const child of children) {
    appendChild(fiber, mount(child));
  }
  return fiber;
}
