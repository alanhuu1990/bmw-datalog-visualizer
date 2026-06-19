import { useState, useEffect, useRef } from 'react';

export function interp(rows, t) {
  const N = rows.length;
  if (N === 0) return [0, 0, 0, 0, 0, 0];
  if (t <= rows[0].t) {
    const r = rows[0];
    return [r.t, r.coolant ?? 0, r.iat ?? 0, r.oil ?? 0, r.speed ?? 0, r.boost ?? 0];
  }
  if (t >= rows[N - 1].t) {
    const r = rows[N - 1];
    return [r.t, r.coolant ?? 0, r.iat ?? 0, r.oil ?? 0, r.speed ?? 0, r.boost ?? 0];
  }

  let lo = 0;
  let hi = N - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].t <= t) lo = mid;
    else hi = mid;
  }

  const r0 = rows[lo];
  const r1 = rows[hi];
  const f = (t - r0.t) / (r1.t - r0.t);

  const lerp = (a, b) => {
    const va = a ?? 0;
    const vb = b ?? 0;
    return va + f * (vb - va);
  };

  return [
    t,
    lerp(r0.coolant, r1.coolant),
    lerp(r0.iat, r1.iat),
    lerp(r0.oil, r1.oil),
    lerp(r0.speed, r1.speed),
    lerp(r0.boost, r1.boost),
  ];
}

export function usePlayback(totalT, rows) {
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(totalT);
  const [playbackRate, setPlaybackRate] = useState(16);

  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const playTimeRef = useRef(totalT);
  const playbackRateRef = useRef(16);
  const playingRef = useRef(false);

  useEffect(() => {
    playTimeRef.current = totalT;
    setPlayTime(totalT);
    setPlaying(false);
  }, [totalT, rows]);

  useEffect(() => { playTimeRef.current = playTime; }, [playTime]);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

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
      const nextTime = Math.min(playTimeRef.current + dt * playbackRateRef.current, totalT);
      playTimeRef.current = nextTime;
      setPlayTime(nextTime);
      if (nextTime >= totalT) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, totalT]);

  const handlePlayPause = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (playTimeRef.current >= totalT) {
      playTimeRef.current = 0;
      setPlayTime(0);
    }
    setPlaying(true);
  };

  const handleReset = () => {
    setPlaying(false);
    playTimeRef.current = 0;
    setPlayTime(0);
  };

  const handleScrub = (e) => {
    const pct = parseFloat(e.target.value) / 100;
    const nextTime = pct * totalT;
    playTimeRef.current = nextTime;
    setPlayTime(nextTime);
  };

  return {
    playing,
    playTime,
    playbackRate,
    setPlaybackRate,
    handlePlayPause,
    handleReset,
    handleScrub,
    progressPct: totalT > 0 ? (playTime / totalT) * 100 : 0,
  };
}
