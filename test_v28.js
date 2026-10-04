// v28.test.js
const fs = require('fs');
const assert = require('assert');

// Mock localStorage
const localStorageData = {};
global.localStorage = {
  getItem: key => localStorageData[key] || null,
  setItem: (key, value) => { localStorageData[key] = value; },
  clear: () => { for (const k in localStorageData) delete localStorageData[k]; }
};

global.window = {};

// Run script
const code = fs.readFileSync('v28.js', 'utf8');
eval(code);
const v28 = window.v28;

function runTests() {
  console.log('--- Running Tests ---');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      localStorage.clear();
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] ${name}\n`, e);
      failed++;
    }
  }

  test('Registered V27 routePlan read', () => {
    localStorageData['tactical_recon_registered_routes_v1'] = JSON.stringify({
      'T-01': {
        startPoint: { coords: [1, 1], name: 'Start', source: 'GPS' },
        viaPoints: [{ coords: [2, 2], name: 'Via1', source: 'RETICLE' }],
        endPoint: { coords: [3, 3], name: 'End', source: 'INPUT' },
        segments: [[[1, 1], [2, 2], [3, 3]]],
        updatedAt: '2026-10-04T12:00:00Z'
      }
    });
    // mock target in intel for resolution
    localStorageData['tactical_recon_intel_v2'] = JSON.stringify([
      { id: 'T-01', name: 'My Target', coords: [1.5, 1.5] }
    ]);

    const plans = v28.storage.getV27PlansAsV28();
    const plan = plans['v27-reg-T-01'];
    assert(plan, 'Plan should be mapped');
    assert.strictEqual(plan.objective.name, 'My Target');
    assert.deepStrictEqual(plan.objective.coords, [1.5, 1.5]);
    assert.deepStrictEqual(plan.startPoint.coords, [1, 1]);
    assert.strictEqual(plan.legacy.source, 'REGISTERED_SITE');
    assert.strictEqual(plan.legacy.sourceId, 'T-01');
  });

  test('Local tactical_recon_intel_v2 routePlan read', () => {
    localStorageData['tactical_recon_intel_v2'] = JSON.stringify([
      { 
        id: 'L-123', name: 'Local Target', coords: [4, 4],
        routePlan: {
          startPoint: { coords: [4, 4], name: 'Start', source: 'GPS' },
          endPoint: { coords: [5, 5], name: 'End', source: 'RETICLE' },
          segments: [[[4, 4], [5, 5]]]
        }
      }
    ]);
    const plans = v28.storage.getV27PlansAsV28();
    const plan = plans['v27-loc-L-123'];
    assert(plan, 'Local plan should be mapped');
    assert.strictEqual(plan.objective.name, 'Local Target');
    assert.deepStrictEqual(plan.startPoint.coords, [4, 4]);
    assert.strictEqual(plan.legacy.source, 'LOCAL_SITE');
    assert.strictEqual(plan.legacy.sourceId, 'L-123');
  });

  test('START/VIA/END object mapping', () => {
    localStorageData['tactical_recon_intel_v2'] = JSON.stringify([
      { 
        id: 'X-1', name: 'Tgt', coords: [1, 1],
        routePlan: {
          startPoint: { coords: [2, 2], name: 'S', source: 'GPS' },
          viaPoints: [{ id: 'v1', coords: [3, 3], name: 'V', source: 'INPUT', address: 'addr' }],
          endPoint: { coords: [4, 4], name: 'E', source: 'RETICLE' },
        }
      }
    ]);
    const plans = v28.storage.getV27PlansAsV28();
    const plan = plans['v27-loc-X-1'];
    assert.deepStrictEqual(plan.startPoint.coords, [2, 2]);
    assert.strictEqual(plan.startPoint.name, 'S');
    assert.deepStrictEqual(plan.viaPoints[0].coords, [3, 3]);
    assert.strictEqual(plan.viaPoints[0].address, 'addr');
    assert.deepStrictEqual(plan.endPoint.coords, [4, 4]);
  });

  test('Unresolved objective produces no fake objective and never [0,0]', () => {
    localStorageData['tactical_recon_registered_routes_v1'] = JSON.stringify({
      'UNKNOWN-TGT': {
        startPoint: { coords: [1, 1], name: 'Start', source: 'GPS' }
      }
    });
    // Target is NOT in intel
    const plans = v28.storage.getV27PlansAsV28();
    const plan = plans['v27-reg-UNKNOWN-TGT'];
    assert(plan, 'Plan should be mapped without objective');
    assert.strictEqual(plan.objective, undefined, 'Objective should be omitted');
  });

  test('V1 TRACK startedAt/endedAt preservation', () => {
    localStorageData['tactical_recon_track_logs_v1'] = JSON.stringify([
      {
        id: 'track1',
        startedAt: 1000,
        endedAt: 2000,
        distanceKm: 5,
        points: [[10, 10, 1500]] // valid timestamp
      },
      {
        id: 'track2',
        startedAt: 3000,
        endedAt: 4000,
        distanceKm: 2,
        points: [[20, 20, NaN], [30, 30, 'invalid']] // invalid timestamps should not replace startedAt, handled via fallback
      }
    ]);
    const tracks = v28.storage.getV27TracksAsV28();
    assert.strictEqual(tracks.length, 2);
    
    assert.strictEqual(tracks[0].startedAt, 1000);
    assert.strictEqual(tracks[0].endedAt, 2000);
    assert.strictEqual(tracks[0].segments[0].points[0].timestamp, 1500);

    assert.strictEqual(tracks[1].startedAt, 3000);
    // Note: the point fallback will use 3000
    assert.strictEqual(tracks[1].segments[0].points[0].timestamp, 3000);
    assert.strictEqual(tracks[1].segments[0].points[1].timestamp, 3000);
  });

  test('Invalid latitude/longitude rejection', () => {
    const validPlan = v28.schemas.sanitizePlanV1({
      startPoint: { coords: [100, 200] } // out of bounds
    });
    assert.strictEqual(validPlan.startPoint, undefined);
  });

  test('Invalid role/source/reason rejection', () => {
    // We check validateTrackV2 behavior
    const badTrack = {
      schemaVersion: 2, id: 'id1', startedAt: 1,
      segments: [{ kind: 'ESTIMATED', reason: 'BAD_REASON', from: { lat: 1, lon: 1, timestamp: 1 }, to: { lat: 2, lon: 2, timestamp: 2 } }],
      distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('Missing ESTIMATED endpoint rejection', () => {
    const badTrack = {
      schemaVersion: 2, id: 'id1', startedAt: 1,
      segments: [{ kind: 'ESTIMATED', reason: 'TEMP_BRIDGE', from: { lat: 1, lon: 1, timestamp: 1 } }], // missing `to`
      distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('Negative/Infinity distance rejection', () => {
    const badTrack = {
      schemaVersion: 2, id: 'id1', startedAt: 1,
      segments: [],
      distance: { measuredKm: -1, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('Malformed timestamp rejection', () => {
    const badTrack = {
      schemaVersion: 2, id: 'id1', startedAt: NaN,
      segments: [], distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('Malformed V28 storage is not exposed as valid data', () => {
    localStorageData['tactical_recon_track_logs_v2'] = JSON.stringify({
      'valid_1': { schemaVersion: 2, id: 'valid_1', startedAt: 1, segments: [], distance: { measuredKm: 0, estimatedKm: 0 } },
      'invalid_1': { schemaVersion: 2, id: 'invalid_1' } // missing startedAt, distance
    });
    const tracks = v28.storage.getV28Tracks();
    assert.strictEqual(Object.keys(tracks).length, 1);
    assert(tracks['valid_1']);
    assert(!tracks['invalid_1']);
  });

  test('Repeated legacy read produces stable IDs', () => {
    localStorageData['tactical_recon_registered_routes_v1'] = JSON.stringify({
      'T-01': {
        startPoint: { coords: [1, 1], name: 'Start', source: 'GPS' },
        viaPoints: [{ coords: [2, 2], name: 'Via1', source: 'RETICLE' }],
      }
    });
    const plans1 = v28.storage.getV27PlansAsV28();
    const plans2 = v28.storage.getV27PlansAsV28();
    
    const p1 = plans1['v27-reg-T-01'];
    const p2 = plans2['v27-reg-T-01'];
    
    assert.strictEqual(p1.id, p2.id);
    assert.strictEqual(p1.viaPoints[0].id, p2.viaPoints[0].id);
  });

  test('Original V27 localStorage strings remain byte-for-byte unchanged after reads', () => {
    const ogRoutes = '{"T-01":{"startPoint":{"coords":[1,1],"source":"GPS"}}}';
    const ogIntel = '[{"id":"T-01","name":"Target","coords":[2,2]}]';
    localStorageData['tactical_recon_registered_routes_v1'] = ogRoutes;
    localStorageData['tactical_recon_intel_v2'] = ogIntel;
    
    v28.storage.getV27PlansAsV28();
    
    assert.strictEqual(localStorageData['tactical_recon_registered_routes_v1'], ogRoutes);
    assert.strictEqual(localStorageData['tactical_recon_intel_v2'], ogIntel);
  });

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
