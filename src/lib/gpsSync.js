/** @typedef {'off' | 'start' | 'end'} GpsSyncMode */

export const SYNC_MODES = {
  OFF: 'off',
  START: 'start',
  END: 'end',
};

export const SYNC_MODE_LABELS = {
  [SYNC_MODES.OFF]: 'No sync (route only)',
  [SYNC_MODES.START]: 'Align starts',
  [SYNC_MODES.END]: 'Align ends',
};

/**
 * Seconds into the datalog timeline when GPS t=0 begins.
 * End-align: datalog tail matches GPS tail → leading gap has no map position.
 */
export function computeGpsOffset(syncMode, datalogDuration, gpsDuration, manualOffsetSec = 0) {
  if (syncMode === SYNC_MODES.OFF) return null;
  if (syncMode === SYNC_MODES.START) return manualOffsetSec;
  if (syncMode === SYNC_MODES.END) {
    return datalogDuration - gpsDuration + manualOffsetSec;
  }
  return manualOffsetSec;
}

/** Map datalog playback time → GPS track time, or null if outside GPS window. */
export function datalogTimeToGpsTime(datalogT, syncMode, datalogDuration, gpsDuration, manualOffsetSec = 0) {
  if (syncMode === SYNC_MODES.OFF) return null;
  const offset = computeGpsOffset(syncMode, datalogDuration, gpsDuration, manualOffsetSec);
  const gpsT = datalogT - offset;
  if (gpsT < 0 || gpsT > gpsDuration) return null;
  return gpsT;
}

/** Interpolate lat/lon on a GPS track at relative time t (seconds from track start). */
export function interpGps(points, t) {
  const N = points.length;
  if (N === 0) return null;
  if (t <= points[0].t) return { lat: points[0].lat, lon: points[0].lon, t: points[0].t };
  if (t >= points[N - 1].t) return { lat: points[N - 1].lat, lon: points[N - 1].lon, t: points[N - 1].t };

  let lo = 0;
  let hi = N - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) lo = mid;
    else hi = mid;
  }

  const p0 = points[lo];
  const p1 = points[hi];
  const span = p1.t - p0.t;
  const f = span > 0 ? (t - p0.t) / span : 0;

  return {
    lat: p0.lat + f * (p1.lat - p0.lat),
    lon: p0.lon + f * (p1.lon - p0.lon),
    t,
  };
}

/** GPS points visible up to gpsT (for progressive route reveal during playback). */
export function gpsPathUpTo(points, gpsT) {
  if (!points.length || gpsT == null) return [];
  const path = points.filter(p => p.t <= gpsT);
  if (path.length === 0) return [points[0]];
  const pos = interpGps(points, gpsT);
  if (pos && path[path.length - 1].t < gpsT) {
    path.push({ t: pos.t, lat: pos.lat, lon: pos.lon });
  }
  return path;
}

/** Describe sync gap when datalog is longer than GPS (end-align). */
export function describeSyncGap(syncMode, datalogDuration, gpsDuration, manualOffsetSec = 0) {
  if (syncMode !== SYNC_MODES.END || datalogDuration <= 0 || gpsDuration <= 0) return null;
  const offset = computeGpsOffset(syncMode, datalogDuration, gpsDuration, manualOffsetSec);
  if (offset <= 0) return null;
  return {
    gapSec: offset,
    mapStartsAt: offset,
  };
}
