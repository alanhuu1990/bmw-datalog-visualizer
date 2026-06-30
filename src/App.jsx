import { useState, useEffect, useCallback } from 'react';
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
        fontFamily: shellFont, position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 12, right: 14, zIndex: 2, display: 'flex', gap: 8 }}>
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

  const loadDatalog = useCallback((content, fileName) => {
    try {
      const parsed = parseDatalog(content, fileName);
      setLog(buildLogState(parsed));
      setSelectedKeys(getDefaultSelectedKeys(parsed.columns));
      setDatalogError(null);
    } catch (err) {
      setDatalogError(err.message || 'Failed to parse datalog.');
    }
  }, []);

  const loadGpx = useCallback((content, fileName) => {
    try {
      const parsed = parseGpx(content, fileName);
      setGpsTrack(parsed);
      setGpsError(null);
    } catch (err) {
      setGpsError(err.message || 'Failed to parse GPX.');
    }
  }, []);

  useEffect(() => {
    fetch('/demo-commute.csv')
      .then(r => {
        if (!r.ok) throw new Error('Demo datalog not found.');
        return r.text();
      })
      .then(text => loadDatalog(text, 'demo-commute.csv'))
      .catch(err => setDatalogError(err.message))
      .finally(() => setLoading(false));
  }, [loadDatalog]);

  const shellStyle = {
    background: '#090b10',
    minHeight: '100vh',
    color: '#6b7280',
    fontFamily: shellFont,
  };

  if (loading) {
    return (
      <div style={{ ...shellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading demo datalog…
      </div>
    );
  }

  const sharedProps = {
    log,
    selectedKeys,
    onSelectedKeysChange: setSelectedKeys,
    gpsTrack,
    syncMode,
    onSyncModeChange: setSyncMode,
    manualOffsetSec,
    onManualOffsetChange: setManualOffsetSec,
    loadDatalog,
    loadGpx,
    onClearDatalog: () => { setLog(null); setSelectedKeys([]); setDatalogError(null); },
    onClearGpx: () => { setGpsTrack(null); setGpsError(null); },
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
