/** Convert HA absolute timestamps to log-relative seconds and clip to log duration. */
export function mergeHaSamplesToGpsTrack(samples, logStartIso, totalT) {
  const logStartMs = Date.parse(logStartIso);
  if (!Number.isFinite(logStartMs)) return [];

  const endT = Math.max(0, totalT);
  const track = [];

  for (const sample of samples) {
    const sampleMs = Date.parse(sample.iso);
    if (!Number.isFinite(sampleMs)) continue;
    const t = (sampleMs - logStartMs) / 1000;
    if (t < 0 || t > endT) continue;
    track.push({ t: +t.toFixed(3), lat: sample.lat, lon: sample.lon });
  }

  track.sort((a, b) => a.t - b.t);

  const deduped = [];
  for (const point of track) {
    const last = deduped[deduped.length - 1];
    if (last && last.t === point.t) {
      deduped[deduped.length - 1] = point;
    } else {
      deduped.push(point);
    }
  }

  return deduped;
}

export function logEndIso(logStartIso, totalT) {
  const startMs = Date.parse(logStartIso);
  return new Date(startMs + totalT * 1000).toISOString();
}
