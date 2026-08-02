// TEST SCAFFOLDING ONLY — not part of the taught mechanism, not a real DOM
// implementation. Node has no built-in `document`, and this repo has no
// jsdom installed. This is the smallest possible stand-in that supports
// exactly what commit.js's real DOM calls need — createElement,
// createTextNode, appendChild, insertBefore, removeChild, setAttribute,
// className, style, textContent — so `node verify.mjs` can exercise the
// REAL commit.js logic and check REAL resulting structure, without a
// browser. Module 12's tutorial.html additionally runs the same engine in
// an actual browser tab, against the actual DOM, as the authoritative
// proof — this file exists only so the command-line check also works.

class FakeNode {
  constructor() { this.parentNode = null; }
}

export class FakeText extends FakeNode {
  constructor(text) { super(); this.nodeType = 3; this.textContent = text; }
}

export class FakeElement extends FakeNode {
  constructor(tagName) {
    super();
    this.nodeType = 1;
    this.tagName = tagName;
    this.childNodes = [];
    this.attributes = new Map();
    this.style = {};
    this._className = '';
  }
  get className() { return this._className; }
  set className(v) { this._className = v; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  insertBefore(node, referenceNode) {
    if (referenceNode == null) return this.appendChild(node);
    if (node.parentNode) node.parentNode.removeChild(node);
    const idx = this.childNodes.indexOf(referenceNode);
    if (idx === -1) throw new Error('referenceNode not found among children');
    node.parentNode = this;
    this.childNodes.splice(idx, 0, node);
    return node;
  }
  removeChild(node) {
    const idx = this.childNodes.indexOf(node);
    if (idx === -1) throw new Error('node not found among children');
    this.childNodes.splice(idx, 1);
    node.parentNode = null;
    return node;
  }
}

export const fakeDocument = {
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => new FakeText(text),
};

/** Serializes a fake DOM subtree into a readable HTML-like string, for assertions. */
export function serialize(node) {
  if (node.nodeType === 3) return node.textContent;
  const attrs = [];
  if (node.className) attrs.push(`class="${node.className}"`);
  for (const [k, v] of node.attributes) attrs.push(`${k}="${v}"`);
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
  const inner = node.childNodes.map(serialize).join('');
  return `<${node.tagName}${attrStr}>${inner}</${node.tagName}>`;
}
