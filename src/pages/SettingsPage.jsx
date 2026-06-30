import { Link } from 'react-router-dom';
import { useVisualizerSettings } from '../context/VisualizerSettingsContext';
import {
  MAX_GAUGE_BARS_LIMIT,
  MIN_GAUGE_BARS_LIMIT,
  PAGE_LAYOUT_OPTIONS,
} from '../lib/visualizerSettings';

const shellFont = "'IBM Plex Mono','Fira Code','Courier New',monospace";

export default function SettingsPage() {
  const { settings, updateSettings } = useVisualizerSettings();

  return (
    <div style={{
      background: '#090b10',
      minHeight: '100vh',
      color: '#e2e8f0',
      fontFamily: shellFont,
      padding: '16px 14px',
      maxWidth: 960,
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#4ade80', marginBottom: 2 }}>
            CSV VISUALIZER
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Settings</h1>
        </div>
        <Link
          to="/"
          style={{
            color: '#6b7280',
            fontSize: 11,
            textDecoration: 'none',
            border: '1px solid #1f2937',
            borderRadius: 6,
            padding: '5px 10px',
          }}
        >
          ← Back
        </Link>
      </div>

      <section style={{
        background: '#0d1117',
        border: '1px solid #1f2937',
        borderRadius: 8,
        padding: '16px 18px',
        marginBottom: 14,
      }}>
        <h2 style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', margin: '0 0 12px', letterSpacing: '0.08em' }}>
          MAX GAUGE BARS
        </h2>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 12px' }}>
          Maximum number of live progress bars shown during playback ({MIN_GAUGE_BARS_LIMIT}–{MAX_GAUGE_BARS_LIMIT}).
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={MIN_GAUGE_BARS_LIMIT}
            max={MAX_GAUGE_BARS_LIMIT}
            value={settings.maxGaugeBars}
            onChange={e => updateSettings({ maxGaugeBars: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#4ade80' }}
          />
          <input
            type="number"
            min={MIN_GAUGE_BARS_LIMIT}
            max={MAX_GAUGE_BARS_LIMIT}
            value={settings.maxGaugeBars}
            onChange={e => updateSettings({ maxGaugeBars: Number(e.target.value) })}
            style={{
              width: 56,
              background: '#090b10',
              border: '1px solid #1f2937',
              borderRadius: 4,
              color: '#f8fafc',
              fontSize: 12,
              fontFamily: 'inherit',
              padding: '4px 6px',
              textAlign: 'center',
            }}
          />
        </div>
      </section>

      <section style={{
        background: '#0d1117',
        border: '1px solid #1f2937',
        borderRadius: 8,
        padding: '16px 18px',
      }}>
        <h2 style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', margin: '0 0 12px', letterSpacing: '0.08em' }}>
          PAGE LAYOUT
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PAGE_LAYOUT_OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 6,
                border: `1px solid ${settings.pageLayout === opt.value ? '#4ade8066' : '#1f2937'}`,
                background: settings.pageLayout === opt.value ? '#14532d22' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="pageLayout"
                value={opt.value}
                checked={settings.pageLayout === opt.value}
                onChange={() => updateSettings({ pageLayout: opt.value })}
                style={{ marginTop: 2, accentColor: '#4ade80' }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
