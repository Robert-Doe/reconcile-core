// Builds a tree where exactly ONE deeply-nested fiber changed, bubbles
// subtreeFlags bottom-up for real, then runs collectEffects and PROVES
// pruning happened — not by checking the answer alone, but by counting
// how many fibers were actually visited versus how many exist in total.
// Run from this folder: node verify.mjs
import { createFiber, appendChild, forEachFiber, HostComponent } from '../module_03_fiber_node/fiber.js';
import { bubbleProperties, collectEffects, Placement, NoFlags } from './effectList.js';

function node(label) {
  const f = createFiber(HostComponent, null, {});
  f.type = label;
  return f;
}

//            root
//         /    |    \
//     branchA branchB branchC
//       |        |        |
//     leafA1   leafB1   leafC1
//                          |
//                      leafC1a  ← ONLY this one gets Placement
const root = node('root');
const branchA = node('branchA'), branchB = node('branchB'), branchC = node('branchC');
appendChild(root, branchA); appendChild(root, branchB); appendChild(root, branchC);
const leafA1 = node('leafA1'), leafB1 = node('leafB1'), leafC1 = node('leafC1');
appendChild(branchA, leafA1); appendChild(branchB, leafB1); appendChild(branchC, leafC1);
const leafC1a = node('leafC1a');
appendChild(leafC1, leafC1a);
leafC1a.flags |= Placement; // the ONE real change in this whole tree

// Post-order bubble (children before parents) — test scaffolding, not
// part of the module itself, standing in for what Module 06's completed
// work loop would do at each fiber's "complete" step.
function postOrderBubble(fiber) {
  let child = fiber.child;
  while (child !== null) {
    postOrderBubble(child);
    child = child.sibling;
  }
  bubbleProperties(fiber);
}
postOrderBubble(root);

let allPass = true;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${label}: ${ok ? 'PASS' : 'FAIL (actual=' + JSON.stringify(actual) + ')'}`);
  if (!ok) allPass = false;
}

console.log('=== subtreeFlags bubbled correctly ===');
check('root.subtreeFlags has Placement bit set', (root.subtreeFlags & Placement) !== 0, true);
check('branchA.subtreeFlags === NoFlags (nothing changed under it)', branchA.subtreeFlags, NoFlags);
check('branchB.subtreeFlags === NoFlags (nothing changed under it)', branchB.subtreeFlags, NoFlags);
check('branchC.subtreeFlags has Placement bit set (the change is under here)', (branchC.subtreeFlags & Placement) !== 0, true);
check('leafA1.subtreeFlags === NoFlags (it is a leaf with no children)', leafA1.subtreeFlags, NoFlags);

console.log('\n=== collectEffects finds exactly the one changed fiber ===');
const visitCount = { value: 0 };
const effects = collectEffects(root, visitCount);
check('effects contains exactly leafC1a', effects.map((f) => f.type), ['leafC1a']);

console.log('\n=== proof of pruning: visited fibers vs. total fibers ===');
let totalFibers = 0;
forEachFiber(root, () => { totalFibers++; });
console.log('Total fibers in the tree:', totalFibers);
console.log('Fibers actually visited by collectEffects:', visitCount.value);
const prunedSomething = visitCount.value < totalFibers;
check('collectEffects visited FEWER fibers than exist (branchA/branchB subtrees were skipped)', prunedSomething, true);
// Specifically: branchA and branchB's leaves (leafA1, leafB1) should NEVER
// have been visited, since their subtreeFlags were NoFlags.
// root + branchA + branchB + branchC + leafC1 + leafC1a = 6 visited;
// leafA1 + leafB1 = 2 fibers correctly skipped; total = 8.
check('total fiber count is 8', totalFibers, 8);
check('exactly 6 fibers visited (2 skipped: leafA1, leafB1)', visitCount.value, 6);

console.log('\n=== bailout short-circuit: a bailed-out fiber copies subtreeFlags, does not re-scan ===');
{
  const current = node('memoized');
  const child = node('child');
  appendChild(current, child);
  postOrderBubble(current);
  current.subtreeFlags = 999; // an arbitrary marker value, standing in for "whatever it was last render"

  // Simulate a workInProgress fiber that bailed out: same .child reference.
  const wip = node('memoized');
  wip.alternate = current;
  current.alternate = wip;
  wip.child = current.child; // ← THE bailout signature from Module 10

  bubbleProperties(wip);
  check('bailed-out fiber COPIES subtreeFlags from its alternate, does not recompute', wip.subtreeFlags, 999);
}

console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
