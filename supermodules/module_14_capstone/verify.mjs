// The full engine, end to end: mounts a real app (a stable Header + a
// stateful Counter), then drives TWO real state updates through the
// actual useState -> scheduleUpdate -> renderFiber -> commit pipeline —
// and proves, concretely, that Header's function body is NEVER called
// again after the first render (a real, live bailout), while Counter's
// displayed count is genuinely correct after each update.
// Run from this folder: node verify.mjs
import { createElement, useState, mountApp, memo } from './engine.js';
import { fakeDocument, serialize } from '../module_12_commit/fakeDom.mjs';

let allPass = true;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${label}: ${ok ? 'PASS' : 'FAIL (actual=' + JSON.stringify(actual) + ')'}`);
  if (!ok) allPass = false;
}

let headerRenderCount = 0;
const HEADER_PROPS = {}; // a stable reference — but see DECISIONS.md: createElement
// builds a FRESH props object every call regardless, so this alone does NOT
// give reference-equal props across renders. `memo` below is what actually
// bridges that gap, via Module 10's real shallow-equal-then-substitute trick.
const Header = memo(function HeaderImpl() {
  headerRenderCount++;
  return createElement('h1', null, 'Static Header');
});

let capturedSetCount = null;
function Counter() {
  const [count, setCount] = useState(0);
  capturedSetCount = setCount;
  return createElement('div', { className: 'counter' },
    createElement('span', null, 'count: ' + count),
  );
}

function App() {
  return createElement('div', { className: 'app' },
    createElement(Header, HEADER_PROPS),
    createElement(Counter, null),
  );
}

const container = fakeDocument.createElement('div');
const app = mountApp(createElement(App, null), container, fakeDocument);

console.log('=== After mount ===');
console.log(serialize(container));
check('initial render shows count: 0', serialize(container).includes('count: 0'), true);
check('Header rendered exactly once', headerRenderCount, 1);

const h1BeforeUpdate = app.hostRootFiber.child; // App fiber; walk to find the h1's real node
let headerNodeBefore = null;
app.forEachFiber((f) => { if (f.type === 'h1') headerNodeBefore = f.stateNode; });

console.log('\n=== Triggering setCount(c => c + 1) — a REAL click handler would call exactly this ===');
capturedSetCount((c) => c + 1);
console.log(serialize(container));
check('count now shows 1', serialize(container).includes('count: 1'), true);
check('Header STILL rendered only once (bailed out on update #1)', headerRenderCount, 1);

let headerNodeAfter1 = null;
app.forEachFiber((f) => { if (f.type === 'h1') headerNodeAfter1 = f.stateNode; });
check('the h1\'s real DOM node is the SAME object — never rebuilt', headerNodeAfter1 === headerNodeBefore, true);

console.log('\n=== Triggering a second update ===');
capturedSetCount(5); // a direct value this time, not a function — same dispatch path (Module 13)
console.log(serialize(container));
check('count now shows 5', serialize(container).includes('count: 5'), true);
check('Header STILL rendered only once across BOTH updates', headerRenderCount, 1);

console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
