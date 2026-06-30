const STORAGE_KEY = 'apexlog_ha_settings';

export const DEFAULT_HA_URL = '';
export const DEFAULT_HA_ENTITY_ID = '';

export function defaultHaSettings() {
  return {
    url: DEFAULT_HA_URL,
    token: '',
    entityId: DEFAULT_HA_ENTITY_ID,
  };
}

export function loadHaSettings() {
  if (typeof window === 'undefined') return defaultHaSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultHaSettings();
    const parsed = JSON.parse(raw);
    return {
      url: parsed.url?.trim() || DEFAULT_HA_URL,
      token: '',
      entityId: parsed.entityId?.trim() || DEFAULT_HA_ENTITY_ID,
    };
  } catch {
    return defaultHaSettings();
  }
}

export function saveHaSettings(settings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    url: settings.url,
    entityId: settings.entityId,
  }));
}

export function isHaConfigured(settings) {
  return settings.url.trim().length > 0 && settings.token.trim().length > 0;
}

/** Token for CLI batch fetch (never commit). */
export function haTokenFromEnv() {
  return process.env.HA_TOKEN?.trim() || '';
}
