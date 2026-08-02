// Module 02 — the modern "automatic JSX runtime" entry points.
// Reimplements react/jsx-runtime's `jsx` and `jsxs`, checked line-by-line
// against react@18.3.1's real react-jsx-runtime.development.js (functions
// `jsxDEV` and `ReactElement`).
//
// This is a DIFFERENT calling convention from Module 01's createElement:
//   createElement(type, config, ...children)   -- children as varargs
//   jsx(type, props, key)                       -- children already inside props;
//                                                   key is a separate 3rd argument
// Both produce the identical element shape. The difference is entirely in
// *who* is responsible for assembling `props.children` — for createElement,
// the runtime function collapses the varargs; for jsx/jsxs, the compiler
// (esbuild/Babel) already built `props.children` before the call, and picks
// jsx vs jsxs based on whether it can see, at compile time, that there will
// be 0-or-1 children (jsx) or a known-static list of 2+ (jsxs).

export const REACT_ELEMENT_TYPE = Symbol.for('react.element');
const RESERVED_PROPS = { key: true, ref: true };

function hasValidKey(config) {
  return config != null && config.key !== undefined;
}
function hasValidRef(config) {
  return config != null && config.ref !== undefined;
}

/**
 * @param {string|Function} type
 * @param {object} config  - already has `children` inside it; built by the compiler
 * @param {string|number} [maybeKey] - a key from a spread key, if any (see real source)
 */
function jsxImpl(type, config, maybeKey) {
  const props = {};
  let key = null;
  let ref = null;

  // Real React checks the positional maybeKey FIRST, then lets an explicit
  // `key` inside config override it. This ordering matters only for the
  // edge case of `<div {...props} key="explicit" />` — out of scope here,
  // documented, not reimplemented (see DECISIONS.md).
  if (maybeKey !== undefined) key = '' + maybeKey;
  if (hasValidKey(config)) key = '' + config.key;
  if (hasValidRef(config)) ref = config.ref;

  for (const propName in config) {
    if (
      Object.prototype.hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (const propName in defaultProps) {
      if (props[propName] === undefined) props[propName] = defaultProps[propName];
    }
  }

  return { $$typeof: REACT_ELEMENT_TYPE, type, key, ref, props };
}

// jsx and jsxs are the SAME function in real React too (see DECISIONS.md —
// the real source's own comment: "we may want to special case jsxs
// internally... for now we can ship identical prod functions"). The split
// into two names exists entirely so the compiler can communicate "I know
// this is a static list of children" to future optimizations and dev-mode
// key-uniqueness warnings — not because the two do different work today.
export function jsx(type, config, maybeKey) {
  return jsxImpl(type, config, maybeKey);
}
export function jsxs(type, config, maybeKey) {
  return jsxImpl(type, config, maybeKey);
}

export function isElement(value) {
  return typeof value === 'object' && value !== null && value.$$typeof === REACT_ELEMENT_TYPE;
}
