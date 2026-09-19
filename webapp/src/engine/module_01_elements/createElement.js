// Module 01 — createElement & the Element Shape.
// A from-scratch reimplementation of React.createElement's actual behavior,
// checked line-by-line against react@18.3.1's real source
// (node_modules/react/cjs/react.development.js, functions `createElement`
// and `ReactElement`, in research_reconciliation/react-lab).

// Real React tags every element with a global Symbol so that a plain JSON
// object crafted by an attacker (e.g. reflected from a server response)
// can never masquerade as a real element — JSON has no Symbol type, so
// JSON.parse can never produce a value that passes this check.
export const REACT_ELEMENT_TYPE = Symbol.for('react.element');

// Real React additionally reserves `__self` and `__source`, injected by the
// JSX compiler for dev-only warnings. This course omits them: they carry no
// reconciliation behavior, only better error messages.
const RESERVED_PROPS = { key: true, ref: true };

function hasValidKey(config) {
  return config.key !== undefined;
}

function hasValidRef(config) {
  return config.ref !== undefined;
}

/**
 * @param {string|Function} type
 * @param {object|null} config
 * @param {...any} children
 */
export function createElement(type, config, ...children) {
  const props = {};
  let key = null;
  let ref = null;

  if (config != null) {
    if (hasValidRef(config)) ref = config.ref;
    if (hasValidKey(config)) key = '' + config.key;

    for (const propName in config) {
      if (
        Object.prototype.hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        props[propName] = config[propName];
      }
    }
  }

  // Children collapse to a single value if there was exactly one, or stay
  // an array if there were zero or several. This asymmetry is not
  // arbitrary — it is why `props.children` can be a bare string in the
  // common case, instead of forcing every consumer to unwrap a 1-item array.
  const childrenLength = children.length;
  if (childrenLength === 1) {
    props.children = children[0];
  } else if (childrenLength > 1) {
    props.children = children;
  }
  // childrenLength === 0 → props.children stays undefined, exactly like real React.

  // defaultProps resolution: any prop the caller left `undefined` (not
  // merely omitted — actually `undefined`) is backfilled from
  // `type.defaultProps`. Real React does the same, gated the same way.
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (const propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
  };
}

export function isElement(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.$$typeof === REACT_ELEMENT_TYPE
  );
}
