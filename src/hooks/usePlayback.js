import { useState, useEffect, useRef } from 'react';

export function interpAt(rows, t, keys = []) {
  const N = rows.length;
  const values = {};

  if (N === 0) {
    for (const key of keys) values[key] = 0;
    return { t, values };
  }

  const sample = (row) => {
    for (const key of keys) {
      values[key] = row[key] ?? 0;
    }
    return { t: row.t, values };
  };

  if (t <= rows[0].t) return sample(rows[0]);
  if (t >= rows[N - 1].t) return sample(rows[N - 1]);

  let lo = 0;
  let hi = N - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].t <= t) lo = mid;
    else hi = mid;
  }

  const r0 = rows[lo];
  const r1 = rows[hi];
  const span = r1.t - r0.t;
  const f = span > 0 ? (t - r0.t) / span : 0;

  for (const key of keys) {
    const va = r0[key] ?? 0;
    const vb = r1[key] ?? 0;
    values[key] = va + f * (vb - va);
  }

  return { t, values };
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
