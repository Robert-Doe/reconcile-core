#!/usr/bin/env node
/* evaluate.mjs - `npm run evaluate`.
 *
 * Prints corpus composition (by track and sink class). The FAITHFUL evaluation
 * oracle - parse -> serialize -> reparse - requires a real browser parser, so it
 * runs in-browser: open the app (`npm run dev`) and read the "F6 - Differential
 * evaluation" panel, or open ../harness/differential_harness.html. This script
 * gives the static corpus report and the metric definitions to fill in.
 */
import { CORPUS, byTrack } from '../src/corpus/payloads.js';

const bySink = {};
for (const p of CORPUS) bySink[p.sink] = (bySink[p.sink] || 0) + 1;

console.log('='.repeat(60));
console.log(' React XSS corpus - composition report');
console.log('='.repeat(60));
console.log(` total payloads: ${CORPUS.length}`);
console.log('\n by track:');
for (const [track, items] of byTrack()) {
  console.log(`   ${track.padEnd(4)} ${items.length}  (${items.map((i) => i.id).join(', ')})`);
}
console.log('\n by sink class:');
for (const [sink, n] of Object.entries(bySink)) console.log(`   ${sink.padEnd(12)} ${n}`);

console.log('\n metrics to report (run the in-browser oracle for values):');
console.log('   - coverage per track       (neutralized / total)');
console.log('   - bypass rate              (executes with defense ON; target 0)');
console.log('   - idempotence              (sanitized output stable under reparse)');
console.log('   - benign compatibility     (benign rows preserved)');
console.log('   - commit cost              (us / host-prop commit)');
console.log('\n faithful oracle: `npm run dev` -> F6 panel, or open');
console.log('   ../harness/differential_harness.html');
console.log('='.repeat(60));
