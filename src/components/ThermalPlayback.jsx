import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';
import GaugePanel from './GaugePanel';
import MapPlayback from './MapPlayback';
import GpsSyncControls from './GpsSyncControls';
import ColumnSelector from './ColumnSelector';
import { useVisualizerSettings } from '../context/VisualizerSettingsContext';
import { PAGE_LAYOUTS } from '../lib/visualizerSettings';
import { interpAt, usePlayback, PLAYBACK_SPEED_OPTIONS } from '../hooks/usePlayback';
import { getPhase, PHASE_LABELS, PHASE_COLORS } from '../lib/phaseDetection';
import {
  SYNC_MODES,
  datalogTimeToGpsTime,
  interpGps,
  gpsPathUpTo,
  computeGpsOffset,
} from '../lib/gpsSync';
import {
  groupColumnsByUnit,
  autoDomainForKeys,
  getColumnColor,
  formatValue,
  findColumnByRole,
} from '../lib/columnMeta';

const fmtSec = (s) => {
  const m = Math.floor(s / 60);
  return `${m}:${Math.round(s % 60).toString().padStart(2, '0')}`;
};

const EMPTY_PHASES = {
  hasPhases: false,
  warmupEnd: 0,
  fwStart: 0,
  fwEnd: 0,
  totalT: 0,
};

const UPLOAD_BAR_OFFSET = '52px';

