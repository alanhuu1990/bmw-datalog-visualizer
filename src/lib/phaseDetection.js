import { findColumnByRole } from './columnMeta.js';

function isValidSpeed(val) {
  return val !== null && Number.isFinite(val);
}

function findSustainedStart(rows, speedKey, threshold, minDuration) {
  let start = null;
  for (const row of rows) {
    const speed = row[speedKey];
    if (!isValidSpeed(speed)) continue;
    if (speed > threshold) {
      if (start === null) start = row.t;
      if (row.t - start >= minDuration) return start;
    } else {
      start = null;
    }
  }
  return null;
}

function findHighFlowSpans(rows, speedKey, speedThreshold = 45, minDuration = 45, mergeGap = 60) {
  const spans = [];
  let spanStart = null;
  let lastAbove = null;

  for (const row of rows) {
    const speed = row[speedKey];
    if (!isValidSpeed(speed)) continue;
    if (speed >= speedThreshold) {
      if (spanStart === null) spanStart = row.t;
      lastAbove = row.t;
    } else if (spanStart !== null && lastAbove !== null) {
      if (row.t - lastAbove > mergeGap) {
        if (lastAbove - spanStart >= minDuration) spans.push({ start: spanStart, end: lastAbove });
        spanStart = null;
        lastAbove = null;
      }
    }
  }

  if (spanStart !== null && lastAbove !== null && lastAbove - spanStart >= minDuration) {
    spans.push({ start: spanStart, end: lastAbove });
  }

  if (spans.length === 0) return null;

  return spans.reduce((best, s) => (s.end - s.start > best.end - best.start ? s : best));
}

/**
 * Auto-detect drive phases from speed data.
 * @returns {{ warmupEnd, fwStart, fwEnd, totalT, hasPhases }}
 */
export function detectPhases(rows, columns) {
  if (rows.length === 0) {
    return { warmupEnd: 0, fwStart: 0, fwEnd: 0, totalT: 0, hasPhases: false };
  }

  const totalT = rows[rows.length - 1].t;
  const speedCol = findColumnByRole(columns, 'speed');

  if (!speedCol || speedCol.validCount < 2) {
    return { warmupEnd: 0, fwStart: 0, fwEnd: 0, totalT, hasPhases: false };
  }

  const speedKey = speedCol.key;
  const movementStart = findSustainedStart(rows, speedKey, 5, 10);
  const warmupEnd = movementStart ?? Math.min(200, totalT * 0.15);

  const highFlow = findHighFlowSpans(rows, speedKey);
  if (!highFlow) {
    return { warmupEnd, fwStart: warmupEnd, fwEnd: warmupEnd, totalT, hasPhases: false };
  }

  return {
    warmupEnd,
    fwStart: highFlow.start,
    fwEnd: highFlow.end,
    totalT,
    hasPhases: true,
  };
}

export function getPhase(t, phases) {
  if (!phases.hasPhases) return 'drive';
  if (t < phases.warmupEnd) return 'warmup';
  if (t < phases.fwStart) return 'city';
  if (t < phases.fwEnd) return 'freeway';
  return 'city2';
}

export const PHASE_LABELS = {
  warmup: 'Warm-up',
  city: 'City',
  freeway: 'High-flow',
  city2: 'City',
  drive: 'Drive',
};

export const PHASE_COLORS = {
  warmup: '#60a5fa',
  city: '#86efac',
  freeway: '#4ade80',
  city2: '#94a3b8',
  drive: '#94a3b8',
};
