function isValidIat(val) {
  return val !== null && Number.isFinite(val) && val > 0;
}

/**
 * Derive ambient baseline from early IAT readings.
 * Uses minimum valid IAT in the first 120s, falling back to first valid IAT in log.
 */
export function computeAmbient(rows, windowSec = 120) {
  const early = rows.filter(r => r.t <= windowSec && isValidIat(r.iat));
  const pool = early.length > 0 ? early : rows.filter(r => isValidIat(r.iat));
  if (pool.length === 0) return 70;
  return Math.min(...pool.map(r => r.iat));
}
