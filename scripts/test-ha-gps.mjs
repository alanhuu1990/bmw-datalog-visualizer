import assert from 'node:assert/strict';
import {
  extractGpsFromHaState,
  gpsChannelAvailable,
  parseHaHistoryResponse,
  buildHaHistoryUrl,
} from '../src/lib/integrations/homeassistant.js';
import { mergeHaSamplesToGpsTrack } from '../src/lib/integrations/gpsMerge.js';

const HA_FIXTURE = [
  [
    {
      entity_id: 'device_tracker.alan_bb',
      state: 'home',
      attributes: { latitude: 42.3601, longitude: -71.0589, gps_accuracy: 10 },
      last_changed: '2026-06-17T16:00:00.000Z',
    },
    {
      entity_id: 'device_tracker.alan_bb',
      state: 'not_home',
      attributes: { latitude: 42.365, longitude: -71.06, gps_accuracy: 8 },
      last_changed: '2026-06-17T16:01:00.000Z',
    },
    {
      entity_id: 'device_tracker.alan_bb',
      state: 'not_home',
      attributes: { friendly_name: 'Alan BB' },
      last_changed: '2026-06-17T16:02:00.000Z',
    },
  ],
];

assert.deepEqual(extractGpsFromHaState(HA_FIXTURE[0][0]), {
  iso: '2026-06-17T16:00:00.000Z',
  lat: 42.3601,
  lon: -71.0589,
});
assert.equal(extractGpsFromHaState(HA_FIXTURE[0][2]), null);

const samples = parseHaHistoryResponse(HA_FIXTURE);
assert.equal(samples.length, 2);
assert.equal(samples[0].lat, 42.3601);
assert.equal(samples[1].lon, -71.06);
assert.deepEqual(parseHaHistoryResponse(null), []);

assert.equal(gpsChannelAvailable([]), false);
assert.equal(gpsChannelAvailable([{ t: 0, lat: 1, lon: 2 }]), false);
assert.equal(
  gpsChannelAvailable([
    { t: 0, lat: 1, lon: 2 },
    { t: 1, lat: 3, lon: 4 },
  ]),
  true,
);

const track = mergeHaSamplesToGpsTrack(samples, '2026-06-17T16:00:00.000Z', 120);
assert.equal(track.length, 2);
assert.equal(track[0].t, 0);
assert.equal(track[1].t, 60);

const url = buildHaHistoryUrl(
  'http://10.0.0.44:8123',
  'device_tracker.alan_bb',
  '2026-06-18T10:46:00-07:00',
  '2026-06-18T10:54:53-07:00',
);
assert.ok(url.includes('/api/history/period/'));
assert.ok(url.includes('filter_entity_id=device_tracker.alan_bb'));
assert.ok(!url.includes('minimal_response'), 'must not strip GPS attributes');

console.log('OK ha-gps: all checks passed');
