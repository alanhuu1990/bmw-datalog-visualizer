import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';
import GaugeBar from './GaugeBar';
import { interp, usePlayback } from '../hooks/usePlayback';
import { getPhase, PHASE_LABELS, PHASE_COLORS } from '../lib/phaseDetection';

const fmtSec = (s) => {
  const m = Math.floor(s / 60);
  return `${m}:${Math.round(s % 60).toString().padStart(2, '0')}`;
};

function CustomTooltip({ active, payload, label, phases }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f1117', border: '1px solid #1e2530', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <span style={{ color: '#6b7280' }}>{fmtSec(label)}</span>
        <span style={{ color: '#4b5563', fontSize: 10 }}>{PHASE_LABELS[getPhase(label, phases)]}</span>
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between', minWidth: 130 }}>
          <span>{p.name}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {typeof p.value === 'number' ? p.value.toFixed(p.name === 'Boost' ? 1 : 0) : p.value}
            {p.name === 'Speed' ? ' mph' : p.name === 'Boost' ? ' psi' : '°F'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ThermalPlayback({ rows, ambient, phases, channels, meta }) {
  const totalT = phases.totalT;

  const [showCoolant, setShowCoolant] = useState(channels.coolant);
  const [showIAT, setShowIAT] = useState(channels.iat);
  const [showOil, setShowOil] = useState(channels.oil);
  const [showSpeed, setShowSpeed] = useState(channels.speed);
  const [showBoost, setShowBoost] = useState(false);

  const {
    playing, playTime, playbackRate, setPlaybackRate,
    handlePlayPause, handleReset, handleScrub, progressPct,
  } = usePlayback(totalT, rows);

  const chartData = useMemo(() =>
    rows.map(r => ({
      t: r.t,
      coolant: r.coolant,
      iat: r.iat,
      oil: r.oil,
      speed: r.speed,
      boost: r.boost,
      ambientRef: ambient,
      deltaIAT: (r.iat ?? ambient) - ambient,
    })),
  [rows, ambient]);

  const visibleData = useMemo(() => {
    if (playTime >= totalT) return chartData;
    const visible = chartData.filter(d => d.t <= playTime);
    const [t, coolant, iat, oil, speed, boost] = interp(rows, playTime);
    visible.push({
      t, coolant, iat, oil, speed, boost,
      ambientRef: ambient,
      deltaIAT: iat - ambient,
    });
    return visible;
  }, [chartData, playTime, totalT, rows, ambient]);

  const [, curCoolant, curIAT, curOil, curSpeed, curBoost] = interp(rows, playTime);
  const phase = getPhase(playTime, phases);

  const LEGEND = [
    channels.coolant && { key: 'coolant', label: 'Coolant', color: '#3b82f6', visible: showCoolant, toggle: () => setShowCoolant(v => !v) },
    channels.iat && { key: 'iat', label: 'IAT', color: '#f59e0b', visible: showIAT, toggle: () => setShowIAT(v => !v) },
    channels.oil && { key: 'oil', label: 'Oil', color: '#ef4444', visible: showOil, toggle: () => setShowOil(v => !v) },
    channels.speed && { key: 'speed', label: 'Speed', color: '#10b981', visible: showSpeed, toggle: () => setShowSpeed(v => !v) },
    channels.boost && { key: 'boost', label: 'Boost', color: '#a78bfa', visible: showBoost, toggle: () => setShowBoost(v => !v) },
  ].filter(Boolean);

  const sourceLabel = meta.source === 'bootmod3' ? 'BM3 DATALOG' : 'BIMMERLINK DATALOG';
  const durationMin = (totalT / 60).toFixed(1);

  const iatDomain = channels.iat && !channels.speed
    ? [Math.max(60, ambient - 10), Math.min(120, ambient + 40)]
    : [65, 225];

  const pct = (t) => totalT > 0 ? (t / totalT) * 100 : 0;

  return (
    <div style={{
      background: '#090b10', minHeight: '100vh', color: '#e2e8f0',
      fontFamily: "'IBM Plex Mono','Fira Code','Courier New',monospace",
      padding: '16px 14px', maxWidth: 960, margin: '0 auto',
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#4ade80', marginBottom: 2 }}>
          {sourceLabel}{meta.mapName ? ` · ${meta.mapName}` : ''}
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
          Thermal Playback
        </h1>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
          {durationMin} min · {meta.fileName || 'datalog'}
        </p>
      </div>

      {phases.hasPhases && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Warm-up', color: '#1e3a5f', text: '#60a5fa' },
            { label: 'City', color: '#1a2e1a', text: '#86efac' },
            { label: 'High-flow', color: '#14391e', text: '#4ade80' },
            { label: 'City end', color: '#1a1f2e', text: '#94a3b8' },
          ].map(p => (
            <div key={p.label} style={{
              background: p.color, border: `1px solid ${p.text}33`,
              borderRadius: 4, padding: '3px 8px', fontSize: 10, color: p.text,
            }}>
              {p.label}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, padding: '12px 6px 8px' }}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={visibleData} margin={{ top: 4, right: 30, bottom: 4, left: 0 }}>
              {phases.hasPhases && (
                <>
                  <ReferenceArea x1={0} x2={phases.warmupEnd} yAxisId="temp" fill="#1e3a5f" fillOpacity={0.22} />
                  <ReferenceArea x1={phases.warmupEnd} x2={phases.fwStart} yAxisId="temp" fill="#1a2e1a" fillOpacity={0.22} />
                  <ReferenceArea x1={phases.fwStart} x2={phases.fwEnd} yAxisId="temp" fill="#14391e" fillOpacity={0.28} />
                  <ReferenceArea x1={phases.fwEnd} x2={totalT} yAxisId="temp" fill="#1a1f2e" fillOpacity={0.22} />
                </>
              )}
              {channels.iat && (
                <ReferenceLine y={ambient} yAxisId="temp" stroke="#6b7280" strokeDasharray="4 4" strokeOpacity={0.4} />
              )}
              <CartesianGrid strokeDasharray="2 4" stroke="#1a1f2e" vertical={false} />
              <XAxis
                dataKey="t" type="number" domain={[0, totalT]} tickFormatter={fmtSec}
                tick={{ fill: '#374151', fontSize: 9, fontFamily: 'inherit' }}
                axisLine={false} tickLine={false} tickCount={10}
              />
              <YAxis
                yAxisId="temp" domain={iatDomain}
                tick={{ fill: '#374151', fontSize: 9 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}°`} width={30}
              />
              {channels.speed && (
                <YAxis
                  yAxisId="speed" orientation="right" domain={[0, 90]}
                  tick={{ fill: '#374151', fontSize: 9 }} axisLine={false} tickLine={false} width={22}
                />
              )}
              {channels.boost && (
                <YAxis yAxisId="boost" orientation="right" domain={[-2, 20]} hide />
              )}
              <Tooltip content={<CustomTooltip phases={phases} />} />
              {showCoolant && channels.coolant && (
                <Line yAxisId="temp" type="monotone" dataKey="coolant" name="Coolant" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
              )}
              {showIAT && channels.iat && (
                <Line yAxisId="temp" type="monotone" dataKey="iat" name="IAT" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              )}
              {showOil && channels.oil && (
                <Line yAxisId="temp" type="monotone" dataKey="oil" name="Oil" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
              )}
              {showIAT && channels.iat && (
                <Line yAxisId="temp" type="monotone" dataKey="ambientRef" name="Ambient" stroke="#6b7280" strokeWidth={1} dot={false} strokeDasharray="3 3" isAnimationActive={false} />
              )}
              {showSpeed && channels.speed && (
                <Line yAxisId="speed" type="monotone" dataKey="speed" name="Speed" stroke="#10b981" strokeWidth={1} dot={false} strokeOpacity={0.7} isAnimationActive={false} connectNulls />
              )}
              {showBoost && channels.boost && (
                <Line yAxisId="boost" type="monotone" dataKey="boost" name="Boost" stroke="#a78bfa" strokeWidth={1} dot={false} strokeOpacity={0.8} isAnimationActive={false} connectNulls />
              )}
            </LineChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', gap: 10, padding: '4px 12px 0', justifyContent: 'center', flexWrap: 'wrap' }}>
            {LEGEND.map(l => (
              <div key={l.key} onClick={l.toggle} style={{
                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                opacity: l.visible ? 1 : 0.3, fontSize: 11,
              }}>
                <div style={{ width: 14, height: 2, background: l.color, borderRadius: 1 }} />
                <span style={{ color: '#94a3b8' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 190, flexShrink: 0, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, padding: '14px 14px 10px' }}>
          <div style={{ marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {fmtSec(playTime)}
            </div>
            <div style={{ fontSize: 10, color: PHASE_COLORS[phase], marginTop: 2 }}>{PHASE_LABELS[phase]}</div>
          </div>

          {channels.coolant && (
            <GaugeBar label="COOLANT" value={curCoolant} min={65} max={225} color="#3b82f6" unit="°F" warningAt={210} dangerAt={220} />
          )}
          {channels.iat && (
            <GaugeBar label="IAT" value={curIAT} min={65} max={110} color="#f59e0b" unit="°F" warningAt={95} dangerAt={105} />
          )}
          {channels.oil && (
            <GaugeBar label="OIL" value={curOil} min={65} max={215} color="#ef4444" unit="°F" warningAt={200} dangerAt={210} />
          )}
          {channels.speed && (
            <GaugeBar label="SPEED" value={curSpeed} min={0} max={90} color="#10b981" unit="mph" />
          )}
          {channels.boost && (
            <GaugeBar label="BOOST" value={Math.max(0, curBoost)} min={0} max={20} color="#a78bfa" unit="psi" warningAt={15} />
          )}

          {channels.iat && (
            <div style={{
              marginTop: 8,
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
      </div>

      <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={handlePlayPause} style={{
            background: playing ? '#1e3a5f' : '#14532d',
            border: `1px solid ${playing ? '#3b82f6' : '#4ade80'}`,
            borderRadius: 6, color: playing ? '#93c5fd' : '#4ade80',
            padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600, minWidth: 80,
          }}>
            {playing ? '⏸ PAUSE' : playTime >= totalT ? '↺ REPLAY' : '▶ PLAY'}
          </button>

          <button onClick={handleReset} style={{
            background: 'transparent', border: '1px solid #1f2937', borderRadius: 6, color: '#6b7280',
            padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
          }}>
            ⏮
          </button>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
            <span style={{ fontSize: 10, color: '#4b5563' }}>SPEED</span>
            {[4, 8, 16, 32, 64].map(s => (
              <button key={s} onClick={() => setPlaybackRate(s)} style={{
                background: playbackRate === s ? '#1e293b' : 'transparent',
                border: `1px solid ${playbackRate === s ? '#6366f1' : '#1f2937'}`,
                borderRadius: 4, color: playbackRate === s ? '#a5b4fc' : '#4b5563',
                padding: '3px 8px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
              }}>
                {s}×
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
            {fmtSec(playTime)} / {fmtSec(totalT)}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          {phases.hasPhases ? (
            <div style={{ height: 6, borderRadius: 3, background: '#1a1f2e', marginBottom: 6, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${pct(phases.warmupEnd)}%`, background: '#1e3a5f' }} />
              <div style={{ width: `${pct(phases.fwStart - phases.warmupEnd)}%`, background: '#1a2e1a' }} />
              <div style={{ width: `${pct(phases.fwEnd - phases.fwStart)}%`, background: '#14391e' }} />
              <div style={{ width: `${pct(totalT - phases.fwEnd)}%`, background: '#1a1f2e' }} />
            </div>
          ) : (
            <div style={{ height: 6, borderRadius: 3, background: '#1a1f2e', marginBottom: 6 }} />
          )}
          <input
            type="range" min={0} max={100} step={0.1}
            value={progressPct.toFixed(1)}
            onChange={handleScrub}
            style={{ position: 'absolute', top: -1, left: 0, width: '100%', height: 8, opacity: 0, cursor: 'pointer', zIndex: 2 }}
          />
          <div style={{
            position: 'absolute', top: -1, left: `${progressPct}%`, transform: 'translateX(-50%)',
            width: 3, height: 8, background: '#f8fafc', borderRadius: 2, pointerEvents: 'none',
          }} />
        </div>

        {phases.hasPhases && (
          <div style={{ display: 'flex', fontSize: 9, color: '#374151', marginTop: 2, position: 'relative', height: 12 }}>
            <span style={{ position: 'absolute', left: `${pct(phases.warmupEnd)}%` }}>{fmtSec(phases.warmupEnd)}</span>
            <span style={{ position: 'absolute', left: `${pct(phases.fwStart)}%` }}>{fmtSec(phases.fwStart)}</span>
            <span style={{ position: 'absolute', left: `${pct(phases.fwEnd)}%`, transform: 'translateX(-100%)' }}>{fmtSec(phases.fwEnd)}</span>
          </div>
        )}
      </div>

      {channels.iat && (
        <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, padding: '12px 6px 6px', marginBottom: 10 }}>
          <div style={{ paddingLeft: 8, marginBottom: 4, fontSize: 10, color: '#6b7280' }}>
            IAT delta above ambient ({ambient.toFixed(0)}°F)
          </div>
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={visibleData} margin={{ top: 2, right: 30, bottom: 2, left: 0 }}>
              {phases.hasPhases && (
                <ReferenceArea x1={phases.fwStart} x2={phases.fwEnd} yAxisId="d" fill="#14391e" fillOpacity={0.35} />
              )}
              <ReferenceLine y={0} yAxisId="d" stroke="#6b7280" strokeOpacity={0.5} />
              <ReferenceLine y={10} yAxisId="d" stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.3} />
              <CartesianGrid strokeDasharray="2 4" stroke="#1a1f2e" vertical={false} />
              <XAxis
                dataKey="t" type="number" domain={[0, totalT]} tickFormatter={fmtSec}
                tick={{ fill: '#374151', fontSize: 9 }} axisLine={false} tickLine={false} tickCount={10}
              />
              <YAxis
                yAxisId="d" domain={[-6, 25]}
                tick={{ fill: '#374151', fontSize: 9 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v > 0 ? '+' : ''}${v}°`} width={30}
              />
              <Line yAxisId="d" type="monotone" dataKey="deltaIAT" name="IAT Δ" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ fontSize: 9, color: '#1e2530', textAlign: 'center' }}>
        click legend to toggle · drag scrub bar or use play controls
      </div>
    </div>
  );
}
