export default function GaugeBar({ label, value, min, max, color, unit, warningAt, dangerAt, live = false }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const isWarn = warningAt && value >= warningAt;
  const isDanger = dangerAt && value >= dangerAt;
  const barColor = isDanger ? '#ef4444' : isWarn ? '#f59e0b' : color;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: barColor, fontVariantNumeric: 'tabular-nums', minWidth: 54, textAlign: 'right' }}>
          {value.toFixed(0)}<span style={{ fontSize: 10, fontWeight: 400, color: '#4b5563' }}> {unit}</span>
        </span>
      </div>
      <div style={{ height: 8, background: '#1a1f2e', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${color}88, ${barColor})`,
            transition: live ? 'none' : 'width 0.12s ease, background 0.2s',
            boxShadow: isDanger ? `0 0 6px ${barColor}88` : 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 9, color: '#374151' }}>{min}{unit}</span>
        <span style={{ fontSize: 9, color: '#374151' }}>{max}{unit}</span>
      </div>
    </div>
  );
}
