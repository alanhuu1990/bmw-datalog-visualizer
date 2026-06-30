const STORAGE_KEY = 'csv_visualizer_settings';

export const DEFAULT_MAX_GAUGE_BARS = 20;
export const MAX_GAUGE_BARS_LIMIT = 30;
export const MIN_GAUGE_BARS_LIMIT = 1;

export const PAGE_LAYOUTS = {
  CLASSIC: 'classic',
  MAP_SIDEBAR: 'mapSidebar',
  FIXED_MAP_SCROLL: 'fixedMapScroll',
};

export const PAGE_LAYOUT_OPTIONS = [
  { value: PAGE_LAYOUTS.CLASSIC, label: 'Classic', description: 'Map on top; chart and gauges side by side.' },
  { value: PAGE_LAYOUTS.MAP_SIDEBAR, label: 'Map + gauges', description: 'Gauges beside the map; chart full width below.' },
  { value: PAGE_LAYOUTS.FIXED_MAP_SCROLL, label: 'Fixed map', description: 'Map pinned at top; plot and gauges scroll below.' },
];

export function defaultVisualizerSettings() {
  return {
    maxGaugeBars: DEFAULT_MAX_GAUGE_BARS,
    pageLayout: PAGE_LAYOUTS.CLASSIC,
  };
}

function clampGaugeBars(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return DEFAULT_MAX_GAUGE_BARS;
  return Math.min(MAX_GAUGE_BARS_LIMIT, Math.max(MIN_GAUGE_BARS_LIMIT, Math.round(v)));
}

function normalizePageLayout(layout) {
  return Object.values(PAGE_LAYOUTS).includes(layout)
    ? layout
    : PAGE_LAYOUTS.CLASSIC;
}

export function loadVisualizerSettings() {
  if (typeof window === 'undefined') return defaultVisualizerSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVisualizerSettings();
    const parsed = JSON.parse(raw);
    return {
      maxGaugeBars: clampGaugeBars(parsed.maxGaugeBars),
      pageLayout: normalizePageLayout(parsed.pageLayout),
    };
  } catch {
    return defaultVisualizerSettings();
  }
}

export function saveVisualizerSettings(settings) {
  if (typeof window === 'undefined') return;
  const normalized = {
    maxGaugeBars: clampGaugeBars(settings.maxGaugeBars),
    pageLayout: normalizePageLayout(settings.pageLayout),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
