import { readFileSync } from 'fs';
import { parseDatalog } from '../src/lib/parseDatalog.js';
import { detectPhases } from '../src/lib/phaseDetection.js';
import { computeAmbient } from '../src/lib/ambient.js';

const tests = [
  ['public/demo-commute.csv', 'demo'],
  ['datalogs/Bootmod3/6-16-2026.csv', 'bm3-html'],
  ['datalogs/BimmerLink/2026-06-16_20-19-09.csv', 'bimmerlink'],
];

let passed = 0;
for (const [path, label] of tests) {
  try {
    const content = readFileSync(path, 'utf8');
    const parsed = parseDatalog(content, path);
    const ambient = computeAmbient(parsed.rows);
    const phases = detectPhases(parsed.rows, parsed.channels);
    console.log(`OK ${label}: rows=${parsed.rows.length} source=${parsed.source} ambient=${ambient.toFixed(0)} phases=${phases.hasPhases} fw=${phases.fwStart?.toFixed(0)}-${phases.fwEnd?.toFixed(0)} channels=${JSON.stringify(parsed.channels)}`);
    passed++;
  } catch (e) {
    console.error(`FAIL ${label}: ${e.message}`);
  }
}

try {
  parseDatalog('foo,bar\n1,2', 'bad.csv');
  console.error('FAIL invalid: should have thrown');
} catch {
  console.log('OK invalid: threw as expected');
  passed++;
}

console.log(`\n${passed}/${tests.length + 1} checks passed`);
process.exit(passed === tests.length + 1 ? 0 : 1);
