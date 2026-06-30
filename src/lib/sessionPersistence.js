import { SYNC_MODES } from './gpsSync';

const DB_NAME = 'csv-visualizer';
const DB_VERSION = 1;
const STORE_NAME = 'session';
const SESSION_KEY = 'current';

function defaultUi() {
  return {
    selectedKeys: [],
    syncMode: SYNC_MODES.END,
    manualOffsetSec: 0,
  };
}

function defaultSession() {
  return {
    datalog: null,
    gpx: null,
    ui: defaultUi(),
  };
}

function normalizeSyncMode(mode) {
  return Object.values(SYNC_MODES).includes(mode) ? mode : SYNC_MODES.END;
}

function normalizeUi(ui) {
  if (!ui || typeof ui !== 'object') return defaultUi();
  return {
    selectedKeys: Array.isArray(ui.selectedKeys)
      ? ui.selectedKeys.filter(k => typeof k === 'string')
      : [],
    syncMode: normalizeSyncMode(ui.syncMode),
    manualOffsetSec: Number.isFinite(Number(ui.manualOffsetSec))
      ? Number(ui.manualOffsetSec)
      : 0,
  };
}

function normalizeFileEntry(entry) {
  if (!entry || typeof entry.content !== 'string' || !entry.content.trim()) return null;
  return {
    content: entry.content,
    fileName: typeof entry.fileName === 'string' ? entry.fileName : '',
  };
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return defaultSession();
  return {
    datalog: normalizeFileEntry(raw.datalog),
    gpx: normalizeFileEntry(raw.gpx),
    ui: normalizeUi(raw.ui),
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    let result;
    try {
      result = fn(store);
    } catch (err) {
      reject(err);
      return;
    }

    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  }));
}

function isQuotaError(err) {
  return err?.name === 'QuotaExceededError'
    || err?.code === 22
    || err?.code === 1014;
}

function warnPersistenceFailure(action, err) {
  if (isQuotaError(err)) {
    console.warn(`[sessionPersistence] ${action}: storage quota exceeded. Session will not be saved.`);
  } else {
    console.warn(`[sessionPersistence] ${action} failed:`, err);
  }
}

export async function loadSession() {
  try {
    const raw = await runTransaction('readonly', store => store.get(SESSION_KEY));
    return normalizeSession(raw);
  } catch (err) {
    warnPersistenceFailure('loadSession', err);
    return defaultSession();
  }
}

async function saveSessionRecord(session) {
  const normalized = normalizeSession(session);
  await runTransaction('readwrite', store => {
    store.put(normalized, SESSION_KEY);
  });
  return normalized;
}

export async function saveSession(partial) {
  try {
    const current = await loadSession();
    const next = normalizeSession({
      ...current,
      ...partial,
      ui: partial?.ui ? { ...current.ui, ...partial.ui } : current.ui,
    });
    return await saveSessionRecord(next);
  } catch (err) {
    warnPersistenceFailure('saveSession', err);
    return null;
  }
}

export async function saveDatalog(content, fileName) {
  return saveSession({ datalog: { content, fileName } });
}

export async function saveGpx(content, fileName) {
  return saveSession({ gpx: { content, fileName } });
}

export async function saveUi(ui) {
  return saveSession({ ui });
}

export async function clearDatalog() {
  return saveSession({ datalog: null });
}

export async function clearGpx() {
  return saveSession({ gpx: null });
}

export async function clearSession() {
  try {
    await runTransaction('readwrite', store => {
      store.delete(SESSION_KEY);
    });
  } catch (err) {
    warnPersistenceFailure('clearSession', err);
  }
}
