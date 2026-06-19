/** Parse a single CSV line respecting quoted fields. */
export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function normalizeHeader(name) {
  return name.replace(/^"|"$/g, '').trim().toLowerCase();
}

function findColumnIndex(headers, aliases) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseFloatOrNull(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function extractBm3Html(content) {
  const dataMatch = content.match(/<pre\s+id="log-data"[^>]*>([\s\S]*?)<\/pre>/i);
  if (!dataMatch) throw new Error('Bootmod3 HTML export missing log-data block.');
  const nameMatch = content.match(/<pre\s+id="log-name"[^>]*>([\s\S]*?)<\/pre>/i);
  const mapName = nameMatch ? nameMatch[1].trim() : null;
  return { csvText: dataMatch[1], mapName };
}

const BM3_ALIASES = {
  t: ['time'],
  coolant: ['coolant temp[f]'],
  iat: ['iat[f]'],
  oil: ['oil temp[f]'],
  speed: ['vehicle speed[mph]'],
  boost: ['boost (pre-throttle)[psig]'],
};

const BL_ALIASES = {
  t: ['time'],
  coolant: ['coolant temperature'],
  iat: ['intake air temperature'],
  oil: ['oil temperature'],
  speed: [],
  boost: [],
};

function detectFormat(csvText) {
  const firstLine = csvText.split(/\r?\n/)[0] ?? '';
  const headers = parseCsvLine(firstLine).map(normalizeHeader);

  if (headers.some(h => h.includes('coolant temp[f]') || h.includes('vehicle speed[mph]'))) {
    return { source: 'bootmod3', aliases: BM3_ALIASES };
  }
  if (headers.includes('coolant temperature') && headers.includes('intake air temperature')) {
    return { source: 'bimmerlink', aliases: BL_ALIASES };
  }
  throw new Error('Unrecognized datalog format. Expected Bootmod3 or BimmerLink CSV.');
}

function isValidSample(val) {
  return val !== null && Number.isFinite(val);
}

function countValid(rows, key) {
  return rows.filter(r => isValidSample(r[key])).length;
}

function parseRows(csvText, source, aliases) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('Datalog file has no data rows.');

  const headers = parseCsvLine(lines[0]);
  const colIdx = {};
  for (const [key, aliasList] of Object.entries(aliases)) {
    colIdx[key] = aliasList.length ? findColumnIndex(headers, aliasList) : -1;
  }

  if (colIdx.t === -1) throw new Error('Missing required Time column.');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const t = parseFloatOrNull(fields[colIdx.t]);
    if (!isValidSample(t)) continue;

    const row = { t };
    for (const key of ['coolant', 'iat', 'oil', 'speed', 'boost']) {
      const idx = colIdx[key];
      let val = idx >= 0 ? parseFloatOrNull(fields[idx]) : null;

      if (source === 'bimmerlink' && ['coolant', 'iat', 'oil'].includes(key) && t < 30 && val === 0) {
        val = null;
      }
      row[key] = val;
    }
    rows.push(row);
  }

  if (rows.length < 2) throw new Error('Not enough valid data rows after parsing.');

  rows.sort((a, b) => a.t - b.t);

  const channels = {
    coolant: countValid(rows, 'coolant') >= 2,
    iat: countValid(rows, 'iat') >= 2,
    oil: countValid(rows, 'oil') >= 2,
    speed: countValid(rows, 'speed') >= 2,
    boost: countValid(rows, 'boost') >= 2,
  };

  if (!channels.coolant && !channels.iat && !channels.oil) {
    throw new Error('No temperature channels found in datalog.');
  }

  return { rows, source, channels };
}

/**
 * Parse Bootmod3 or BimmerLink datalog content (CSV or BM3 HTML export).
 * @returns {{ rows, source, channels, mapName, fileName }}
 */
export function parseDatalog(content, fileName = '') {
  let csvText = content;
  let mapName = null;

  const trimmed = content.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    const extracted = extractBm3Html(content);
    csvText = extracted.csvText;
    mapName = extracted.mapName;
  }

  const { source, aliases } = detectFormat(csvText);
  const { rows, channels } = parseRows(csvText, source, aliases);

  return { rows, source, channels, mapName, fileName };
}
