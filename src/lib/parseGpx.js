/** @typedef {{ t: number, lat: number, lon: number, iso: string }} GpsPoint */

const TRKPT_BLOCK_RE = /<trkpt\b[^>]*>[\s\S]*?<\/trkpt>/gi;

function parseTrkptBlock(block) {
  const latMatch = block.match(/\blat=["']([^"']+)["']/i);
  const lonMatch = block.match(/\blon=["']([^"']+)["']/i);
  const timeMatch = block.match(/<time>([^<]+)<\/time>/i);
  if (!latMatch || !lonMatch || !timeMatch) return null;
  const lat = parseFloat(latMatch[1]);
  const lon = parseFloat(lonMatch[1]);
  const iso = timeMatch[1].trim();
  const ms = Date.parse(iso);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(ms)) return null;
  return { ms, lat, lon, iso };
}

function parseTrackPoints(content) {
  const raw = [];
  let match;
  TRKPT_BLOCK_RE.lastIndex = 0;
  while ((match = TRKPT_BLOCK_RE.exec(content)) !== null) {
    const point = parseTrkptBlock(match[0]);
    if (point) raw.push(point);
  }
  return raw;
}

function parseTrackName(content) {
  const trkName = content.match(/<trk>\s*<name>([^<]+)<\/name>/i);
  if (trkName) return trkName[1].trim();
  const metaName = content.match(/<metadata>\s*<name>([^<]+)<\/name>/i);
  return metaName ? metaName[1].trim() : null;
}

/**
 * Parse GPX track points (trkpt with lat/lon/time).
 * Times are normalized to seconds from the first track point (t=0).
 * @returns {{ points: GpsPoint[], duration: number, fileName: string, name: string | null }}
 */
export function parseGpx(content, fileName = '') {
  if (!content?.trim()) throw new Error('Empty GPX file.');

  const raw = parseTrackPoints(content);
  if (raw.length < 2) {
    throw new Error('GPX file has fewer than 2 track points with timestamps.');
  }

  raw.sort((a, b) => a.ms - b.ms);

  const t0 = raw[0].ms;
  const points = raw.map(p => ({
    t: +((p.ms - t0) / 1000).toFixed(3),
    lat: p.lat,
    lon: p.lon,
    iso: p.iso,
  }));

  const duration = points[points.length - 1].t;

  return {
    points,
    duration,
    fileName,
    name: parseTrackName(content),
  };
}
