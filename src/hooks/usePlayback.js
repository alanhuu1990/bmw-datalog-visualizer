import { useState, useEffect, useRef } from 'react';

export const PLAYBACK_SPEED_OPTIONS = [1, 4, 8, 16, 32, 64];
export const DEFAULT_PLAYBACK_RATE = 16;

/** Min ms between React playTime publishes — avoids Recharts blocking UI at 1×. */
function uiPublishIntervalMs(playbackRate) {
  if (playbackRate <= 1) return 33;
  if (playbackRate <= 4) return 20;
  return 0;
}

/** Return rows with t <= target using binary search (data must be sorted by t). */
export function sliceByTime(data, targetT, timeKey = 't') {
  if (!data.length) return [];
  if (targetT >= data[data.length - 1][timeKey]) return data;

  let lo = 0;
  let hi = data.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (data[mid][timeKey] <= targetT) lo = mid;
    else hi = mid - 1;
  }
  return data.slice(0, lo + 1);
}

export function interpAt(rows, t, keys = []) {
  const N = rows.length;
  const values = {};

  if (N === 0) {
    for (const key of keys) values[key] = null;
    return { t, values };
  }

  const sample = (row) => {
    for (const key of keys) {
      values[key] = Number.isFinite(row[key]) ? row[key] : null;
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
    const va = r0[key];
    const vb = r1[key];
    values[key] =
      Number.isFinite(va) && Number.isFinite(vb)
        ? va + f * (vb - va)
        : null;
  }

  return { t, values };
}

export function usePlayback(totalT, rows) {
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(totalT);
  const [playbackRate, setPlaybackRate] = useState(DEFAULT_PLAYBACK_RATE);

  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const playTimeRef = useRef(totalT);
  const playbackRateRef = useRef(DEFAULT_PLAYBACK_RATE);
  const playingRef = useRef(false);
  const lastUiPublishRef = useRef(0);

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
      const uiInterval = uiPublishIntervalMs(playbackRateRef.current);
      const shouldPublish =
        nextTime >= totalT
        || uiInterval === 0
        || ts - lastUiPublishRef.current >= uiInterval;
      if (shouldPublish) {
        lastUiPublishRef.current = ts;
        setPlayTime(nextTime);
      }
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
      setPlayTime(playTimeRef.current);
      return;
    }
    if (playTimeRef.current >= totalT) {
      playTimeRef.current = 0;
      setPlayTime(0);
    }
    lastUiPublishRef.current = 0;
    setPlaying(true);
  };

  const handleReset = () => {
    setPlaying(false);
    playTimeRef.current = 0;
    lastUiPublishRef.current = 0;
    setPlayTime(0);
  };

  const handleScrub = (e) => {
    const pct = parseFloat(e.target.value) / 100;
    const nextTime = pct * totalT;
    playTimeRef.current = nextTime;
    lastUiPublishRef.current = 0;
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
