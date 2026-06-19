import { useState, useMemo, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from "recharts";

// [time_s, coolant_F, iat_F, oil_F, speed_mph, boost_psig]
const RAW = [[0.0,88.0,73.0,87.0,0.0,0.0],[0.8,88.0,73.0,87.0,0.0,0.0],[1.8,88.0,73.0,89.0,0.0,0.0],[5.8,91.0,73.0,89.0,0.0,0.0],[13.0,92.0,73.0,91.0,0.0,0.0],[20.3,94.0,73.0,93.0,0.0,0.0],[29.3,96.0,73.0,95.0,0.0,0.0],[38.3,99.0,73.0,96.0,0.0,0.0],[47.3,99.0,73.0,98.0,0.0,0.0],[58.2,103.0,73.0,102.0,0.0,0.0],[68.0,104.0,73.0,104.0,0.0,0.0],[76.7,107.0,73.0,105.0,0.0,0.0],[85.1,107.0,75.0,107.0,0.0,0.0],[94.1,108.0,75.0,107.0,0.0,0.0],[103.3,111.0,75.0,109.0,0.0,0.0],[112.0,111.0,75.0,111.0,1.0,0.0],[119.2,115.0,75.0,113.0,3.0,0.0],[127.3,117.0,75.0,113.0,6.0,0.0],[134.0,119.0,73.0,109.0,17.0,0.3],[140.5,118.0,73.0,109.0,19.0,0.0],[148.0,118.0,75.0,113.0,6.0,0.0],[152.9,119.0,75.0,145.0,13.0,1.4],[157.0,125.0,73.0,114.0,21.0,0.3],[163.4,126.0,73.0,114.0,29.0,0.4],[169.1,131.0,73.0,118.0,28.0,0.0],[175.7,133.0,73.0,122.0,18.0,0.0],[182.2,134.0,73.0,123.0,20.0,0.0],[188.6,137.0,75.0,125.0,17.0,0.0],[195.7,138.0,75.0,129.0,3.0,0.0],[201.6,144.0,75.0,131.0,1.0,0.0],[203.3,157.0,75.0,132.0,2.0,0.0],[206.0,162.0,75.0,132.0,7.0,0.1],[210.8,153.0,73.0,132.0,18.0,1.2],[215.3,162.0,73.0,132.0,31.0,1.1],[220.5,168.0,73.0,132.0,38.0,0.9],[226.5,175.0,73.0,134.0,36.0,0.2],[231.9,177.0,73.0,136.0,27.0,0.0],[238.5,177.0,75.0,140.0,5.0,0.0],[244.5,177.0,75.0,143.0,0.0,0.0],[251.0,177.0,75.0,145.0,2.0,0.0],[256.7,179.0,73.0,143.0,27.0,1.3],[263.7,184.0,73.0,143.0,40.0,0.8],[269.5,188.0,73.0,145.0,37.0,0.2],[276.2,192.0,73.0,149.0,29.0,0.1],[282.7,192.0,75.0,150.0,15.0,0.0],[289.4,191.0,75.0,154.0,0.0,0.0],[296.8,191.0,75.0,156.0,0.0,0.0],[303.0,191.0,76.0,158.0,0.0,0.0],[310.3,191.0,76.0,159.0,0.0,0.0],[317.8,191.0,75.0,158.0,17.0,0.6],[325.6,195.0,73.0,158.0,29.0,0.3],[331.0,198.0,73.0,158.0,33.0,0.3],[340.5,202.0,75.0,159.0,34.0,0.1],[347.5,204.0,75.0,161.0,35.0,0.2],[355.4,206.0,75.0,165.0,33.0,0.2],[362.4,207.0,75.0,167.0,27.0,0.1],[370.6,208.0,75.0,168.0,13.0,0.0],[377.1,207.0,76.0,170.0,0.0,0.0],[386.4,207.0,76.0,170.0,0.0,0.0],[394.7,207.0,75.0,170.0,18.0,0.6],[402.4,210.0,75.0,170.0,31.0,1.1],[409.5,212.0,75.0,172.0,25.0,0.2],[416.7,215.0,75.0,174.0,22.0,0.1],[422.1,215.0,75.0,176.0,21.0,1.6],[428.4,218.0,73.0,176.0,38.0,1.1],[434.1,218.0,73.0,177.0,43.0,2.4],[437.6,215.0,73.0,177.0,54.0,2.6],[440.8,204.0,73.0,179.0,59.0,1.7],[443.7,195.0,73.0,181.0,59.0,0.6],[447.3,191.0,73.0,183.0,69.0,17.2],[449.7,191.0,69.0,185.0,69.0,0.3],[453.5,191.0,72.0,186.0,65.0,0.1],[458.6,191.0,73.0,186.0,62.0,0.5],[465.4,196.0,73.0,186.0,62.0,0.9],[472.4,203.0,75.0,188.0,62.0,0.7],[479.7,207.0,75.0,188.0,59.0,0.2],[484.6,210.0,75.0,190.0,53.0,0.1],[491.1,211.0,76.0,190.0,46.0,0.1],[496.9,212.0,76.0,190.0,9.0,0.1],[500.9,212.0,76.0,192.0,0.0,0.0],[508.8,210.0,77.0,194.0,0.0,0.0],[514.7,207.0,77.0,194.0,0.0,0.0],[521.3,206.0,79.0,194.0,3.0,0.0],[527.3,196.0,77.0,194.0,13.0,0.4],[533.9,185.0,77.0,194.0,17.0,0.3],[540.8,180.0,76.0,194.0,33.0,0.9],[548.0,176.0,76.0,194.0,36.0,0.5],[554.1,173.0,76.0,195.0,34.0,0.4],[562.1,169.0,77.0,195.0,31.0,0.2],[570.1,168.0,77.0,195.0,31.0,0.2],[577.7,165.0,79.0,194.0,24.0,0.0],[585.0,164.0,77.0,194.0,33.0,1.3],[592.5,180.0,87.0,197.0,42.0,0.3],[603.8,161.0,79.0,194.0,29.0,0.1],[611.5,160.0,80.0,194.0,11.0,0.0],[619.6,157.0,83.0,192.0,0.0,0.0],[628.9,160.0,83.0,192.0,0.0,0.0],[636.0,161.0,84.0,190.0,4.0,0.0],[641.2,162.0,81.0,190.0,20.0,0.9],[650.7,165.0,80.0,188.0,34.0,0.8],[657.4,165.0,80.0,190.0,32.0,0.7],[663.4,167.0,80.0,190.0,37.0,0.4],[670.1,167.0,79.0,190.0,50.0,0.6],[677.0,167.0,79.0,192.0,52.0,0.5],[684.8,164.0,81.0,192.0,42.0,0.2],[692.1,161.0,83.0,194.0,32.0,0.2],[699.4,158.0,83.0,194.0,21.0,0.0],[706.1,157.0,84.0,194.0,19.0,0.4],[712.8,157.0,81.0,192.0,31.0,2.0],[719.1,160.0,80.0,192.0,41.0,2.0],[726.0,160.0,80.0,192.0,44.0,0.3],[733.6,158.0,81.0,192.0,41.0,0.2],[740.4,157.0,83.0,192.0,36.0,0.3],[748.4,157.0,84.0,192.0,30.0,0.1],[756.1,154.0,86.0,192.0,9.0,0.0],[762.8,154.0,87.0,192.0,6.0,0.0],[768.2,156.0,83.0,192.0,26.0,1.5],[775.7,158.0,83.0,192.0,34.0,1.6],[783.2,161.0,83.0,192.0,29.0,3.8],[789.3,162.0,80.0,192.0,39.0,0.9],[796.0,164.0,81.0,192.0,38.0,0.3],[804.4,164.0,84.0,194.0,34.0,0.2],[812.0,164.0,86.0,194.0,22.0,0.1],[820.9,162.0,87.0,194.0,16.0,0.1],[828.6,162.0,87.0,194.0,6.0,0.0],[836.7,162.0,90.0,194.0,0.0,0.0],[844.5,162.0,90.0,194.0,0.0,0.0],[852.5,162.0,91.0,192.0,0.0,0.0],[860.7,162.0,92.0,192.0,0.0,0.0],[868.8,164.0,92.0,192.0,0.0,0.0],[876.7,164.0,94.0,190.0,0.0,0.0],[884.6,164.0,91.0,190.0,13.0,1.8],[892.0,167.0,86.0,190.0,38.0,0.6],[900.5,167.0,86.0,190.0,42.0,1.0],[908.3,167.0,86.0,192.0,44.0,0.4],[916.5,165.0,87.0,194.0,44.0,0.3],[924.5,162.0,87.0,194.0,45.0,0.5],[932.0,161.0,84.0,195.0,50.0,1.3],[939.2,161.0,83.0,195.0,56.0,1.2],[946.8,160.0,84.0,195.0,53.0,0.2],[954.3,157.0,87.0,195.0,48.0,0.1],[961.9,154.0,88.0,195.0,41.0,0.2],[969.4,154.0,84.0,195.0,45.0,0.3],[977.0,154.0,87.0,195.0,38.0,1.5],[984.8,154.0,86.0,195.0,39.0,0.8],[992.1,157.0,84.0,195.0,43.0,0.4],[1000.0,157.0,86.0,195.0,44.0,0.8],[1007.9,160.0,80.0,195.0,59.0,0.6],[1014.2,158.0,81.0,195.0,60.0,1.2],[1021.6,157.0,83.0,195.0,59.0,0.9],[1029.4,154.0,86.0,197.0,50.0,0.2],[1036.8,152.0,87.0,197.0,39.0,0.2],[1043.3,152.0,87.0,195.0,6.0,0.1],[1050.8,153.0,88.0,195.0,8.0,0.4],[1057.4,158.0,81.0,195.0,35.0,0.7],[1064.0,161.0,81.0,195.0,41.0,0.8],[1071.4,161.0,84.0,195.0,12.0,0.3],[1079.0,161.0,87.0,195.0,0.0,0.0],[1086.7,161.0,88.0,195.0,0.0,0.0],[1094.6,162.0,91.0,194.0,0.0,0.0],[1102.3,162.0,91.0,194.0,0.0,0.0],[1110.8,162.0,92.0,192.0,0.0,0.0],[1119.5,162.0,94.0,192.0,0.0,0.0],[1130.6,162.0,94.0,192.0,4.0,0.1],[1137.4,164.0,84.0,192.0,36.0,1.8],[1145.7,165.0,84.0,192.0,33.0,2.2],[1151.1,167.0,83.0,194.0,44.0,0.6],[1158.0,165.0,86.0,194.0,34.0,0.3],[1164.5,162.0,87.0,195.0,5.0,0.1],[1173.3,162.0,90.0,195.0,0.0,0.0],[1178.8,162.0,91.0,195.0,0.0,0.0]];

const AMBIENT = 73;
const FW_START = 444;
const FW_END = 1017;
const TOTAL_T = 1178.8;
const N = RAW.length;

const fmtSec = s => { const m = Math.floor(s / 60); return `${m}:${Math.round(s % 60).toString().padStart(2,'0')}`; };

function getPhase(t) {
  if (t < 200) return "warmup";
  if (t < FW_START) return "city";
  if (t < FW_END) return "freeway";
  return "city2";
}
const PHASE_LABELS = { warmup:"Warm-up", city:"City", freeway:"🛣 Freeway", city2:"City" };

// Interpolate value at arbitrary time t
function interp(t) {
  if (t <= RAW[0][0]) return RAW[0];
  if (t >= RAW[N-1][0]) return RAW[N-1];
  let lo = 0, hi = N - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (RAW[mid][0] <= t) lo = mid; else hi = mid; }
  const [t0, c0, i0, o0, s0, b0] = RAW[lo];
  const [t1, c1, i1, o1, s1, b1] = RAW[hi];
  const f = (t - t0) / (t1 - t0);
  return [t, c0 + f*(c1-c0), i0 + f*(i1-i0), o0 + f*(o1-o0), s0 + f*(s1-s0), b0 + f*(b1-b0)];
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0f1117", border:"1px solid #1e2530", borderRadius:6, padding:"8px 12px", fontSize:11 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:4 }}>
        <span style={{ color:"#6b7280" }}>{fmtSec(label)}</span>
        <span style={{ color:"#4b5563", fontSize:10 }}>{PHASE_LABELS[getPhase(label)]}</span>
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.color, display:"flex", gap:8, justifyContent:"space-between", minWidth:130 }}>
          <span>{p.name}</span>
          <span style={{ fontVariantNumeric:"tabular-nums", fontWeight:600 }}>
            {typeof p.value === "number" ? p.value.toFixed(p.name === "Boost" ? 1 : 0) : p.value}
            {p.name === "Speed" ? " mph" : p.name === "Boost" ? " psi" : "°F"}
          </span>
        </div>
      ))}
    </div>
  );
};

