import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import ThermalPlayback from './components/ThermalPlayback';
import ConfigButton from './components/ConfigButton';
import ChangelogButton from './components/ChangelogButton';
import SettingsPage from './pages/SettingsPage';
import ChangelogPage from './pages/ChangelogPage';
import { VisualizerSettingsProvider } from './context/VisualizerSettingsContext';
import { parseDatalog, getDefaultSelectedKeys } from './lib/parseDatalog';
import { parseGpx } from './lib/parseGpx';
import { detectPhases } from './lib/phaseDetection';
import { computeAmbient } from './lib/ambient';
import { SYNC_MODES } from './lib/gpsSync';
import {
  loadSession,
  saveDatalog,
  saveGpx,
  saveUi,
  clearDatalog,
  clearGpx,
} from './lib/sessionPersistence';

function buildLogState(parsed) {
  const ambient = computeAmbient(parsed.rows, parsed.columns);
  const phases = detectPhases(parsed.rows, parsed.columns);
  return {
    rows: parsed.rows,
    columns: parsed.columns,
    ambient,
    phases,
    meta: {
      source: parsed.source,
      mapName: parsed.mapName,
      fileName: parsed.fileName,
    },
  };
}

function resolveSelectedKeys(columns, restoreKeys) {
  if (!restoreKeys?.length) return getDefaultSelectedKeys(columns);
  const valid = new Set(columns.map(c => c.key));
  const keys = restoreKeys.filter(k => valid.has(k));
  return keys.length > 0 ? keys : getDefaultSelectedKeys(columns);
}

const shellFont = "'IBM Plex Mono','Fira Code','Courier New',monospace";

