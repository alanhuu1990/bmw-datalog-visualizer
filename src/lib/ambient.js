import { findColumnByRole } from './columnMeta.js';

function isValidTemp(val) {
  return val !== null && Number.isFinite(val) && val > 0;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findAmbientColumn(columns) {
  const byRole = findColumnByRole(columns, 'ambient');
  if (byRole) return byRole;
  return columns.find(c => /^ambient\s+temperature/i.test(c.label.replace(/^"|"$/g, '').trim())) ?? null;
}

/**
 * Ambient baseline for IAT delta.
 * Prefers Ambient temperature sensor when present; otherwise minimum early IAT.
 */
export function computeAmbient(rows, columns, windowSec = 120) {
  const ambientCol = findAmbientColumn(columns);
  if (ambientCol) {
    const key = ambientCol.key;
    const early = rows.filter(r => r.t <= windowSec && isValidTemp(r[key]));
    const pool = early.length > 0 ? early : rows.filter(r => isValidTemp(r[key]));
    const med = median(pool.map(r => r[key]));
    if (med != null) return med;
  }

  const iatCol = findColumnByRole(columns, 'iat');
  if (!iatCol) return 70;

  const key = iatCol.key;
  const early = rows.filter(r => r.t <= windowSec && isValidTemp(r[key]));
  const pool = early.length > 0 ? early : rows.filter(r => isValidTemp(r[key]));
  if (pool.length === 0) return 70;
  return Math.min(...pool.map(r => r[key]));
}
