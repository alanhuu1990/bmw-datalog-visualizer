function parseCoord(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Extract lat/lon from a device_tracker history state. */
export function extractGpsFromHaState(state) {
  const attrs = state.attributes ?? {};
  const lat = parseCoord(attrs.latitude);
  const lon = parseCoord(attrs.longitude);
  if (lat == null || lon == null) return null;
  if (lat === 0 && lon === 0) return null;
  const iso = state.last_updated || state.last_changed;
  if (!iso) return null;
  return { iso, lat, lon };
}

/** Parse HA history API response (array of entity arrays). */
export function parseHaHistoryResponse(data) {
  if (!Array.isArray(data)) return [];
  const samples = [];
  for (const entityHistory of data) {
    if (!Array.isArray(entityHistory)) continue;
    for (const item of entityHistory) {
      if (!item || typeof item !== 'object') continue;
      const sample = extractGpsFromHaState(item);
      if (sample) samples.push(sample);
    }
  }
  samples.sort((a, b) => a.iso.localeCompare(b.iso));
  return samples;
}

export function gpsChannelAvailable(track) {
  return track.length >= 2;
}

export function buildHaHistoryUrl(baseUrl, entityId, startIso, endIso) {
  const base = baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    filter_entity_id: entityId,
    end_time: endIso,
  });
  return `${base}/api/history/period/${encodeURIComponent(startIso)}?${params}`;
}
