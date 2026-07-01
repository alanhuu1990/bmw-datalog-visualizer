import { readFileSync } from 'fs';
import { parseDatalog, getDefaultSelectedKeys } from '../src/lib/parseDatalog.js';
import { detectPhases } from '../src/lib/phaseDetection.js';
import { computeAmbient } from '../src/lib/ambient.js';
import { findColumnByRole } from '../src/lib/columnMeta.js';

const tests = [
  ['public/demo-commute.csv', 'demo'],
  ['datalogs/BimmerLink/sports basement/2026-06-30_12-36-21.csv', 'bimmerlink-sports-basement'],
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

    if (label === 'bimmerlink-sports-basement') {
      const ambientCol = parsed.columns.find(c => c.role === 'ambient');
      if (!ambientCol) throw new Error('expected ambient temperature column');
      if (ambient > 80) throw new Error(`expected ambient from sensor (~75°F), got ${ambient}`);
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
