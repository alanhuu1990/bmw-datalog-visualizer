import { readFileSync } from 'fs';
import { parseDatalog } from '../src/lib/parseDatalog.js';
import { interpAt } from '../src/hooks/usePlayback.js';

const content = readFileSync('public/demo-commute.csv', 'utf8');
const { rows, columns } = parseDatalog(content, 'demo');
const keys = columns.filter(c => c.role === 'coolant' || c.role === 'iat').map(c => c.key);

const t = (rows[0].t + rows[1].t) / 2;
const { values } = interpAt(rows, t, keys);

for (const key of keys) {
  if (!Number.isFinite(values[key])) throw new Error(`interpAt missing ${key}`);
}

const v0 = rows[0][keys[0]];
const v1 = rows[1][keys[0]];
const mid = v0 + (v1 - v0) * 0.5;
if (Math.abs(values[keys[0]] - mid) > 0.01) {
  throw new Error(`interpAt lerp failed: got ${values[keys[0]]} expected ~${mid}`);
}

console.log('OK interpAt:', keys.join(', '), 'at t=', t.toFixed(2));
