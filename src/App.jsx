import { useState, useEffect, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import ThermalPlayback from './components/ThermalPlayback';
import { parseDatalog } from './lib/parseDatalog';
import { detectPhases } from './lib/phaseDetection';
import { computeAmbient } from './lib/ambient';

function buildLogState(parsed) {
  const ambient = computeAmbient(parsed.rows);
  const phases = detectPhases(parsed.rows, parsed.channels);
  return {
    rows: parsed.rows,
    channels: parsed.channels,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadContent = useCallback((content, fileName) => {
    try {
      const parsed = parseDatalog(content, fileName);
      setLog(buildLogState(parsed));
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to parse datalog.');
    }
  }, []);

  useEffect(() => {
    fetch('/demo-commute.csv')
      .then(r => {
        if (!r.ok) throw new Error('Demo datalog not found.');
        return r.text();
      })
      .then(text => loadContent(text, 'demo-commute.csv'))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadContent]);

  if (loading) {
    return (
      <div style={{
        background: '#090b10', minHeight: '100vh', color: '#6b7280',
        fontFamily: "'IBM Plex Mono','Fira Code','Courier New',monospace",
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        Loading demo datalog…
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: '#090b10', padding: '12px 14px 0', maxWidth: 960, margin: '0 auto',
        fontFamily: "'IBM Plex Mono','Fira Code','Courier New',monospace",
      }}>
        <FileUpload onFile={loadContent} disabled={loading} />
        {error && (
          <div style={{
            marginTop: 8, padding: '8px 12px', background: '#3b1c1c',
            border: '1px solid #f8717144', borderRadius: 6, fontSize: 11, color: '#f87171',
          }}>
            {error}
          </div>
        )}
      </div>

      {log && (
        <ThermalPlayback
          rows={log.rows}
          ambient={log.ambient}
          phases={log.phases}
          channels={log.channels}
          meta={log.meta}
        />
      )}
    </div>
  );
}
