# CSV Thermal Playback

Interactive React/Recharts visualization for Bootmod3 and BimmerLink datalogs. Upload a CSV (or Bootmod3 HTML export) and scrub through coolant, IAT, oil, speed, and boost over time with live gauges and an IAT-vs-ambient delta chart.

On first load the app shows a demo commute log from `public/demo-commute.csv`.

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Drag a datalog onto the upload bar or click **Upload CSV**.

```bash
npm run build    # production build → dist/
npm run preview  # preview production build
```

---

## Supported file formats

| Source | File type | Notes |
|--------|-----------|-------|
| Bootmod3 | `.csv` | Direct CSV download from BM3 |
| Bootmod3 | `.csv` / `.html` | HTML chart export (CSV embedded in `<pre id="log-data">`) |
| BimmerLink | `.csv` | Temperature-only logs (no speed/boost) |

### Column mapping

| Channel | Bootmod3 column | BimmerLink column |
|---------|-----------------|-------------------|
| Time | `Time` | `Time` |
| Coolant | `Coolant Temp[F]` | `Coolant temperature` |
| IAT | `IAT[F]` | `Intake air temperature` |
| Oil | `Oil Temp[F]` | `Oil temperature` |
| Speed | `Vehicle Speed[mph]` | — |
| Boost | `Boost (Pre-Throttle)[psig]` | — |

BimmerLink exports zeros during sensor warmup in the first ~30s; those are treated as missing. Speed and boost channels are hidden automatically when absent.

---

## Phase auto-detection

When speed data is available, the app shades four drive phases on the chart and scrub bar:

1. **Warm-up** — from 0 until sustained movement (>5 mph for 10s), or 15% of log duration (max 200s)
2. **City** — between warm-up and the high-flow band
3. **High-flow** — longest span where speed stays ≥45 mph, allowing brief dips up to 60s apart (minimum 45s total)
4. **City (end)** — after the high-flow band to log end

Logs without speed (BimmerLink) show a single timeline with no phase shading.

Ambient baseline is the minimum valid IAT in the first 120 seconds (cold-start intake temp).

---

## Controls

- **▶ Play / ⏸ Pause / ↺ Replay** — time-based animation (not sample-indexed); lines draw in smoothly between unevenly spaced rows
- **Playback rate** — 4× / 8× / 16× / 32× / 64× (default 16×)
- **Scrub bar** — drag to any point; phase colors shown when speed data is present
- **Legend toggles** — click Coolant, IAT, Oil, Speed, Boost to show/hide lines (Boost off by default)

---

## GPS fetch from Home Assistant (batch)

Bootmod3 CSVs have no GPS columns. Use [`datalogs/Bootmod3/apexlog_datalog_manifest.csv`](datalogs/Bootmod3/apexlog_datalog_manifest.csv) to pull device_tracker history from Home Assistant for each datalog time window.

**One-time setup**

1. Home Assistant → Profile → Security → create a **long-lived access token**
2. Confirm `device_tracker.alan_bb` (or your tracker entity) shows lat/lon in Developer Tools → States
3. Run from a machine on the same LAN as `http://10.0.0.44:8123`

**Fetch all logs in the manifest**

```powershell
$env:HA_TOKEN = "<your-long-lived-access-token>"
npm run fetch-gps -- --manifest "datalogs/Bootmod3/apexlog_datalog_manifest.csv"
```

**Options**

| Flag | Purpose |
|------|---------|
| `--dry-run` | Print time windows without calling HA |
| `--log-id bm3_20260618_104600` | Fetch a single manifest row |
| `--output-dir <path>` | Write sidecars elsewhere (default: manifest directory) |
| `--entity device_tracker.alan_bb` | Override entity for all rows |

Each row produces `{log_id}.gps.json` with log-relative `track` points (`t` in seconds from log start, `lat`, `lon`). The token is read from `HA_TOKEN` only — never commit it.

```powershell
npm run test:ha-gps   # unit checks for HA JSON parsing / merge
```

---

## Project layout

```
src/
  App.jsx                  — file upload, demo fetch, parse orchestration
  components/
    ThermalPlayback.jsx    — charts, gauges, playback UI
    FileUpload.jsx         — drag-and-drop upload
    GaugeBar.jsx           — live value bars
  hooks/
    usePlayback.js         — RAF clock + interpolation
  lib/
    parseDatalog.js        — Bootmod3 / BimmerLink parsers
    phaseDetection.js      — speed-based phase boundaries
    ambient.js             — IAT ambient baseline
    integrations/          — Home Assistant GPS fetch + merge (CLI + future UI)
scripts/
  fetch-manifest-gps.mjs   — batch GPS pull from manifest
  test-ha-gps.mjs          — HA parser unit checks
public/
  demo-commute.csv         — default demo log (BM3, 6-18-2026)
datalogs/                  — sample files for manual testing
commute-thermal (1).jsx    — original single-file prototype (reference)
```

---

## Tech

- React 19 + Vite 6
- Recharts 2
- `requestAnimationFrame` playback with linear interpolation between samples
- No backend; all parsing runs in the browser

---

## Original commute findings (demo log)

The bundled demo is a 19.7-minute BM3 log (N55, Stage 2+ E30, Max Cooling on). Key thermal behavior:

- Freeway IAT averaged ~74°F — ~+1°F above 73°F ambient while moving
- Idle/stopped IAT averaged ~87°F (+14°F above ambient)
- Coolant peaked ~210–218°F in city crawl, then Max Cooling pulled it to ~155–165°F on the move
- Oil plateaued around 194–197°F once fully warm

See [`commute-thermal (1).jsx`](commute-thermal%20(1).jsx) for the original hardcoded prototype this app was built from.
