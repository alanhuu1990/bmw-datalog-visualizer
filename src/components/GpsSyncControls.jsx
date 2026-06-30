import { SYNC_MODES, SYNC_MODE_LABELS, describeSyncGap } from '../lib/gpsSync';

const fmtSec = (s) => {
  const m = Math.floor(s / 60);
  return `${m}:${Math.round(s % 60).toString().padStart(2, '0')}`;
};

export default function GpsSyncControls({
  syncMode,
  onSyncModeChange,
  manualOffsetSec,
  onManualOffsetChange,
  datalogDuration,
  gpsDuration,
  hasDatalog,
  hasGps,
}) {
  if (!hasGps) return null;

  const canSync = hasDatalog && hasGps;
  const gap = canSync && syncMode === SYNC_MODES.END
    ? describeSyncGap(syncMode, datalogDuration, gpsDuration, manualOffsetSec)
    : null;

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1f2937',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 10,
      fontSize: 11,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: canSync ? 8 : 0 }}>
        <span style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.1em' }}>GPS SYNC</span>
        {canSync ? (
          <select
            value={syncMode}
            onChange={(e) => onSyncModeChange(e.target.value)}
            style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: 6,
              color: '#e2e8f0',
              padding: '4px 8px',
              fontSize: 11,
              fontFamily: 'inherit',
            }}
          >
            {Object.entries(SYNC_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        ) : (
          <span style={{ color: '#4b5563' }}>Load a datalog to enable sync</span>
        )}
        <span style={{ color: '#4b5563', marginLeft: 'auto' }}>
          GPS {fmtSec(gpsDuration)}
          {hasDatalog && ` · Datalog ${fmtSec(datalogDuration)}`}
        </span>
      </div>

      {canSync && syncMode !== SYNC_MODES.OFF && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 }}>
            Offset
            <input
              type="range"
              min={-120}
              max={120}
              step={1}
              value={manualOffsetSec}
              onChange={(e) => onManualOffsetChange(Number(e.target.value))}
              style={{ width: 120 }}
            />
            <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums', minWidth: 48 }}>
              {manualOffsetSec > 0 ? '+' : ''}{manualOffsetSec}s
            </span>
          </label>
        </div>
      )}

      {gap && (
        <div style={{
          marginTop: 8,
          padding: '6px 8px',
          background: '#1a1f2e',
          borderRadius: 5,
          color: '#94a3b8',
          fontSize: 10,
        }}>
          End-aligned: no map position for the first {fmtSec(gap.gapSec)} of playback
          (map starts at {fmtSec(gap.mapStartsAt)}).
        </div>
      )}

      {canSync && syncMode === SYNC_MODES.OFF && (
        <div style={{ marginTop: 6, color: '#4b5563', fontSize: 10 }}>
          Full route shown; marker does not follow datalog playback.
        </div>
      )}
    </div>
  );
}
