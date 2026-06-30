import { headerToKey, parseUnitFromLabel, getDefaultSelectedKeys, THERMAL_ROLES } from './columnMeta.js';

export { getDefaultSelectedKeys, THERMAL_ROLES };

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

function buildRoleByIndex(headers, aliases) {
  const roleByIndex = {};
  for (const [role, aliasList] of Object.entries(aliases)) {
    if (role === 't' || !aliasList.length) continue;
    const idx = findColumnIndex(headers, aliasList);
    if (idx >= 0) roleByIndex[idx] = role;
  }
  return roleByIndex;
}

function isPlottableColumn(fields, colIdx) {
  let numeric = 0;
  let total = 0;
  const sampleSize = Math.min(fields.length, 50);
  for (let i = 1; i < sampleSize; i++) {
    const val = fields[i]?.[colIdx];
    if (val === undefined || val === '') continue;
    total++;
    if (parseFloatOrNull(val) !== null) numeric++;
  }
  return total === 0 || numeric / total >= 0.5;
}

function parseRows(csvText, source, aliases) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('Datalog file has no data rows.');

  const headers = parseCsvLine(lines[0]);
  const timeIdx = findColumnIndex(headers, aliases.t);
  if (timeIdx === -1) throw new Error('Missing required Time column.');

  const roleByIndex = buildRoleByIndex(headers, aliases);
  const usedKeys = new Set();

  const columnDefs = [];
  for (let i = 0; i < headers.length; i++) {
    if (i === timeIdx) continue;
    const label = headers[i].replace(/^"|"$/g, '').trim();
    if (!label) continue;

    let key = headerToKey(label);
    if (usedKeys.has(key)) {
      let n = 2;
      while (usedKeys.has(`${key}_${n}`)) n++;
      key = `${key}_${n}`;
    }
    usedKeys.add(key);

    columnDefs.push({
      key,
      label,
      unit: parseUnitFromLabel(label),
      role: roleByIndex[i] ?? null,
      colIdx: i,
    });
  }

  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const fields = parseCsvLine(lines[li]);
    const t = parseFloatOrNull(fields[timeIdx]);
    if (!isValidSample(t)) continue;

    const row = { t };
    for (const col of columnDefs) {
      let val = parseFloatOrNull(fields[col.colIdx]);
      if (
        source === 'bimmerlink'
        && col.role
        && ['coolant', 'iat', 'oil'].includes(col.role)
        && t < 30
        && val === 0
      ) {
        val = null;
      }
      row[col.key] = val;
    }
    rows.push(row);
  }

  if (rows.length < 2) throw new Error('Not enough valid data rows after parsing.');

  rows.sort((a, b) => a.t - b.t);

  const columns = columnDefs
    .map(({ key, label, unit, role }) => ({
      key,
      label,
      unit,
      role,
      validCount: countValid(rows, key),
    }))
    .filter(c => c.validCount >= 2);

  if (columns.length === 0) {
    throw new Error('No plottable numeric columns found in datalog.');
  }

  return { rows, source, columns };
}

/**
 * Parse Bootmod3 or BimmerLink datalog content (CSV or BM3 HTML export).
 * @returns {{ rows, source, columns, mapName, fileName }}
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
  const { rows, columns } = parseRows(csvText, source, aliases);

  return { rows, source, columns, mapName, fileName };
}