function VisualizerPage({
  log,
  selectedKeys,
  onSelectedKeysChange,
  gpsTrack,
  syncMode,
  onSyncModeChange,
  manualOffsetSec,
  onManualOffsetChange,
  loadDatalog,
  loadGpx,
  onClearDatalog,
  onClearGpx,
  datalogError,
  gpsError,
  loading,
}) {
  const hasContent = log || gpsTrack;

  return (
    <>
      <div style={{
        background: '#090b10', padding: '12px 14px 0', maxWidth: 960, margin: '0 auto',
        fontFamily: shellFont,
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
          <ChangelogButton />
          <ConfigButton />
        </div>
        <FileUpload
          onDatalog={loadDatalog}
          onGpx={loadGpx}
          onClearDatalog={onClearDatalog}
          onClearGpx={onClearGpx}
          datalogName={log?.meta?.fileName}
          gpxName={gpsTrack?.fileName}
          disabled={loading}
        />
        {datalogError && (
          <div style={{
            marginTop: 8, padding: '8px 12px', background: '#3b1c1c',
            border: '1px solid #f8717144', borderRadius: 6, fontSize: 11, color: '#f87171',
          }}>
            Datalog: {datalogError}
          </div>
        )}
        {gpsError && (
          <div style={{
            marginTop: 8, padding: '8px 12px', background: '#3b1c1c',
            border: '1px solid #f8717144', borderRadius: 6, fontSize: 11, color: '#f87171',
          }}>
            GPS: {gpsError}
          </div>
        )}
      </div>

      {hasContent ? (
        <ThermalPlayback
          rows={log?.rows ?? null}
          columns={log?.columns ?? null}
          selectedKeys={selectedKeys}
          onSelectedKeysChange={onSelectedKeysChange}
          ambient={log?.ambient ?? null}
          phases={log?.phases ?? null}
          meta={log?.meta ?? null}
          gpsTrack={gpsTrack}
          syncMode={syncMode}
          onSyncModeChange={onSyncModeChange}
          manualOffsetSec={manualOffsetSec}
          onManualOffsetChange={onManualOffsetChange}
        />
      ) : (
        <div style={{
          background: '#090b10', minHeight: '60vh', color: '#6b7280',
          fontFamily: shellFont, padding: 40, textAlign: 'center', fontSize: 12,
        }}>
          Upload a datalog CSV, GPX track, or both.
        </div>
      )}
    </>
  );
}

function AppRoutes() {
  const [log, setLog] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [gpsTrack, setGpsTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datalogError, setDatalogError] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [syncMode, setSyncMode] = useState(SYNC_MODES.END);
  const [manualOffsetSec, setManualOffsetSec] = useState(0);

  const skipPersistRef = useRef(true);
  const uiRef = useRef({ selectedKeys, syncMode, manualOffsetSec });
  uiRef.current = { selectedKeys, syncMode, manualOffsetSec };

  const debouncedPersistUi = useMemo(() => {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!skipPersistRef.current) {
          saveUi(uiRef.current);
        }
      }, 300);
    };
  }, []);

  const persistUiNow = useCallback(() => {
    if (!skipPersistRef.current) {
      saveUi(uiRef.current);
    }
  }, []);

  const applyDatalog = useCallback((content, fileName, { restoreKeys } = {}) => {
    const parsed = parseDatalog(content, fileName);
    const keys = resolveSelectedKeys(parsed.columns, restoreKeys);
    setLog(buildLogState(parsed));
    setSelectedKeys(keys);
    setDatalogError(null);
    return { parsed, keys };
  }, []);

  const applyGpx = useCallback((content, fileName) => {
    const parsed = parseGpx(content, fileName);
    setGpsTrack(parsed);
    setGpsError(null);
    return parsed;
  }, []);

  const loadDatalog = useCallback((content, fileName, { restoreKeys, persist = true } = {}) => {
    try {
      const { keys } = applyDatalog(content, fileName, { restoreKeys });
      if (persist) {
        saveDatalog(content, fileName);
        uiRef.current = { ...uiRef.current, selectedKeys: keys };
        saveUi(uiRef.current);
      }
    } catch (err) {
      setDatalogError(err.message || 'Failed to parse datalog.');
      throw err;
    }
  }, [applyDatalog]);

  const loadGpx = useCallback((content, fileName, { persist = true } = {}) => {
    try {
      applyGpx(content, fileName);
      if (persist) saveGpx(content, fileName);
    } catch (err) {
      setGpsError(err.message || 'Failed to parse GPX.');
      throw err;
    }
  }, [applyGpx]);

  const loadDemoDatalog = useCallback(async () => {
    const response = await fetch('/demo-commute.csv');
    if (!response.ok) throw new Error('Demo datalog not found.');
    const text = await response.text();
    loadDatalog(text, 'demo-commute.csv', { persist: false });
  }, [loadDatalog]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await loadSession();
        if (cancelled) return;

        if (session.ui) {
          setSyncMode(session.ui.syncMode);
          setManualOffsetSec(session.ui.manualOffsetSec);
          uiRef.current = {
            selectedKeys: session.ui.selectedKeys,
            syncMode: session.ui.syncMode,
            manualOffsetSec: session.ui.manualOffsetSec,
          };
        }

        let restoredDatalog = false;
        let restoredGpx = false;

        if (session.datalog) {
          try {
            loadDatalog(session.datalog.content, session.datalog.fileName, {
              restoreKeys: session.ui?.selectedKeys,
              persist: false,
            });
            restoredDatalog = true;
          } catch {
            await clearDatalog();
            setDatalogError('Saved datalog could not be restored.');
          }
        }

        if (session.gpx) {
          try {
            loadGpx(session.gpx.content, session.gpx.fileName, { persist: false });
            restoredGpx = true;
          } catch {
            await clearGpx();
            setGpsError('Saved GPX could not be restored.');
          }
        }

        if (!restoredDatalog && !restoredGpx) {
          await loadDemoDatalog();
        }
      } catch (err) {
        if (!cancelled) setDatalogError(err.message || 'Failed to load session.');
      } finally {
        if (!cancelled) {
          skipPersistRef.current = false;
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [loadDatalog, loadGpx, loadDemoDatalog]);

  const handleSelectedKeysChange = useCallback((keys) => {
    setSelectedKeys(keys);
    uiRef.current = { ...uiRef.current, selectedKeys: keys };
    persistUiNow();
  }, [persistUiNow]);

  const handleSyncModeChange = useCallback((mode) => {
    setSyncMode(mode);
    uiRef.current = { ...uiRef.current, syncMode: mode };
    persistUiNow();
  }, [persistUiNow]);

  const handleManualOffsetChange = useCallback((offset) => {
    setManualOffsetSec(offset);
    uiRef.current = { ...uiRef.current, manualOffsetSec: offset };
    debouncedPersistUi();
  }, [debouncedPersistUi]);

  const handleClearDatalog = useCallback(() => {
    setLog(null);
    setSelectedKeys([]);
    setDatalogError(null);
    uiRef.current = { ...uiRef.current, selectedKeys: [] };
    clearDatalog();
    persistUiNow();
  }, [persistUiNow]);

  const handleClearGpx = useCallback(() => {
    setGpsTrack(null);
    setGpsError(null);
    clearGpx();
  }, []);

  const shellStyle = {
    background: '#090b10',
    minHeight: '100vh',
    color: '#6b7280',
    fontFamily: shellFont,
  };

  if (loading) {
    return (
      <div style={{ ...shellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading…
      </div>
    );
  }

  const sharedProps = {
    log,
    selectedKeys,
    onSelectedKeysChange: handleSelectedKeysChange,
    gpsTrack,
    syncMode,
    onSyncModeChange: handleSyncModeChange,
    manualOffsetSec,
    onManualOffsetChange: handleManualOffsetChange,
    loadDatalog,
    loadGpx,
    onClearDatalog: handleClearDatalog,
    onClearGpx: handleClearGpx,
    datalogError,
    gpsError,
    loading,
  };

  return (
    <Routes>
      <Route path="/" element={<VisualizerPage {...sharedProps} />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/changelog" element={<ChangelogPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <VisualizerSettingsProvider>
      <AppRoutes />
    </VisualizerSettingsProvider>
  );
}
