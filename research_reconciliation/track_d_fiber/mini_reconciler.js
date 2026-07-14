/* mini_reconciler.js — a ~toy React-style reconciler to make Fiber concepts
   concrete and, crucially, to show WHERE the DOM sink is written (the commit
   phase) — the interception point Track F targets.

   This is NOT React. It is a pedagogical model that mirrors React's shape:
     - elements (createElement / h)
     - a fiber node with { type, props, dom, alternate, child, sibling, effect }
     - reconcileChildren (keyed diff -> PLACEMENT / UPDATE / DELETION effects)
     - a render phase (build WIP fiber tree, no DOM mutation)
     - a commit phase (apply effects -> the ONLY place the DOM is touched)

   The commit phase routes props to the DOM. Notice setProp(): this is our
   "host config", and it is exactly where dangerouslySetInnerHTML-style HTML,
   href URLs, and on* handlers become real. A defense wraps THIS function. */
(function () {
  "use strict";

  let LOG = [];
  const log = (m) => LOG.push(m);

  function h(type, props, ...children) {
    return { type, props: Object.assign({}, props, { children: children.flat() }) };
  }

  // ---- render phase: build a work-in-progress fiber tree, emit effects -----
  function reconcile(oldFiber, element) {
    // element -> a WIP fiber, diffed against oldFiber (its `alternate`).
    let effect;
    if (oldFiber && element && oldFiber.type === element.type) {
      effect = "UPDATE"; // same type -> bail out of re-creating, just update props
    } else if (element) {
      effect = "PLACEMENT"; // new type or new node -> create
    } else {
      effect = "DELETION";
    }
    const fiber = element ? {
      type: element.type,
      props: element.props,
      alternate: oldFiber || null,
      dom: (effect === "UPDATE" && oldFiber) ? oldFiber.dom : null,
      effect,
      children: [],
    } : { effect: "DELETION", alternate: oldFiber };
    return fiber;
  }

  // Keyed children diff (D2): match by key when present, else by index.
  function reconcileChildren(oldFiber, elements) {
    const oldChildren = (oldFiber && oldFiber.children) || [];
    const result = [];
    const byKey = new Map();
    oldChildren.forEach((c, i) => byKey.set(c.props && c.props.key != null ? c.props.key : "@" + i, c));

    elements.forEach((el, i) => {
      const key = (el.props && el.props.key != null) ? el.props.key : "@" + i;
      const match = byKey.get(key);
      byKey.delete(key);
      const fiber = reconcile(match, el);
      fiber.key = key;
      if (fiber.effect === "PLACEMENT") log(`  PLACEMENT <${fiber.type}> key=${key}`);
      else if (fiber.effect === "UPDATE") log(`  UPDATE <${fiber.type}> key=${key} (type match -> bail out of recreate)`);
      fiber.children = reconcileChildren(match, (el.props && el.props.children) || []);
      result.push(fiber);
    });
    // Anything left in byKey was removed.
    byKey.forEach((old, key) => log(`  DELETION <${old.type}> key=${key}`));
    return result;
  }

  // ---- commit phase: the ONLY place the DOM is mutated ---------------------
  // This is the "host config". A Track F defense wraps setProp / setInitialProps.
  let SETPROP_HOOK = null; // (dom, name, value) => value|throw   (installed by the page)

  function setProp(dom, name, value) {
    if (name === "children" || name === "key") return;
    if (SETPROP_HOOK) value = SETPROP_HOOK(dom, name, value); // <-- interception point
    if (name === "dangerouslySetInnerHTML") {
      dom.innerHTML = value && value.__html != null ? value.__html : ""; // THE SINK
      log(`  commit: dom.innerHTML = ${JSON.stringify(String(value && value.__html))}  <-- HTML SINK`);
    } else if (/^on/.test(name)) {
      dom[name.toLowerCase()] = value; // event handler property
      log(`  commit: dom.${name.toLowerCase()} = <handler>  <-- SCRIPT SINK`);
    } else if (name === "href" || name === "src") {
      dom.setAttribute(name, value); // URL sink (javascript: possible)
      log(`  commit: dom.setAttribute('${name}', ${JSON.stringify(String(value))})  <-- URL SINK`);
    } else {
      dom.setAttribute(name, value);
      log(`  commit: dom.setAttribute('${name}', ${JSON.stringify(String(value))})`);
    }
  }

  function commit(fiber, parentDom) {
    if (!fiber) return;
    if (fiber.effect === "PLACEMENT" && fiber.type) {
      if (typeof fiber.type === "string") {
        const dom = document.createElement(fiber.type);
        fiber.dom = dom;
        Object.keys(fiber.props || {}).forEach((k) => {
          if (k !== "children") setProp(dom, k, fiber.props[k]);
        });
        // text children
        (fiber.props.children || []).forEach((c) => {
          if (typeof c === "string") dom.appendChild(document.createTextNode(c)); // SAFE: text node
        });
        parentDom && parentDom.appendChild(dom);
      }
    }
    (fiber.children || []).forEach((c) => commit(c, fiber.dom || parentDom));
  }

  // Public: render `element` into `container`, returning the fiber + a log.
  function render(element, container, prevFiber) {
    LOG = [];
    log(`render phase: diffing <${element.type}>`);
    const root = reconcile(prevFiber, element);
    root.children = reconcileChildren(prevFiber, (element.props && element.props.children) || []);
    log(`commit phase: applying effects (the ONLY DOM mutation)`);
    if (container) container.innerHTML = "";
    commit(root, container);
    return { fiber: root, log: LOG.slice() };
  }

  window.MiniReconciler = {
    h, render,
    setHook: (fn) => { SETPROP_HOOK = fn; },
    clearHook: () => { SETPROP_HOOK = null; },
  };
})();
