import { useState, useEffect, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import ThermalPlayback from './components/ThermalPlayback';
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

export default function App() {
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
    fontFamily: "'IBM Plex Mono','Fira Code','Courier New',monospace",
  };

  if (loading) {
    return (
      <div style={{ ...shellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading demo datalog…
      </div>
    );
  }

  const hasContent = log || gpsTrack;

  return (
    <div>
      <div style={{
        background: '#090b10', padding: '12px 14px 0', maxWidth: 960, margin: '0 auto',
        fontFamily: "'IBM Plex Mono','Fira Code','Courier New',monospace",
      }}>
        <FileUpload
          onDatalog={loadDatalog}
          onGpx={loadGpx}
          onClearDatalog={() => { setLog(null); setSelectedKeys([]); setDatalogError(null); }}
          onClearGpx={() => { setGpsTrack(null); setGpsError(null); }}
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
          onSelectedKeysChange={setSelectedKeys}
          ambient={log?.ambient ?? null}
          phases={log?.phases ?? null}
          meta={log?.meta ?? null}
          gpsTrack={gpsTrack}
          syncMode={syncMode}
          onSyncModeChange={setSyncMode}
          manualOffsetSec={manualOffsetSec}
          onManualOffsetChange={setManualOffsetSec}
        />
      ) : (
        <div style={{ ...shellStyle, padding: 40, textAlign: 'center', fontSize: 12 }}>
          Upload a datalog CSV, GPX track, or both.
        </div>
      )}
    </div>
  );
}
