export const THERMAL_ROLES = ['coolant', 'iat', 'oil', 'speed', 'boost'];

const ROLE_COLORS = {
  coolant: '#3b82f6',
  iat: '#f59e0b',
  oil: '#ef4444',
  speed: '#10b981',
  boost: '#a78bfa',
};

const EXTRA_COLORS = [
  '#60a5fa', '#c084fc', '#f472b6', '#fb923c', '#2dd4bf',
  '#a3e635', '#e879f9', '#38bdf8', '#fbbf24', '#94a3b8',
];

const UNIT_ALIASES = {
  f: '°F',
  '°f': '°F',
  mph: 'mph',
  psig: 'psi',
  psi: 'psi',
  rpm: 'rpm',
  afr: 'AFR',
  '%': '%',
  deg: '°',
  '°': '°',
  nm: 'Nm',
  kw: 'kW',
  kg_h: 'kg/h',
  v: 'V',
};

export function headerToKey(label) {
  return label
    .replace(/^"|"$/g, '')
    .trim()
    .toLowerCase()
    .replace(/[[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function parseUnitFromLabel(label) {
  const match = label.match(/\[([^\]]+)\]\s*$/i);
  if (!match) return '';
  const raw = match[1].trim().toLowerCase();
  return UNIT_ALIASES[raw] ?? match[1].trim();
}

export function findColumnByRole(columns, role) {
  return columns.find(c => c.role === role) ?? null;
}

export function getDefaultSelectedKeys(columns) {
  const keys = [];
  for (const role of ['coolant', 'iat', 'oil', 'speed']) {
    const col = findColumnByRole(columns, role);
    if (col && col.validCount >= 2) keys.push(col.key);
  }
  if (keys.length > 0) return keys;

  return columns
    .filter(c => c.validCount >= 2)
    .slice(0, 4)
    .map(c => c.key);
}

export function getColumnColor(column, index) {
  if (column.role && ROLE_COLORS[column.role]) return ROLE_COLORS[column.role];
  return EXTRA_COLORS[index % EXTRA_COLORS.length];
}

function domainFromMinMax(min, max, paddingRatio) {
  if (!Number.isFinite(min)) return [0, 100];
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * paddingRatio;
  return [min - pad, max + pad];
}

export function autoDomain(rows, key, paddingRatio = 0.05) {
  return autoDomainForKeys(rows, [key], paddingRatio);
}

export function autoDomainForKeys(rows, keys, paddingRatio = 0.05) {
  let min = Infinity;
  let max = -Infinity;
  for (const key of keys) {
    for (const row of rows) {
      const v = row[key];
      if (v == null || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return domainFromMinMax(min, max, paddingRatio);
}

/** Assign yAxisId per unit; cap at 3 visible axes, extras share last axis. */
export function groupColumnsByUnit(columns, selectedKeys) {
  const colByKey = Object.fromEntries(columns.map(c => [c.key, c]));
  const unitOrder = [];
  const groups = {};

  for (const key of selectedKeys) {
    const col = colByKey[key];
    if (!col) continue;
    const unit = col.unit || 'value';
    if (!groups[unit]) {
      groups[unit] = { unit, keys: [], yAxisId: null };
      unitOrder.push(unit);
    }
    groups[unit].keys.push(key);
  }

  const MAX_AXES = 3;
  unitOrder.forEach((unit, i) => {
    const axisIndex = Math.min(i, MAX_AXES - 1);
    groups[unit].yAxisId = `axis_${axisIndex}`;
    groups[unit].orientation = axisIndex === 0 ? 'left' : 'right';
    groups[unit].hide = i >= MAX_AXES;
  });

  return { groups, unitOrder };
}

export function formatValue(value, unit, decimals = null) {
  if (!Number.isFinite(value)) return '—';
  const d = decimals ?? (unit === 'psi' || unit === 'AFR' ? 1 : 0);
  const formatted = value.toFixed(d);
  if (!unit) return formatted;
  if (unit === '°F' || unit === '°') return `${formatted}°`;
  if (unit === '%') return `${formatted}%`;
  return `${formatted} ${unit}`;
}

export function sortColumnsForPicker(columns) {
  const roleRank = Object.fromEntries(THERMAL_ROLES.map((r, i) => [r, i]));
  return [...columns].sort((a, b) => {
    const ra = a.role != null ? roleRank[a.role] ?? 99 : 99;
    const rb = b.role != null ? roleRank[b.role] ?? 99 : 99;
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label);
  });
}

export const SOFT_SERIES_LIMIT = 8;
