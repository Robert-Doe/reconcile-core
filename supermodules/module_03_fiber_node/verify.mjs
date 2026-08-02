// Builds a real fiber tree with our FiberNode/appendChild, walks it with
// forEachFiber, and checks the traversal order against an independently
// hand-computed expected order — plus sanity-checks index/return/sibling
// wiring directly. Run from this folder: node verify.mjs
import { createFiber, appendChild, forEachFiber, HostComponent, HostText } from './fiber.js';

// Build:
//        App
//       / | \
//   Header Main Footer
//            |
//          Text("hi")
const App = createFiber(HostComponent, null, { as: 'App' });
const Header = createFiber(HostComponent, null, { as: 'Header' });
const Main = createFiber(HostComponent, null, { as: 'Main' });
const Footer = createFiber(HostComponent, null, { as: 'Footer' });
const Text = createFiber(HostText, null, 'hi');

appendChild(App, Header);
appendChild(App, Main);
appendChild(App, Footer);
appendChild(Main, Text);

const order = [];
forEachFiber(App, (f) => order.push(f.pendingProps.as ?? f.pendingProps));
console.log('Traversal order:', order.join(' → '));
const expected = ['App', 'Header', 'Main', 'hi', 'Footer'];
const orderMatches = JSON.stringify(order) === JSON.stringify(expected);
console.log('Expected order: ', expected.join(' → '));
console.log('Matches expected depth-first, parent-before-children order:', orderMatches);

console.log('\n--- Structural checks ---');
console.log('Header.return === App:', Header.return === App);
console.log('Footer.return === App:', Footer.return === App);
console.log('Text.return === Main:', Text.return === Main);
console.log('App.child === Header:', App.child === Header);
console.log('Header.sibling === Main:', Header.sibling === Main);
console.log('Main.sibling === Footer:', Main.sibling === Footer);
console.log('Footer.sibling === null:', Footer.sibling === null);
console.log('Header.index, Main.index, Footer.index:', Header.index, Main.index, Footer.index);
console.log('Main.child === Text:', Main.child === Text);

const structOk =
  Header.return === App && Footer.return === App && Text.return === Main &&
  App.child === Header && Header.sibling === Main && Main.sibling === Footer &&
  Footer.sibling === null && Header.index === 0 && Main.index === 1 && Footer.index === 2 &&
  Main.child === Text;

const allPass = orderMatches && structOk;
console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
