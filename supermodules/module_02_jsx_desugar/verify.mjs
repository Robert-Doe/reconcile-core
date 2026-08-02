// Proves JSX is sugar, using the ACTUAL toolchain this repo's React app
// uses (esbuild, the same compiler Vite's dev server calls) — not a
// hypothetical description of what a compiler "would" do.
//
// Run from this folder: node verify.mjs
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = (await import('module')).createRequire(import.meta.url);
const reactLabDir = path.resolve(__dirname, '../../research_reconciliation/react-lab');
const esbuild = require(path.join(reactLabDir, 'node_modules/esbuild'));

// ---- Step 1: real JSX source, the kind a learner would actually write ----
const jsxSource = `
export function Greeting({ name }) {
  return (
    <div className="card">
      <h1>Hello, {name}</h1>
      <p>welcome</p>
    </div>
  );
}
export function SingleChild() {
  return <span>only one child</span>;
}
`;

// ---- Step 2: compile it exactly as this repo's Vite config would ----
// (jsx: 'automatic' is @vitejs/plugin-react's default, matching vite.config.js)
const compiled = esbuild.transformSync(jsxSource, {
  loader: 'jsx',
  jsx: 'automatic',
  jsxImportSource: 'react',
  format: 'esm',
});

console.log('=== REAL COMPILED OUTPUT (esbuild, jsx:"automatic", jsxImportSource:"react") ===');
console.log(compiled.code);
console.log('=== END COMPILED OUTPUT ===\n');

// ---- Step 3: run the compiled code twice — once against REAL react/jsx-runtime,
// once against our hand-written jsx.js — by swapping only the import line. ----
const realImportLine = 'import { jsx, jsxs } from "react/jsx-runtime";';
if (!compiled.code.startsWith(realImportLine)) {
  console.error('UNEXPECTED: compiled output does not start with the expected import line.');
  console.error('Got:', compiled.code.slice(0, 80));
  process.exit(1);
}

const ourJsxPath = path.join(__dirname, 'jsx.js').replace(/\\/g, '/');
const oursCode = compiled.code.replace(
  realImportLine,
  `import { jsx, jsxs } from "file://${ourJsxPath}";`
);

const tmp = await mkdtemp(path.join(tmpdir(), 'jsx-desugar-'));
const realFile = path.join(tmp, 'real.mjs');
const oursFile = path.join(tmp, 'ours.mjs');
await writeFile(realFile, compiled.code);
await writeFile(oursFile, oursCode);

// realFile needs to resolve the bare specifier "react/jsx-runtime" — run it
// with react-lab's node_modules in its resolution path by placing a copy
// there instead of tmpdir. (Simplest correct fix: write it inside react-lab.)
const realFileInLab = path.join(reactLabDir, '__verify_real_jsx_tmp.mjs');
await writeFile(realFileInLab, compiled.code);

let realModule, oursModule;
try {
  realModule = await import('file://' + realFileInLab.replace(/\\/g, '/'));
  oursModule = await import('file://' + oursFile.replace(/\\/g, '/'));
} finally {
  await rm(realFileInLab, { force: true });
  await rm(tmp, { recursive: true, force: true });
}

// Strips real React's dev-only `_owner`/`_store` bookkeeping at EVERY
// nesting level (children can themselves be elements), so the comparison
// is apples-to-apples with our intentionally-simplified jsx.js.
function relevantFields(value) {
  if (Array.isArray(value)) return value.map(relevantFields);
  if (value !== null && typeof value === 'object' && value.$$typeof) {
    return {
      $$typeof: value.$$typeof.toString(),
      type: value.type,
      key: value.key,
      ref: value.ref,
      props: relevantFields(value.props),
    };
  }
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = relevantFields(value[k]);
    return out;
  }
  return value;
}
function stringify(el) {
  return JSON.stringify(relevantFields(el));
}

const realEl = realModule.Greeting({ name: 'Ada' });
const oursEl = oursModule.Greeting({ name: 'Ada' });

console.log('[Greeting] real react/jsx-runtime output:', stringify(realEl));
console.log('[Greeting] our hand-written jsx.js output:', stringify(oursEl));
const match1 = stringify(realEl) === stringify(oursEl);
console.log('[Greeting] match:', match1);

const realSingle = realModule.SingleChild();
const oursSingle = oursModule.SingleChild();
console.log('\n[SingleChild] real:', stringify(realSingle));
console.log('[SingleChild] ours:', stringify(oursSingle));
const match2 = stringify(realSingle) === stringify(oursSingle);
console.log('[SingleChild] match:', match2);

// ---- Step 4: prove jsx vs jsxs dispatch is decided AT COMPILE TIME, ----
// by checking which literal function name appears in the compiled output
// for a 1-child vs 3-child element.
const oneChild = esbuild.transformSync('const el = <p>only one</p>;', { loader: 'jsx', jsx: 'automatic' }).code;
const threeChildren = esbuild.transformSync('const el = <ul><li>a</li><li>b</li><li>c</li></ul>;', { loader: 'jsx', jsx: 'automatic' }).code;
console.log('\n=== Dispatch proof ===');
console.log('1-child compiles to:  ', oneChild.trim().split('\n').pop());
console.log('3-children compiles to:', threeChildren.trim().split('\n').pop());
const usesJsxForOne = /\bjsx\(/.test(oneChild) && !/\bjsxs\(/.test(oneChild);
const usesJsxsForThree = /\bjsxs\(/.test(threeChildren);
console.log('1-child uses jsx() not jsxs():', usesJsxForOne);
console.log('3-children uses jsxs():', usesJsxsForThree);

const allPass = match1 && match2 && usesJsxForOne && usesJsxsForThree;
console.log('\nAll checks ' + (allPass ? 'PASSED' : 'FAILED') + '.');
if (!allPass) process.exitCode = 1;
