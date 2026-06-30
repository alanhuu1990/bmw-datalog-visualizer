import { readFileSync } from 'node:fs';
import { parseGpx } from '../src/lib/parseGpx.js';
import {
  SYNC_MODES,
  datalogTimeToGpsTime,
  computeGpsOffset,
  describeSyncGap,
} from '../src/lib/gpsSync.js';

const gpxPath = process.argv[2] || 'datalogs/gps_tracks/Tuesday Morning Track.gpx';
const content = readFileSync(gpxPath, 'utf8');
const track = parseGpx(content, gpxPath);

console.log('GPX:', track.name || track.fileName);
console.log('Points:', track.points.length);
console.log('Duration:', track.duration.toFixed(1), 's');

const datalog18 = 18 * 60;
const gps16 = 16 * 60;

const offset = computeGpsOffset(SYNC_MODES.END, datalog18, gps16, 0);
const gap = describeSyncGap(SYNC_MODES.END, datalog18, gps16, 0);
console.log('\nEnd-align example (18min datalog, 16min GPS):');
console.log('  offset:', offset, 's');
console.log('  gap:', gap?.gapSec, 's');

const at0 = datalogTimeToGpsTime(0, SYNC_MODES.END, datalog18, gps16, 0);
const at120 = datalogTimeToGpsTime(120, SYNC_MODES.END, datalog18, gps16, 0);
const atEnd = datalogTimeToGpsTime(datalog18, SYNC_MODES.END, datalog18, gps16, 0);
console.log('  gps@datalog 0s:', at0);
console.log('  gps@datalog 120s:', at120);
console.log('  gps@datalog end:', atEnd);

console.log('\nOK');
