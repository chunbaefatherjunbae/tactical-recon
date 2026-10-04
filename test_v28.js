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

const RECON_TARGETS = [
  { id: 'T-99', name: 'Secret Base', coords: [38.1, 127.1] },
  { id: 'T-01', name: 'Legacy Registered Target', coords: [37.5, 127.0] }
];

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

  test('real registered target resolution through RECON_TARGETS', () => {
    assert.strictEqual(window.RECON_TARGETS, undefined, 'Fixture must not expose RECON_TARGETS on window');
    localStorageData['tactical_recon_registered_routes_v1'] = JSON.stringify({
      'T-99': {
        startPoint: { coords: [38.0, 127.0], name: 'Start', source: 'GPS' },
        updatedAt: '2026-10-04T12:00:00Z'
      }
    });

    const plans = v28.storage.getV27PlansAsV28();
    const plan = plans['v27-reg-T-99'];
    assert(plan, 'Plan should be mapped');
    assert.strictEqual(plan.name, 'Secret Base', 'Virtual plan uses resolved target name');
    assert.strictEqual(plan.objective.name, 'Secret Base');
    assert.deepStrictEqual(plan.objective.coords, [38.1, 127.1]);
    assert.strictEqual(plan.objective.source, 'SITE');
    assert.strictEqual(plan.legacy.source, 'REGISTERED_SITE');
  });

  test('legacy source normalized to V28 enum', () => {
    localStorageData['tactical_recon_intel_v2'] = JSON.stringify([
      { 
        id: 'L-1', name: 'Local Target', coords: [4, 4],
        routePlan: {
          startPoint: { coords: [4, 4], name: 'Start', source: 'LOCAL_SITE' },
          endPoint: { coords: [5, 5], name: 'End', source: 'UNKNOWN_MAGIC' }
        }
      }
    ]);
    const plans = v28.storage.getV27PlansAsV28();
    const plan = plans['v27-loc-L-1'];
    assert.strictEqual(plan.startPoint.source, 'SITE'); // normalized LOCAL_SITE -> SITE
    assert.strictEqual(plan.endPoint.source, 'IMPORT'); // normalized UNKNOWN -> IMPORT
  });

  test('invalid route/overlay coordinate rejected', () => {
    const validPlan = v28.schemas.sanitizePlanV1({
      startPoint: { coords: [100, 200] }, // out of bounds
      routeSegments: [[[200, 200]]]
    });
    assert.strictEqual(validPlan.startPoint, undefined);
    assert.strictEqual(validPlan.routeSegments.length, 0); // sanitized to empty array
    
    // Now validate raw manually with bad data
    const rawBadPlan = {
      schemaVersion: 1, id: '1', name: 'N', createdAt: 1, updatedAt: 1,
      routeSegments: [[[200, 200]]], overlaySegments: [], trackIds: []
    };
    assert.strictEqual(v28.schemas.validatePlanV1(rawBadPlan), false);
  });

  test('wrong START/VIA/END role rejected', () => {
    const rawBadPlan = {
      schemaVersion: 1, id: '1', name: 'N', createdAt: 1, updatedAt: 1,
      startPoint: { id: 's', role: 'VIA', coords: [1,1], source: 'GPS' }, // wrong role
      viaPoints: [], routeSegments: [], overlaySegments: [], trackIds: []
    };
    assert.strictEqual(v28.schemas.validatePlanV1(rawBadPlan), false);
  });

  test('malformed trackIds rejected', () => {
    const rawBadPlan = {
      schemaVersion: 1, id: '1', name: 'N', createdAt: 1, updatedAt: 1,
      trackIds: [123], // must be strings
      routeSegments: [], overlaySegments: []
    };
    assert.strictEqual(v28.schemas.validatePlanV1(rawBadPlan), false);
  });

  test('invalid legacy metadata rejected', () => {
    const rawBadPlan = {
      schemaVersion: 1, id: '1', name: 'N', createdAt: 1, updatedAt: 1,
      routeSegments: [], overlaySegments: [], trackIds: [],
      legacy: { source: 'MAGIC_SOURCE' } // Invalid source enum
    };
    assert.strictEqual(v28.schemas.validatePlanV1(rawBadPlan), false);
  });

  test('TRACK latitude > 90 rejected', () => {
    const badTrack = {
      schemaVersion: 2, id: 'id1', startedAt: 1,
      segments: [{ kind: 'MEASURED', source: 'GPS', points: [{lat: 91, lon: 1, timestamp: 1}] }],
      distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('invalid ESTIMATED endpoint source rejected', () => {
    const badTrack = {
      schemaVersion: 2, id: 'id1', startedAt: 1,
      segments: [{ kind: 'ESTIMATED', reason: 'TEMP_BRIDGE', from: { lat: 1, lon: 1, timestamp: 1, source: 'GPS' }, to: { lat: 2, lon: 2, timestamp: 2, source: 'INPUT' } }], // INPUT is invalid for to.source
      distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('invalid accuracyM rejected', () => {
    const badTrack = {
      schemaVersion: 2, id: 'id1', startedAt: 1,
      segments: [{ kind: 'MEASURED', source: 'GPS', points: [{lat: 1, lon: 1, timestamp: 1, accuracyM: -10}] }],
      distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('saveV28Plan preserves malformed sibling entries byte-for-byte semantically', () => {
    localStorageData['tactical_recon_plans_v1'] = JSON.stringify({
      'malformed_1': { schemaVersion: 1, name: 'Bad' },
      'valid_1': { schemaVersion: 1, id: 'valid_1', name: 'Good', createdAt: 1, updatedAt: 1, routeSegments: [], overlaySegments: [], trackIds: [] }
    });
    
    // Attempt save of new plan
    const newPlan = { id: 'new_1', name: 'New', createdAt: 2, updatedAt: 2 };
    v28.storage.saveV28Plan(newPlan);
    
    const rawSaved = JSON.parse(localStorageData['tactical_recon_plans_v1']);
    assert(rawSaved['malformed_1'], 'Malformed sibling must be preserved exactly');
    assert.strictEqual(rawSaved['malformed_1'].name, 'Bad');
    assert(rawSaved['valid_1'], 'Valid sibling preserved');
    assert(rawSaved['new_1'], 'New plan is saved');
  });

  test('saveV28Track preserves malformed sibling entries', () => {
    localStorageData['tactical_recon_track_logs_v2'] = JSON.stringify({
      'malformed_1': { schemaVersion: 2, startedAt: -1 }
    });
    const newTrack = { id: 'new_1', startedAt: 1, distance: { measuredKm: 0, estimatedKm: 0 }, segments: [] };
    v28.storage.saveV28Track(newTrack);
    const rawSaved = JSON.parse(localStorageData['tactical_recon_track_logs_v2']);
    assert(rawSaved['malformed_1'], 'Malformed sibling preserved');
    assert(rawSaved['new_1'], 'New track saved');
  });

  test('unparseable existing V28 storage causes save failure and original string remains unchanged', () => {
    localStorageData['tactical_recon_plans_v1'] = 'invalid json }{';
    const newPlan = { id: 'new_1', name: 'New', createdAt: 2, updatedAt: 2 };
    const result = v28.storage.saveV28Plan(newPlan);
    assert.strictEqual(result, false, 'Save should fail');
    assert.strictEqual(localStorageData['tactical_recon_plans_v1'], 'invalid json }{', 'Storage unchanged');
  });

  test('ISO V27 startedAt/endedAt conversion', () => {
    localStorageData['tactical_recon_track_logs_v1'] = JSON.stringify([
      {
        id: 'track_iso',
        startedAt: '2026-10-04T12:00:00Z',
        endedAt: '2026-10-04T12:05:00Z',
        distanceKm: 1,
        points: [[10, 10, '2026-10-04T12:01:00Z']] // valid timestamp string
      }
    ]);
    const tracks = v28.storage.getV27TracksAsV28();
    assert.strictEqual(tracks.length, 1);
    
    const ts = Date.parse('2026-10-04T12:00:00Z');
    assert.strictEqual(tracks[0].startedAt, ts);
    assert.strictEqual(tracks[0].segments[0].points[0].timestamp, Date.parse('2026-10-04T12:01:00Z'));
  });


  test('Registered V27 routePlan read', () => {
    localStorageData['tactical_recon_registered_routes_v1'] = JSON.stringify({
      'T-01': {
        startPoint: { coords: [37.4, 126.9], name: 'Start', source: 'GPS' },
        viaPoints: [{ coords: [37.45, 126.95], name: 'Via1', source: 'RETICLE' }],
        endPoint: { coords: [37.5, 127.0], name: 'End', source: 'INPUT' },
        segments: [[[37.4, 126.9], [37.45, 126.95], [37.5, 127.0]]],
        updatedAt: '2026-10-04T12:00:00Z'
      }
    });
    const plan = v28.storage.getV27PlansAsV28()['v27-reg-T-01'];
    assert(plan);
    assert.strictEqual(plan.objective.name, 'Legacy Registered Target');
    assert.deepStrictEqual(plan.startPoint.coords, [37.4, 126.9]);
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
    const plan = v28.storage.getV27PlansAsV28()['v27-loc-L-123'];
    assert(plan);
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
          endPoint: { coords: [4, 4], name: 'E', source: 'RETICLE' }
        }
      }
    ]);
    const plan = v28.storage.getV27PlansAsV28()['v27-loc-X-1'];
    assert.deepStrictEqual(plan.startPoint.coords, [2, 2]);
    assert.strictEqual(plan.startPoint.name, 'S');
    assert.deepStrictEqual(plan.viaPoints[0].coords, [3, 3]);
    assert.strictEqual(plan.viaPoints[0].address, 'addr');
    assert.deepStrictEqual(plan.endPoint.coords, [4, 4]);
  });

  test('Unresolved objective produces no fake objective and never [0,0]', () => {
    localStorageData['tactical_recon_registered_routes_v1'] = JSON.stringify({
      'UNKNOWN-TGT': { startPoint: { coords: [1, 1], name: 'Start', source: 'GPS' } }
    });
    const plan = v28.storage.getV27PlansAsV28()['v27-reg-UNKNOWN-TGT'];
    assert(plan);
    assert.strictEqual(plan.objective, undefined);
    assert.notDeepStrictEqual(plan.startPoint.coords, [0, 0]);
  });

  test('V1 TRACK startedAt/endedAt preservation', () => {
    localStorageData['tactical_recon_track_logs_v1'] = JSON.stringify([
      { id: 'track1', startedAt: 1000, endedAt: 2000, distanceKm: 5, points: [[10, 10, 1500]] },
      { id: 'track2', startedAt: 3000, endedAt: 4000, distanceKm: 2, points: [[20, 20, null], [30, 30, 'invalid']] }
    ]);
    const tracks = v28.storage.getV27TracksAsV28();
    assert.strictEqual(tracks.length, 2);
    assert.strictEqual(tracks[0].startedAt, 1000);
    assert.strictEqual(tracks[0].endedAt, 2000);
    assert.strictEqual(tracks[0].segments[0].points[0].timestamp, 1500);
    assert.strictEqual(tracks[1].startedAt, 3000);
    assert.strictEqual(tracks[1].endedAt, 4000);
    assert.strictEqual(tracks[1].segments[0].points[0].timestamp, 3000);
    assert.strictEqual(tracks[1].segments[0].points[1].timestamp, 3000);
  });

  test('Invalid latitude/longitude rejection', () => {
    const badPlan = {
      schemaVersion: 1, id: 'p', name: 'Bad', createdAt: 1, updatedAt: 1,
      startPoint: { id: 's', role: 'START', name: 'S', coords: [91, 0], source: 'GPS' },
      viaPoints: [], routeSegments: [], overlaySegments: [], trackIds: []
    };
    assert.strictEqual(v28.schemas.validatePlanV1(badPlan), false);
  });

  test('Invalid role/source/reason rejection', () => {
    const badSourcePlan = {
      schemaVersion: 1, id: 'p', name: 'Bad', createdAt: 1, updatedAt: 1,
      startPoint: { id: 's', role: 'START', name: 'S', coords: [1, 1], source: 'MAGIC' },
      viaPoints: [], routeSegments: [], overlaySegments: [], trackIds: []
    };
    assert.strictEqual(v28.schemas.validatePlanV1(badSourcePlan), false);

    const badReasonTrack = {
      schemaVersion: 2, id: 't', startedAt: 1,
      segments: [{
        kind: 'ESTIMATED', reason: 'BAD_REASON',
        from: { lat: 1, lon: 1, source: 'GPS' },
        to: { lat: 2, lon: 2, source: 'TEMP' }
      }],
      distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badReasonTrack), false);
  });

  test('Missing ESTIMATED endpoint rejection', () => {
    const badTrack = {
      schemaVersion: 2, id: 't', startedAt: 1,
      segments: [{
        kind: 'ESTIMATED', reason: 'TEMP_BRIDGE',
        from: { lat: 1, lon: 1, source: 'GPS' }
      }],
      distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('Negative/Infinity distance rejection', () => {
    const negative = {
      schemaVersion: 2, id: 't1', startedAt: 1, segments: [],
      distance: { measuredKm: -1, estimatedKm: 0 }
    };
    const infinite = {
      schemaVersion: 2, id: 't2', startedAt: 1, segments: [],
      distance: { measuredKm: 0, estimatedKm: Infinity }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(negative), false);
    assert.strictEqual(v28.schemas.validateTrackV2(infinite), false);
  });

  test('Malformed timestamp rejection', () => {
    const badTrack = {
      schemaVersion: 2, id: 't', startedAt: NaN, segments: [],
      distance: { measuredKm: 0, estimatedKm: 0 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(badTrack), false);
  });

  test('Malformed V28 storage is not exposed as valid data', () => {
    localStorageData['tactical_recon_track_logs_v2'] = JSON.stringify({
      'valid_1': {
        schemaVersion: 2, id: 'valid_1', startedAt: 1, segments: [],
        distance: { measuredKm: 0, estimatedKm: 0 }
      },
      'invalid_1': { schemaVersion: 2, id: 'invalid_1' }
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
        viaPoints: [{ coords: [2, 2], name: 'Via1', source: 'RETICLE' }]
      }
    });
    const p1 = v28.storage.getV27PlansAsV28()['v27-reg-T-01'];
    const p2 = v28.storage.getV27PlansAsV28()['v27-reg-T-01'];
    assert.strictEqual(p1.id, p2.id);
    assert.strictEqual(p1.viaPoints[0].id, p2.viaPoints[0].id);
  });

  test('Original V27 localStorage strings remain byte-for-byte unchanged after reads', () => {
    const ogRoutes = '{"T-01":{"startPoint":{"coords":[1,1],"source":"GPS"}}}';
    const ogIntel = '[{"id":"L-1","name":"Local","coords":[2,2],"routePlan":{"startPoint":{"coords":[2,2],"source":"GPS"}}}]';
    const ogTracks = '[{"id":"track","startedAt":1000,"endedAt":2000,"distanceKm":1,"points":[[1,1,1500]]}]';
    localStorageData['tactical_recon_registered_routes_v1'] = ogRoutes;
    localStorageData['tactical_recon_intel_v2'] = ogIntel;
    localStorageData['tactical_recon_track_logs_v1'] = ogTracks;
    v28.storage.getV27PlansAsV28();
    v28.storage.getV27TracksAsV28();
    assert.strictEqual(localStorageData['tactical_recon_registered_routes_v1'], ogRoutes);
    assert.strictEqual(localStorageData['tactical_recon_intel_v2'], ogIntel);
    assert.strictEqual(localStorageData['tactical_recon_track_logs_v1'], ogTracks);
  });

  test('ESTIMATED endpoints allow missing timestamps', () => {
    const track = {
      schemaVersion: 2, id: 'est-no-ts', startedAt: 1,
      segments: [{
        kind: 'ESTIMATED', reason: 'TEMP_BRIDGE',
        from: { lat: 1, lon: 1, source: 'GPS' },
        to: { lat: 2, lon: 2, source: 'TEMP' }
      }],
      distance: { measuredKm: 0, estimatedKm: 1 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(track), true);
  });

  test('ESTIMATED valid provided timestamps are preserved', () => {
    const seg = v28.schemas.sanitizeTrackSegment({
      kind: 'ESTIMATED', reason: 'TEMP_BRIDGE',
      from: { lat: 1, lon: 1, timestamp: 100, source: 'GPS' },
      to: { lat: 2, lon: 2, timestamp: 200, source: 'TEMP' }
    });
    assert.strictEqual(seg.from.timestamp, 100);
    assert.strictEqual(seg.to.timestamp, 200);
  });

  test('Malformed ESTIMATED timestamp is not invented or silently accepted', () => {
    const seg = v28.schemas.sanitizeTrackSegment({
      kind: 'ESTIMATED', reason: 'TEMP_BRIDGE',
      from: { lat: 1, lon: 1, timestamp: 'invalid', source: 'GPS' },
      to: { lat: 2, lon: 2, source: 'TEMP' }
    });
    assert.strictEqual(seg.from.timestamp, 'invalid');
    const track = {
      schemaVersion: 2, id: 'est-bad-ts', startedAt: 1,
      segments: [seg],
      distance: { measuredKm: 0, estimatedKm: 1 }
    };
    assert.strictEqual(v28.schemas.validateTrackV2(track), false);
  });

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
