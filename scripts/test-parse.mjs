import { readFileSync } from 'fs';
import { parseDatalog, getDefaultSelectedKeys } from '../src/lib/parseDatalog.js';
import { detectPhases } from '../src/lib/phaseDetection.js';
import { computeAmbient } from '../src/lib/ambient.js';
import { findColumnByRole } from '../src/lib/columnMeta.js';

const tests = [
  ['public/demo-commute.csv', 'demo'],
  ['datalogs/Bootmod3/6-16-2026.csv', 'bm3-html'],
  ['datalogs/BimmerLink/2026-06-16_20-19-09.csv', 'bimmerlink'],
  ['datalogs/Bootmod3/sport-cooling-enabled/6-18-2026/datalog_6a3430908551981b0fbb1e48.csv', 'bm3-full'],
];

let passed = 0;
for (const [path, label] of tests) {
  try {
    const content = readFileSync(path, 'utf8');
    const parsed = parseDatalog(content, path);
    const ambient = computeAmbient(parsed.rows, parsed.columns);
    const phases = detectPhases(parsed.rows, parsed.columns);
    const defaults = getDefaultSelectedKeys(parsed.columns);
    const coolant = findColumnByRole(parsed.columns, 'coolant');
    const iat = findColumnByRole(parsed.columns, 'iat');

    console.log(`OK ${label}: rows=${parsed.rows.length} cols=${parsed.columns.length} source=${parsed.source} ambient=${ambient.toFixed(0)} phases=${phases.hasPhases} defaults=${defaults.length} keys=[${defaults.slice(0, 4).join(', ')}]`);

    if (label === 'bm3-full' && parsed.columns.length <= 5) {
      throw new Error('expected BM3 to expose many columns');
    }
    if (defaults.length === 0) {
      throw new Error('expected default selected keys');
    }
    if (!coolant || !iat) {
      throw new Error('expected thermal role columns');
    }
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
