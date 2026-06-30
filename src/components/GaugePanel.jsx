import GaugeBar from './GaugeBar';
import { autoDomain } from '../lib/columnMeta';
import { PHASE_COLORS, PHASE_LABELS } from '../lib/phaseDetection';

const fmtSec = (s) => {
  const m = Math.floor(s / 60);
  return `${m}:${Math.round(s % 60).toString().padStart(2, '0')}`;
};

export default function GaugePanel({
  gaugeSeries,
  currentValues,
  rows,
  playTime,
  phase,
  showIatDelta,
  ambient,
  curIAT,
  maxHeight,
  style,
}) {
  return (
    <div style={{
      width: 200,
      flexShrink: 0,
      background: '#0d1117',
      border: '1px solid #1f2937',
      borderRadius: 8,
      padding: '14px 14px 10px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      ...style,
    }}>
      <div style={{ marginBottom: 10, textAlign: 'center', flexShrink: 0 }}>
        <div style={{
          fontSize: 22, fontWeight: 700, color: '#f8fafc',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        }}>
          {fmtSec(playTime)}
        </div>
        <div style={{ fontSize: 10, color: PHASE_COLORS[phase] ?? '#6b7280', marginTop: 2 }}>
          {PHASE_LABELS[phase] ?? '—'}
        </div>
      </div>

      <div style={{
        flex: maxHeight ? 1 : undefined,
        minHeight: 0,
        overflowY: maxHeight ? 'auto' : undefined,
        maxHeight: maxHeight ?? undefined,
      }}>
        {gaugeSeries.map(s => {
          const val = currentValues[s.key] ?? 0;
          const [min, max] = autoDomain(rows, s.key);
          return (
            <GaugeBar
              key={s.key}
              label={s.col.label.split('[')[0].trim().toUpperCase().slice(0, 12)}
              value={val}
              min={min}
              max={max}
              color={s.color}
              unit={s.col.unit === '°F' ? '°F' : s.col.unit}
            />
          );
        })}
      </div>

      {showIatDelta && (
        <div style={{
          marginTop: 8,
          flexShrink: 0,
          background: curIAT - ambient <= 2 ? '#14532d' : curIAT - ambient <= 10 ? '#1a3a1a' : '#3b1c1c',
          border: `1px solid ${curIAT - ambient <= 2 ? '#4ade80' : curIAT - ambient <= 10 ? '#86efac' : '#f87171'}44`,
          borderRadius: 5, padding: '5px 8px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>IAT vs AMBIENT</div>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: curIAT - ambient <= 0 ? '#4ade80' : curIAT - ambient <= 10 ? '#86efac' : '#f87171',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {curIAT - ambient > 0 ? '+' : ''}{(curIAT - ambient).toFixed(0)}°F
          </div>
        </div>
      )}
    </div>
  );
}