function CustomTooltip({ active, payload, label, phases, colByKey }) {
  if (!active || !payload?.length) return null;
  const phaseLabel = phases?.hasPhases ? PHASE_LABELS[getPhase(label, phases)] : null;
  return (
    <div style={{ background: '#0f1117', border: '1px solid #1e2530', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <span style={{ color: '#6b7280' }}>{fmtSec(label)}</span>
        {phaseLabel && <span style={{ color: '#4b5563', fontSize: 10 }}>{phaseLabel}</span>}
      </div>
      {payload.map(p => {
        const col = colByKey[p.dataKey];
        return (
          <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between', minWidth: 130 }}>
            <span>{p.name}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {formatValue(p.value, col?.unit)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ThermalPlayback({
  rows,
  columns,
  selectedKeys,
  onSelectedKeysChange,
  ambient,
  phases,
  meta,
  gpsTrack,
  syncMode,
  onSyncModeChange,
  manualOffsetSec,
  onManualOffsetChange,
}) {
  const { settings } = useVisualizerSettings();
  const { maxGaugeBars, pageLayout } = settings;
  const isMapSidebar = pageLayout === PAGE_LAYOUTS.MAP_SIDEBAR;
  const isFixedMapScroll = pageLayout === PAGE_LAYOUTS.FIXED_MAP_SCROLL;

  const hasDatalog = Boolean(rows?.length && columns?.length);
  const hasGps = Boolean(gpsTrack?.points?.length);
  const gpsPoints = gpsTrack?.points ?? [];
  const gpsDuration = gpsTrack?.duration ?? 0;
  const activePhases = phases ?? EMPTY_PHASES;

  const colByKey = useMemo(
    () => Object.fromEntries((columns ?? []).map(c => [c.key, c])),
    [columns],
  );

  const visibleKeys = useMemo(
    () => selectedKeys.filter(k => colByKey[k]?.validCount >= 2),
    [selectedKeys, colByKey],
  );

  const [hiddenKeys, setHiddenKeys] = useState(new Set());

  const totalT = hasDatalog ? activePhases.totalT : gpsDuration;
  const timelineRows = useMemo(
    () => rows ?? gpsPoints.map(p => ({ t: p.t })),
    [rows, gpsPoints],
  );

  const datalogDuration = hasDatalog ? activePhases.totalT : 0;
  const mapHeight = hasDatalog ? 240 : 360;

  const { groups, unitOrder } = useMemo(
    () => groupColumnsByUnit(columns ?? [], visibleKeys),
    [columns, visibleKeys],
  );

  const primaryYAxisId = unitOrder.length > 0 ? groups[unitOrder[0]].yAxisId : 'axis_0';

  const iatCol = useMemo(() => findColumnByRole(columns ?? [], 'iat'), [columns]);
  const iatYAxisId = useMemo(() => {
    if (!iatCol) return primaryYAxisId;
    const unit = iatCol.unit || 'value';
    return groups[unit]?.yAxisId ?? primaryYAxisId;
  }, [iatCol, groups, primaryYAxisId]);
  const showIatDelta = iatCol && visibleKeys.includes(iatCol.key) && !hiddenKeys.has(iatCol.key);

  const seriesMeta = useMemo(
    () => visibleKeys.map((key, i) => ({
      key,
      col: colByKey[key],
      color: getColumnColor(colByKey[key], i),
      yAxisId: groups[colByKey[key]?.unit || 'value']?.yAxisId ?? 'axis_0',
      visible: !hiddenKeys.has(key),
    })),
    [visibleKeys, colByKey, groups, hiddenKeys],
  );

  const {
    playing, playTime, playbackRate, setPlaybackRate,
    handlePlayPause, handleReset, handleScrub, progressPct,
  } = usePlayback(totalT, timelineRows);

  const effectiveGpsT = useMemo(() => {
    if (!hasGps) return null;
    if (!hasDatalog) return playTime;
    if (syncMode === SYNC_MODES.OFF) return null;
    return datalogTimeToGpsTime(playTime, syncMode, datalogDuration, gpsDuration, manualOffsetSec);
  }, [hasGps, hasDatalog, playTime, syncMode, datalogDuration, gpsDuration, manualOffsetSec]);

  const mapPosition = useMemo(
    () => (effectiveGpsT != null ? interpGps(gpsPoints, effectiveGpsT) : null),
    [effectiveGpsT, gpsPoints],
  );

  const revealPath = useMemo(() => {
    if (!hasGps) return null;
    if (effectiveGpsT != null) return gpsPathUpTo(gpsPoints, effectiveGpsT);
    return null;
  }, [hasGps, effectiveGpsT, gpsPoints]);

  const mapGapOffset = useMemo(() => {
    if (!hasDatalog || !hasGps || syncMode !== SYNC_MODES.END) return 0;
    const offset = computeGpsOffset(syncMode, datalogDuration, gpsDuration, manualOffsetSec);
    return Math.max(0, offset);
  }, [hasDatalog, hasGps, syncMode, datalogDuration, gpsDuration, manualOffsetSec]);

  const chartData = useMemo(() => {
    if (!hasDatalog) return [];
    return rows.map(r => {
      const point = { t: r.t };
      for (const key of visibleKeys) point[key] = r[key];
      if (showIatDelta && iatCol) {
        point.deltaIAT = (r[iatCol.key] ?? ambient) - ambient;
        point.ambientRef = ambient;
      }
      return point;
    });
  }, [rows, visibleKeys, hasDatalog, showIatDelta, iatCol, ambient]);

  const visibleData = useMemo(() => {
    if (!hasDatalog || visibleKeys.length === 0) return chartData;
    if (playTime >= totalT) return chartData;
    const visible = chartData.filter(d => d.t <= playTime);
    const { t, values } = interpAt(rows, playTime, visibleKeys);
    const tip = { t, ...values };
    if (showIatDelta && iatCol) {
      tip.deltaIAT = (values[iatCol.key] ?? ambient) - ambient;
      tip.ambientRef = ambient;
    }
    visible.push(tip);
    return visible;
  }, [chartData, playTime, totalT, rows, visibleKeys, hasDatalog, showIatDelta, iatCol, ambient]);

  const currentValues = useMemo(() => {
    if (!hasDatalog || visibleKeys.length === 0) return {};
    return interpAt(rows, playTime, visibleKeys).values;
  }, [hasDatalog, rows, playTime, visibleKeys]);

  const phase = hasDatalog ? getPhase(playTime, activePhases) : 'gps';

  const sourceLabel = !hasDatalog
    ? 'GPS TRACK'
    : meta.source === 'bootmod3'
      ? 'BM3 DATALOG'
      : 'BIMMERLINK DATALOG';

  const title = hasDatalog ? 'Thermal Playback' : 'Route Playback';
  const durationMin = (totalT / 60).toFixed(1);
  const subtitle = hasDatalog
    ? `${durationMin} min · ${meta.fileName || 'datalog'}`
    : `${durationMin} min · ${gpsTrack?.name || gpsTrack?.fileName || 'gpx'}`;

  const pct = (t) => totalT > 0 ? (t / totalT) * 100 : 0;

  const gaugeSeries = seriesMeta.filter(s => s.visible).slice(0, maxGaugeBars);
  const curIAT = iatCol ? (currentValues[iatCol.key] ?? 0) : 0;
  const showMapSidebarGauges = isMapSidebar && hasGps && hasDatalog && gaugeSeries.length > 0;

  const toggleHidden = (key) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const gaugePanelProps = {
    gaugeSeries,
    currentValues,
    rows,
    playTime,
    phase,
    showIatDelta,
    ambient,
    curIAT,
  };

  const mapSection = hasGps ? (
    <div style={{ marginBottom: isFixedMapScroll ? 0 : 10 }}>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>
        ROUTE
        {mapPosition == null && hasDatalog && syncMode !== SYNC_MODES.OFF && (
          <span style={{ color: '#4b5563' }}> · no GPS position at this time</span>
        )}
      </div>
      <MapPlayback
        points={gpsPoints}
        currentPosition={mapPosition}
        revealPath={revealPath}
        height={mapHeight}
      />
    </div>
  ) : null;

  const chartSection = hasDatalog && visibleKeys.length > 0 ? (
    <div style={{ flex: 1, minWidth: 0, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, padding: '12px 6px 8px' }}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={visibleData} margin={{ top: 4, right: 30, bottom: 4, left: 0 }}>
          {activePhases.hasPhases && (
            <>
              <ReferenceArea x1={0} x2={activePhases.warmupEnd} yAxisId={primaryYAxisId} fill="#1e3a5f" fillOpacity={0.22} />
              <ReferenceArea x1={activePhases.warmupEnd} x2={activePhases.fwStart} yAxisId={primaryYAxisId} fill="#1a2e1a" fillOpacity={0.22} />
              <ReferenceArea x1={activePhases.fwStart} x2={activePhases.fwEnd} yAxisId={primaryYAxisId} fill="#14391e" fillOpacity={0.28} />
              <ReferenceArea x1={activePhases.fwEnd} x2={totalT} yAxisId={primaryYAxisId} fill="#1a1f2e" fillOpacity={0.22} />
            </>
          )}
          {showIatDelta && (
            <ReferenceLine y={ambient} yAxisId={iatYAxisId} stroke="#6b7280" strokeDasharray="4 4" strokeOpacity={0.4} />
          )}
          <CartesianGrid strokeDasharray="2 4" stroke="#1a1f2e" vertical={false} />
          <XAxis
            dataKey="t" type="number" domain={[0, totalT]} tickFormatter={fmtSec}
            tick={{ fill: '#374151', fontSize: 9, fontFamily: 'inherit' }}
            axisLine={false} tickLine={false} tickCount={10}
          />
          {unitOrder.map((unit) => {
            const g = groups[unit];
            const keysForAxis = unitOrder
              .filter(u => groups[u].yAxisId === g.yAxisId)
              .flatMap(u => groups[u].keys);
            const domain = autoDomainForKeys(rows, keysForAxis);
            const isLeft = g.orientation === 'left';
            return (
              <YAxis
                key={g.yAxisId}
                yAxisId={g.yAxisId}
                orientation={isLeft ? 'left' : 'right'}
                domain={domain}
                hide={g.hide}
                tick={{ fill: '#374151', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={isLeft ? 34 : 28}
                tickFormatter={v => {
                  if (unit === '°F' || unit === '°') return `${Math.round(v)}°`;
                  if (unit === '%') return `${Math.round(v)}%`;
                  return Math.abs(v) >= 100 ? Math.round(v) : v.toFixed(unit === 'AFR' ? 1 : 0);
                }}
              />
            );
          })}
          <Tooltip content={<CustomTooltip phases={activePhases} colByKey={colByKey} />} />
          {seriesMeta.map(s => s.visible && (
            <Line
              key={s.key}
              yAxisId={s.yAxisId}
              type="monotone"
              dataKey={s.key}
              name={s.col.label}
              stroke={s.color}
              strokeWidth={s.col.role === 'iat' ? 2 : 1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
          {showIatDelta && (
            <Line
              yAxisId={iatYAxisId}
              type="monotone"
              dataKey="ambientRef"
              name="Ambient"
              stroke="#6b7280"
              strokeWidth={1}
              dot={false}
              strokeDasharray="3 3"
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 10, padding: '4px 12px 0', justifyContent: 'center', flexWrap: 'wrap' }}>
        {seriesMeta.map(s => (
          <div key={s.key} onClick={() => toggleHidden(s.key)} style={{
            display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
            opacity: s.visible ? 1 : 0.3, fontSize: 11,
          }}>
            <div style={{ width: 14, height: 2, background: s.color, borderRadius: 1 }} />
            <span style={{ color: '#94a3b8' }}>{s.col.label}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const chartWithGauges = hasDatalog && visibleKeys.length > 0 && (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
      {chartSection}
      {!showMapSidebarGauges && gaugeSeries.length > 0 && (
        <GaugePanel {...gaugePanelProps} maxHeight={isFixedMapScroll ? undefined : 320} />
      )}
    </div>
  );

  const chartOnly = hasDatalog && visibleKeys.length > 0 && (
    <div style={{ marginBottom: 10 }}>{chartSection}</div>
  );

  const phaseBadges = hasDatalog && activePhases.hasPhases && (
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
  );

  const playbackSection = (
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
          {PLAYBACK_SPEED_OPTIONS.map(s => (
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
        {activePhases.hasPhases ? (
          <div style={{ height: 6, borderRadius: 3, background: '#1a1f2e', marginBottom: 6, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${pct(activePhases.warmupEnd)}%`, background: '#1e3a5f' }} />
            <div style={{ width: `${pct(activePhases.fwStart - activePhases.warmupEnd)}%`, background: '#1a2e1a' }} />
            <div style={{ width: `${pct(activePhases.fwEnd - activePhases.fwStart)}%`, background: '#14391e' }} />
            <div style={{ width: `${pct(totalT - activePhases.fwEnd)}%`, background: '#1a1f2e' }} />
          </div>
        ) : (
          <div style={{ height: 6, borderRadius: 3, background: '#1a1f2e', marginBottom: 6, overflow: 'hidden', display: 'flex' }}>
            {mapGapOffset > 0 && (
              <div
                style={{ width: `${pct(mapGapOffset)}%`, background: '#2a1f1f' }}
                title={`No GPS for first ${fmtSec(mapGapOffset)}`}
              />
            )}
            <div style={{ flex: 1, background: '#1a2e1a' }} />
          </div>
        )}
        {mapGapOffset > 0 && activePhases.hasPhases && (
          <div style={{
            position: 'absolute', top: -1, left: 0,
            width: `${pct(mapGapOffset)}%`, height: 8,
            background: '#f8717133', borderRadius: '3px 0 0 3px',
            pointerEvents: 'none',
          }} title={`No GPS for first ${fmtSec(mapGapOffset)}`} />
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

      {activePhases.hasPhases && (
        <div style={{ display: 'flex', fontSize: 9, color: '#374151', marginTop: 2, position: 'relative', height: 12 }}>
          <span style={{ position: 'absolute', left: `${pct(activePhases.warmupEnd)}%` }}>{fmtSec(activePhases.warmupEnd)}</span>
          <span style={{ position: 'absolute', left: `${pct(activePhases.fwStart)}%` }}>{fmtSec(activePhases.fwStart)}</span>
          <span style={{ position: 'absolute', left: `${pct(activePhases.fwEnd)}%`, transform: 'translateX(-100%)' }}>{fmtSec(activePhases.fwEnd)}</span>
        </div>
      )}
      {mapGapOffset > 0 && (
        <div style={{ fontSize: 9, color: '#374151', marginTop: 2 }}>
          GPS gap 0–{fmtSec(mapGapOffset)} (end-aligned)
        </div>
      )}
    </div>
  );

  const iatDeltaSection = showIatDelta && (
    <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, padding: '12px 6px 6px', marginBottom: 10 }}>
      <div style={{ paddingLeft: 8, marginBottom: 4, fontSize: 10, color: '#6b7280' }}>
        IAT delta above ambient ({ambient.toFixed(0)}°F)
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={visibleData} margin={{ top: 2, right: 30, bottom: 2, left: 0 }}>
          {activePhases.hasPhases && (
            <ReferenceArea x1={activePhases.fwStart} x2={activePhases.fwEnd} yAxisId="d" fill="#14391e" fillOpacity={0.35} />
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
  );

  const scrollableContent = (
    <>
      {hasDatalog && (
        <ColumnSelector
          columns={columns}
          selectedKeys={selectedKeys}
          onSelectedKeysChange={onSelectedKeysChange}
        />
      )}
      {phaseBadges}
      {showMapSidebarGauges ? chartOnly : chartWithGauges}
      {hasDatalog && visibleKeys.length === 0 && (
        <div style={{
          background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8,
          padding: 24, marginBottom: 10, textAlign: 'center', color: '#6b7280', fontSize: 11,
        }}>
          Select parameters above to visualize playback.
        </div>
      )}
      {playbackSection}
      {iatDeltaSection}
      <div style={{ fontSize: 9, color: '#1e2530', textAlign: 'center' }}>
        {hasDatalog ? 'click legend to toggle · ' : ''}drag scrub bar or use play controls
      </div>
    </>
  );

  const headerSection = (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#4ade80', marginBottom: 2 }}>
        {sourceLabel}{meta?.mapName ? ` · ${meta.mapName}` : ''}
      </div>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
        {title}
      </h1>
      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
        {subtitle}
        {hasDatalog && hasGps && (
          <span style={{ color: '#4b5563' }}> · + GPS</span>
        )}
      </p>
    </div>
  );

  const gpsSyncSection = hasGps && (
    <GpsSyncControls
      syncMode={syncMode}
      onSyncModeChange={onSyncModeChange}
      manualOffsetSec={manualOffsetSec}
      onManualOffsetChange={onManualOffsetChange}
      datalogDuration={datalogDuration}
      gpsDuration={gpsDuration}
      hasDatalog={hasDatalog}
      hasGps={hasGps}
    />
  );

  const mapRow = showMapSidebarGauges ? (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'stretch' }}>
      <div style={{ flex: 1, minWidth: 0 }}>{mapSection}</div>
      <GaugePanel {...gaugePanelProps} maxHeight={mapHeight + 24} style={{ width: 200 }} />
    </div>
  ) : mapSection;

  const pinnedZone = (
    <>
      {headerSection}
      {gpsSyncSection}
      {mapRow}
    </>
  );

  const outerStyle = {
    background: '#090b10',
    color: '#e2e8f0',
    fontFamily: "'IBM Plex Mono','Fira Code','Courier New',monospace",
    padding: '16px 14px',
    maxWidth: 960,
    margin: '0 auto',
    ...(isFixedMapScroll && hasGps ? {
      display: 'flex',
      flexDirection: 'column',
      minHeight: `calc(100dvh - ${UPLOAD_BAR_OFFSET})`,
      maxHeight: `calc(100dvh - ${UPLOAD_BAR_OFFSET})`,
      boxSizing: 'border-box',
    } : {
      minHeight: '100vh',
    }),
  };

  if (isFixedMapScroll && hasGps) {
    return (
      <div style={outerStyle}>
        <div style={{ flexShrink: 0 }}>{pinnedZone}</div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: 10 }}>
          {scrollableContent}
        </div>
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      {pinnedZone}
      {scrollableContent}
    </div>
  );
}