// Single animated progress bar
function GaugeBar({ label, value, min, max, color, unit, warningAt, dangerAt }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const isWarn = warningAt && value >= warningAt;
  const isDanger = dangerAt && value >= dangerAt;
  const barColor = isDanger ? "#ef4444" : isWarn ? "#f59e0b" : color;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:3 }}>
        <span style={{ fontSize:10, color:"#6b7280", letterSpacing:"0.08em" }}>{label}</span>
        <span style={{ fontSize:15, fontWeight:700, color: barColor, fontVariantNumeric:"tabular-nums", minWidth:54, textAlign:"right" }}>
          {value.toFixed(0)}<span style={{ fontSize:10, fontWeight:400, color:"#4b5563" }}> {unit}</span>
        </span>
      </div>
      <div style={{ height:8, background:"#1a1f2e", borderRadius:4, overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${pct}%`, borderRadius:4,
          background: `linear-gradient(90deg, ${color}88, ${barColor})`,
          transition:"width 0.12s ease, background 0.2s",
          boxShadow: isDanger ? `0 0 6px ${barColor}88` : "none",
        }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
        <span style={{ fontSize:9, color:"#374151" }}>{min}{unit}</span>
        <span style={{ fontSize:9, color:"#374151" }}>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [showCoolant, setShowCoolant] = useState(true);
  const [showIAT, setShowIAT]         = useState(true);
  const [showOil, setShowOil]         = useState(true);
  const [showSpeed, setShowSpeed]     = useState(true);
  const [showBoost, setShowBoost]     = useState(false);

  // Playback state — continuous time-based clock
  const [playing, setPlaying]           = useState(false);
  const [playTime, setPlayTime]         = useState(TOTAL_T);
  const [playbackRate, setPlaybackRate] = useState(16);
  const rafRef           = useRef(null);
  const lastTsRef        = useRef(null);
  const playTimeRef      = useRef(TOTAL_T);
  const playbackRateRef  = useRef(16);
  const playingRef       = useRef(false);
  useEffect(() => { playTimeRef.current = playTime; }, [playTime]);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  const chartData = useMemo(() =>
    RAW.map(([t, coolant, iat, oil, vehicleSpeed, boost]) => ({
      t, coolant, iat, oil, speed: vehicleSpeed, boost,
      ambientRef: AMBIENT,
      deltaIAT: iat - AMBIENT,
    })), []);

  // Reveal chart up to playTime, with one interpolated endpoint for a smooth line tip
  const visibleData = useMemo(() => {
    if (playTime >= TOTAL_T) return chartData;
    const rows = chartData.filter(d => d.t <= playTime);
    const [t, coolant, iat, oil, vehicleSpeed, boost] = interp(playTime);
    rows.push({ t, coolant, iat, oil, speed: vehicleSpeed, boost, ambientRef: AMBIENT, deltaIAT: iat - AMBIENT });
    return rows;
  }, [chartData, playTime]);

  const currentT = playTime;
  const [, curCoolant, curIAT, curOil, curSpeed, curBoost] = interp(currentT);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
      return;
    }
    const tick = (ts) => {
      if (!playingRef.current) return;
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const nextTime = Math.min(playTimeRef.current + dt * playbackRateRef.current, TOTAL_T);
      playTimeRef.current = nextTime;
      setPlayTime(nextTime);
      if (nextTime >= TOTAL_T) { setPlaying(false); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing]);

  const handlePlayPause = () => {
    if (playing) { setPlaying(false); return; }
    if (playTimeRef.current >= TOTAL_T) { playTimeRef.current = 0; setPlayTime(0); }
    setPlaying(true);
  };
  const handleReset = () => {
    setPlaying(false);
    playTimeRef.current = 0;
    setPlayTime(0);
  };
  const handleScrub = (e) => {
    const pct = parseFloat(e.target.value) / 100;
    const nextTime = pct * TOTAL_T;
    playTimeRef.current = nextTime;
    setPlayTime(nextTime);
  };

  const progressPct = (playTime / TOTAL_T) * 100;
  const phase = getPhase(currentT);
  const PHASE_COLORS = { warmup:"#60a5fa", city:"#86efac", freeway:"#4ade80", city2:"#94a3b8" };

  const LEGEND = [
    { key:"coolant", label:"Coolant", color:"#3b82f6", visible:showCoolant, toggle:()=>setShowCoolant(v=>!v) },
    { key:"iat",     label:"IAT",     color:"#f59e0b", visible:showIAT,     toggle:()=>setShowIAT(v=>!v) },
    { key:"oil",     label:"Oil",     color:"#ef4444", visible:showOil,     toggle:()=>setShowOil(v=>!v) },
    { key:"speed",   label:"Speed",   color:"#10b981", visible:showSpeed,   toggle:()=>setShowSpeed(v=>!v) },
    { key:"boost",   label:"Boost",   color:"#a78bfa", visible:showBoost,   toggle:()=>setShowBoost(v=>!v) },
  ];

  return (
    <div style={{ background:"#090b10", minHeight:"100vh", color:"#e2e8f0", fontFamily:"'IBM Plex Mono','Fira Code','Courier New',monospace", padding:"16px 14px", maxWidth:960, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, letterSpacing:"0.15em", color:"#4ade80", marginBottom:2 }}>BM3 DATALOG · N55 · STAGE 2+ E30 · MAX COOLING ON</div>
        <h1 style={{ fontSize:18, fontWeight:700, color:"#f8fafc", margin:0, letterSpacing:"-0.02em" }}>Morning Commute — Thermal Playback</h1>
        <p style={{ fontSize:11, color:"#6b7280", margin:"2px 0 0" }}>19.7 min · 2018 BMW M2 LCI · Garden Grove</p>
      </div>

      {/* Phase badges */}
      <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
        {[
          { label:"Warm-up",   color:"#1e3a5f", text:"#60a5fa" },
          { label:"City",      color:"#1a2e1a", text:"#86efac" },
          { label:"🛣 Freeway", color:"#14391e", text:"#4ade80" },
          { label:"City end",  color:"#1a1f2e", text:"#94a3b8" },
        ].map(p => (
          <div key={p.label} style={{ background:p.color, border:`1px solid ${p.text}33`, borderRadius:4, padding:"3px 8px", fontSize:10, color:p.text }}>{p.label}</div>
        ))}
      </div>

      {/* Main chart + gauges side by side */}
      <div style={{ display:"flex", gap:10, marginBottom:10 }}>

        {/* Chart */}
        <div style={{ flex:1, minWidth:0, background:"#0d1117", border:"1px solid #1f2937", borderRadius:8, padding:"12px 6px 8px" }}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={visibleData} margin={{ top:4, right:30, bottom:4, left:0 }}>
              <ReferenceArea x1={0}    x2={200}  yAxisId="temp" fill="#1e3a5f" fillOpacity={0.22}/>
              <ReferenceArea x1={200}  x2={444}  yAxisId="temp" fill="#1a2e1a" fillOpacity={0.22}/>
              <ReferenceArea x1={444}  x2={1018} yAxisId="temp" fill="#14391e" fillOpacity={0.28}/>
              <ReferenceArea x1={1018} x2={1179} yAxisId="temp" fill="#1a1f2e" fillOpacity={0.22}/>
              <ReferenceLine y={AMBIENT} yAxisId="temp" stroke="#6b7280" strokeDasharray="4 4" strokeOpacity={0.4}/>
              <CartesianGrid strokeDasharray="2 4" stroke="#1a1f2e" vertical={false}/>
              <XAxis dataKey="t" type="number" domain={[0, TOTAL_T]} tickFormatter={fmtSec}
                tick={{ fill:"#374151", fontSize:9, fontFamily:"inherit" }} axisLine={false} tickLine={false} tickCount={10}/>
              <YAxis yAxisId="temp" domain={[65, 225]} tick={{ fill:"#374151", fontSize:9 }} axisLine={false} tickLine={false}
                tickFormatter={v=>`${v}°`} width={30}/>
              <YAxis yAxisId="speed" orientation="right" domain={[0,90]} tick={{ fill:"#374151", fontSize:9 }} axisLine={false} tickLine={false} width={22}/>
              <YAxis yAxisId="boost" orientation="right" domain={[-2,20]} hide/>
              <Tooltip content={<CustomTooltip/>}/>
              {showCoolant && <Line yAxisId="temp"  type="monotone" dataKey="coolant"    name="Coolant" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false}/>}
              {showIAT     && <Line yAxisId="temp"  type="monotone" dataKey="iat"        name="IAT"     stroke="#f59e0b" strokeWidth={2}   dot={false} isAnimationActive={false}/>}
              {showOil     && <Line yAxisId="temp"  type="monotone" dataKey="oil"        name="Oil"     stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false}/>}
              {showIAT     && <Line yAxisId="temp"  type="monotone" dataKey="ambientRef" name="Ambient" stroke="#6b7280" strokeWidth={1}   dot={false} strokeDasharray="3 3" isAnimationActive={false}/>}
              {showSpeed   && <Line yAxisId="speed" type="monotone" dataKey="speed"      name="Speed"   stroke="#10b981" strokeWidth={1}   dot={false} strokeOpacity={0.7} isAnimationActive={false}/>}
              {showBoost   && <Line yAxisId="boost" type="monotone" dataKey="boost"      name="Boost"   stroke="#a78bfa" strokeWidth={1}   dot={false} strokeOpacity={0.8} isAnimationActive={false}/>}
            </LineChart>
          </ResponsiveContainer>

          {/* Legend toggles */}
          <div style={{ display:"flex", gap:10, padding:"4px 12px 0", justifyContent:"center", flexWrap:"wrap" }}>
            {LEGEND.map(l => (
              <div key={l.key} onClick={l.toggle} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", opacity:l.visible ? 1 : 0.3, fontSize:11 }}>
                <div style={{ width:14, height:2, background:l.color, borderRadius:1 }}/>
                <span style={{ color:"#94a3b8" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gauges panel */}
        <div style={{ width:190, flexShrink:0, background:"#0d1117", border:"1px solid #1f2937", borderRadius:8, padding:"14px 14px 10px" }}>
          {/* Current time + phase */}
          <div style={{ marginBottom:14, textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:700, color:"#f8fafc", fontVariantNumeric:"tabular-nums", letterSpacing:"-0.02em" }}>{fmtSec(currentT)}</div>
            <div style={{ fontSize:10, color: PHASE_COLORS[phase], marginTop:2 }}>{PHASE_LABELS[phase]}</div>
          </div>

          <GaugeBar label="COOLANT"  value={curCoolant} min={65}  max={225} color="#3b82f6" unit="°F" warningAt={210} dangerAt={220}/>
          <GaugeBar label="IAT"      value={curIAT}     min={65}  max={110} color="#f59e0b" unit="°F" warningAt={95}  dangerAt={105}/>
          <GaugeBar label="OIL"      value={curOil}     min={65}  max={215} color="#ef4444" unit="°F" warningAt={200} dangerAt={210}/>
          <GaugeBar label="SPEED"    value={curSpeed}   min={0}   max={90}  color="#10b981" unit="mph"/>
          <GaugeBar label="BOOST"    value={Math.max(0, curBoost)} min={0} max={20} color="#a78bfa" unit="psi" warningAt={15}/>

          {/* IAT delta badge */}
          <div style={{ marginTop:8, background: curIAT - AMBIENT <= 2 ? "#14532d" : curIAT - AMBIENT <= 10 ? "#1a3a1a" : "#3b1c1c",
            border:`1px solid ${curIAT - AMBIENT <= 2 ? "#4ade80" : curIAT - AMBIENT <= 10 ? "#86efac" : "#f87171"}44`,
            borderRadius:5, padding:"5px 8px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:"#6b7280", marginBottom:2 }}>IAT vs AMBIENT</div>
            <div style={{ fontSize:16, fontWeight:700, color: curIAT - AMBIENT <= 0 ? "#4ade80" : curIAT - AMBIENT <= 10 ? "#86efac" : "#f87171", fontVariantNumeric:"tabular-nums" }}>
              {curIAT - AMBIENT > 0 ? "+" : ""}{(curIAT - AMBIENT).toFixed(0)}°F
            </div>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div style={{ background:"#0d1117", border:"1px solid #1f2937", borderRadius:8, padding:"12px 14px", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          {/* Play/pause */}
          <button onClick={handlePlayPause} style={{
            background: playing ? "#1e3a5f" : "#14532d",
            border:`1px solid ${playing ? "#3b82f6" : "#4ade80"}`,
            borderRadius:6, color: playing ? "#93c5fd" : "#4ade80",
            padding:"6px 16px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600, minWidth:80,
          }}>
            {playing ? "⏸ PAUSE" : playTime >= TOTAL_T ? "↺ REPLAY" : "▶ PLAY"}
          </button>

          {/* Reset */}
          <button onClick={handleReset} style={{
            background:"transparent", border:"1px solid #1f2937", borderRadius:6, color:"#6b7280",
            padding:"6px 12px", cursor:"pointer", fontSize:11, fontFamily:"inherit",
          }}>⏮</button>

          {/* Speed selector */}
          <div style={{ display:"flex", gap:4, alignItems:"center", marginLeft:4 }}>
            <span style={{ fontSize:10, color:"#4b5563" }}>SPEED</span>
            {[4, 8, 16, 32, 64].map(s => (
              <button key={s} onClick={() => setPlaybackRate(s)} style={{
                background: playbackRate === s ? "#1e293b" : "transparent",
                border:`1px solid ${playbackRate === s ? "#6366f1" : "#1f2937"}`,
                borderRadius:4, color: playbackRate === s ? "#a5b4fc" : "#4b5563",
                padding:"3px 8px", cursor:"pointer", fontSize:10, fontFamily:"inherit",
              }}>{s}×</button>
            ))}
          </div>

          <div style={{ flex:1 }}/>
          <span style={{ fontSize:11, color:"#6b7280", fontVariantNumeric:"tabular-nums" }}>{fmtSec(currentT)} / {fmtSec(TOTAL_T)}</span>
        </div>

        {/* Scrub bar */}
        <div style={{ position:"relative" }}>
          {/* Phase color track */}
          <div style={{ height:6, borderRadius:3, background:"#1a1f2e", marginBottom:6, overflow:"hidden", display:"flex" }}>
            <div style={{ width:`${(200/TOTAL_T)*100}%`, background:"#1e3a5f" }}/>
            <div style={{ width:`${((444-200)/TOTAL_T)*100}%`, background:"#1a2e1a" }}/>
            <div style={{ width:`${((1018-444)/TOTAL_T)*100}%`, background:"#14391e" }}/>
            <div style={{ width:`${((TOTAL_T-1018)/TOTAL_T)*100}%`, background:"#1a1f2e" }}/>
          </div>
          <input type="range" min={0} max={100} step={0.1}
            value={progressPct.toFixed(1)}
            onChange={handleScrub}
            style={{ position:"absolute", top:-1, left:0, width:"100%", height:8, opacity:0, cursor:"pointer", zIndex:2 }}
          />
          {/* Playhead */}
          <div style={{ position:"absolute", top:-1, left:`${progressPct}%`, transform:"translateX(-50%)", width:3, height:8, background:"#f8fafc", borderRadius:2, pointerEvents:"none" }}/>
        </div>

        {/* Phase tick labels */}
        <div style={{ display:"flex", fontSize:9, color:"#374151", marginTop:2, position:"relative" }}>
          <span style={{ position:"absolute", left:`${(200/TOTAL_T)*100}%` }}>3:20</span>
          <span style={{ position:"absolute", left:`${(444/TOTAL_T)*100}%` }}>7:24</span>
          <span style={{ position:"absolute", left:`${(1018/TOTAL_T)*100}%`, transform:"translateX(-100%)" }}>16:58</span>
        </div>
      </div>

      {/* IAT delta mini chart */}
      <div style={{ background:"#0d1117", border:"1px solid #1f2937", borderRadius:8, padding:"12px 6px 6px", marginBottom:10 }}>
        <div style={{ paddingLeft:8, marginBottom:4, fontSize:10, color:"#6b7280" }}>IAT delta above ambient ({AMBIENT}°F)</div>
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={visibleData} margin={{ top:2, right:30, bottom:2, left:0 }}>
            <ReferenceArea x1={444} x2={1018} yAxisId="d" fill="#14391e" fillOpacity={0.35}/>
            <ReferenceLine y={0}  yAxisId="d" stroke="#6b7280" strokeOpacity={0.5}/>
            <ReferenceLine y={10} yAxisId="d" stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.3}/>
            <CartesianGrid strokeDasharray="2 4" stroke="#1a1f2e" vertical={false}/>
            <XAxis dataKey="t" type="number" domain={[0, TOTAL_T]} tickFormatter={fmtSec}
              tick={{ fill:"#374151", fontSize:9 }} axisLine={false} tickLine={false} tickCount={10}/>
            <YAxis yAxisId="d" domain={[-6, 25]} tick={{ fill:"#374151", fontSize:9 }} axisLine={false} tickLine={false}
              tickFormatter={v=>`${v>0?"+":""}${v}°`} width={30}/>
            <Line yAxisId="d" type="monotone" dataKey="deltaIAT" name="IAT Δ" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize:9, color:"#1e2530", textAlign:"center" }}>
        click legend to toggle · drag scrub bar or use play controls · BM3 Stage 2+ E30 · Pure 500 · CSF FMIC
      </div>
    </div>
  );
}
