/** @typedef {{ id: string, label: string, unit: string, required: boolean }} NormalizedField */

export const NORMALIZED_FIELDS = /** @type {NormalizedField[]} */ ([
  { id: 'time', label: 'Time', unit: 's', required: true },
  { id: 'rpm', label: 'RPM', unit: 'rpm', required: false },
  { id: 'speed', label: 'Speed', unit: 'mph', required: false },
  { id: 'boost', label: 'Boost', unit: 'psi', required: false },
  { id: 'boostTarget', label: 'Boost Target', unit: 'psi', required: false },
  { id: 'wgdc', label: 'WGDC', unit: '%', required: false },
  { id: 'iat', label: 'IAT', unit: '°F', required: false },
  { id: 'coolant', label: 'Coolant', unit: '°F', required: false },
  { id: 'oil', label: 'Oil', unit: '°F', required: false },
  { id: 'lambda', label: 'Lambda', unit: '', required: false },
  { id: 'hpfpTarget', label: 'HPFP Target', unit: 'psi', required: false },
  { id: 'hpfpActual', label: 'HPFP Actual', unit: 'psi', required: false },
  { id: 'torque', label: 'Torque', unit: 'Nm', required: false },
  { id: 'ignitionTiming', label: 'Ignition Timing', unit: '°', required: false },
  { id: 'knockCorrection', label: 'Knock Correction', unit: '°', required: false },
  { id: 'knockDetected', label: 'Knock Detected', unit: '', required: false },
  { id: 'throttle', label: 'Throttle', unit: '%', required: false },
]);

/** @typedef {{ pattern: string, weight: number, fieldId?: string }} SourceSignature */

export const SOURCE_SIGNATURES = {
  bootmod3: {
    maxScore: 22,
    tiers: {
      high: /** @type {SourceSignature[]} */ ([
        { pattern: 'boost (pre-throttle)[psig]', weight: 3, fieldId: 'boost' },
        { pattern: 'boost (pre-throttle)', weight: 3, fieldId: 'boost' },
      ]),
      medium: [
        { pattern: 'wgdc', weight: 2, fieldId: 'wgdc' },
        { pattern: 'hpfp target', weight: 2, fieldId: 'hpfpTarget' },
        { pattern: 'hpfp actual', weight: 2, fieldId: 'hpfpActual' },
        { pattern: 'knock correction cyl 1', weight: 2, fieldId: 'knockCorrection' },
      ],
      low: [
        { pattern: 'coolant temp[f]', weight: 1, fieldId: 'coolant' },
        { pattern: 'iat[f]', weight: 1, fieldId: 'iat' },
        { pattern: 'oil temp[f]', weight: 1, fieldId: 'oil' },
        { pattern: 'vehicle speed[mph]', weight: 1, fieldId: 'speed' },
        { pattern: 'ignition cyl 1', weight: 1, fieldId: 'ignitionTiming' },
        { pattern: 'torque (actual)', weight: 1, fieldId: 'torque' },
        { pattern: 'knock detected', weight: 1, fieldId: 'knockDetected' },
        { pattern: 'lambda', weight: 1, fieldId: 'lambda' },
      ],
    },
  },
  bimmerlink: {
    maxScore: 11,
    tiers: {
      high: [
        { pattern: 'coolant temperature', weight: 2, fieldId: 'coolant' },
        { pattern: 'intake air temperature', weight: 2, fieldId: 'iat' },
        { pattern: 'oil temperature', weight: 2, fieldId: 'oil' },
      ],
      medium: [
        { pattern: 'engine speed', weight: 1, fieldId: 'rpm' },
        { pattern: 'vehicle speed', weight: 1, fieldId: 'speed' },
        { pattern: 'water pump', weight: 1 },
        { pattern: 'target coolant temperature', weight: 1 },
        { pattern: 'e-fan', weight: 1 },
      ],
    },
  },
};

const SOURCE_DISPLAY = {
  bootmod3: 'Bootmod3',
  bimmerlink: 'BimmerLink',
  unknown: 'Unknown',
};

const SOURCE_COLORS = {
  bootmod3: '#FF6B00',
  bimmerlink: '#0066CC',
  unknown: '#888888',
};

function normalizeHeader(name) {
  return String(name).replace(/^"|"$/g, '').trim().toLowerCase();
}

function headerMatchesSignature(normalizedHeaders, pattern) {
  const sig = pattern.toLowerCase();
  return normalizedHeaders.some(h => h.includes(sig));
}

function scoreSource(normalizedHeaders, sourceKey) {
  const config = SOURCE_SIGNATURES[sourceKey];
  let score = 0;
  const foundChannels = new Set();

  for (const tier of Object.values(config.tiers)) {
    for (const sig of tier) {
      if (headerMatchesSignature(normalizedHeaders, sig.pattern)) {
        score += sig.weight;
        if (sig.fieldId) foundChannels.add(sig.fieldId);
      }
    }
  }

  return { score, foundChannels };
}

function clampConfidence(value) {
  return Math.min(100, Math.max(0, value));
}

/**
 * Score CSV headers against Bootmod3 and BimmerLink signatures.
 * @param {string[]} headers Raw CSV header strings
 * @returns {{ source: string, confidence: number, score: number, foundChannels: string[], missingChannels: string[] }}
 */
export function detectSource(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);

  const bm3 = scoreSource(normalizedHeaders, 'bootmod3');
  const bl = scoreSource(normalizedHeaders, 'bimmerlink');

  let source = 'unknown';
  let score = 0;
  let foundSet = new Set();

  if (bm3.score === 0 && bl.score === 0) {
    source = 'unknown';
  } else if (bm3.score >= bl.score) {
    source = 'bootmod3';
    score = bm3.score;
    foundSet = bm3.foundChannels;
  } else {
    source = 'bimmerlink';
    score = bl.score;
    foundSet = bl.foundChannels;
  }

  const maxScore = source === 'unknown'
    ? 0
    : SOURCE_SIGNATURES[source].maxScore;
  const confidence = maxScore === 0
    ? 0
    : clampConfidence((score / maxScore) * 100);

  const foundChannels = [...foundSet];
  const allFieldIds = NORMALIZED_FIELDS.map(f => f.id).filter(id => id !== 'time');
  const missingChannels = allFieldIds.filter(id => !foundSet.has(id));

  return { source, confidence, score, foundChannels, missingChannels };
}

/** @param {string} source */
export function getSourceDisplay(source) {
  return SOURCE_DISPLAY[source] ?? SOURCE_DISPLAY.unknown;
}

/** @param {string} source */
export function getSourceColor(source) {
  return SOURCE_COLORS[source] ?? SOURCE_COLORS.unknown;
}
