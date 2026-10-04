const fs = require('fs');
const assert = require('assert');

const localStorageData = {};
global.localStorage = {
  getItem: key => Object.prototype.hasOwnProperty.call(localStorageData,key) ? localStorageData[key] : null,
  setItem: (key,value) => { localStorageData[key] = String(value); },
  removeItem: key => { delete localStorageData[key]; },
  clear: () => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }
};
global.window = {};

const RECON_TARGETS = [
  { id:'T-01', name:'Registered', coords:[37.5,127.0] }
];

eval(fs.readFileSync('v28.js','utf8'));
eval(fs.readFileSync('v28-runtime.js','utf8'));
const v28 = window.v28;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    localStorage.clear();
    v28.state.activePlanId = null;
    v28.state.activeTrackId = null;
    if (v28.track.state !== 'OFF') v28.track.stop();
    fn();
    console.log('[PASS] ' + name);
    passed++;
  } catch (e) {
    console.error('[FAIL] ' + name + ': ' + e.message);
    failed++;
  }
}

function plan(name) {
  return v28.plans.create({ name:name || 'P' });
}

test('TrackV2 multiple tracks link to one PLAN', () => {
  const p = plan('Multi');
  const a = v28.track.start(p.id, {kind:'GPS',lat:37,lon:127,timestamp:1000,accuracyM:5});
  assert(a);
  v28.track.recordGps({lat:37.001,lon:127,timestamp:7000,accuracyM:5});
  v28.track.stop();

  const b = v28.track.start(p.id, {kind:'GPS',lat:37.01,lon:127.01,timestamp:10000,accuracyM:5});
  assert(b);
  v28.track.recordGps({lat:37.011,lon:127.011,timestamp:16000,accuracyM:5});
  v28.track.stop();

  const tracks = v28.track.list(p.id);
  assert.strictEqual(tracks.length,2);
  const storedPlan = v28.plans.get(p.id);
  assert.strictEqual(storedPlan.trackIds.length,2);
});

test('GPS continuous samples stay MEASURED', () => {
  const p = plan('Measured');
  v28.track.start(p.id, {kind:'GPS',lat:37,lon:127,timestamp:1000,accuracyM:5});
  v28.track.recordGps({lat:37.001,lon:127,timestamp:7000,accuracyM:5});
  const track = v28.track.get(v28.track.activeTrackId);
  assert.strictEqual(track.segments.length,1);
  assert.strictEqual(track.segments[0].kind,'MEASURED');
  assert.strictEqual(track.segments[0].points.length,2);
  assert(track.distance.measuredKm > 0);
  assert.strictEqual(track.distance.estimatedKm,0);
});

test('GPS gap creates LAST_FIX GPS_REACQUIRE bridge then new measured segment', () => {
  const p = plan('Gap');
  v28.track.start(p.id, {kind:'GPS',lat:37,lon:127,timestamp:1000,accuracyM:5});
  v28.track.recordGps({lat:37.001,lon:127,timestamp:7000,accuracyM:5});
  v28.track.markGpsGap();
  v28.track.recordGps({lat:37.01,lon:127.01,timestamp:15000,accuracyM:5});
  const track = v28.track.get(v28.track.activeTrackId);
  assert.strictEqual(track.segments.length,3);
  assert.strictEqual(track.segments[1].kind,'ESTIMATED');
  assert.strictEqual(track.segments[1].reason,'GPS_REACQUIRE');
  assert.strictEqual(track.segments[1].from.source,'LAST_FIX');
  assert.strictEqual(track.segments[1].to.source,'GPS');
  assert.strictEqual(track.segments[2].kind,'MEASURED');
  assert.strictEqual(track.segments[2].points.length,1);
  assert(track.distance.estimatedKm > 0);
});

test('GPS to TEMP to TEMP to GPS separates estimated bridges', () => {
  const p = plan('Hybrid');
  v28.track.start(p.id, {kind:'GPS',lat:37,lon:127,timestamp:1000,accuracyM:5});
  v28.track.markGpsGap();
  v28.track.recordTemp([37.01,127.01],5000);
  v28.track.recordTemp([37.02,127.02],9000);
  v28.track.recordGps({lat:37.03,lon:127.03,timestamp:13000,accuracyM:5});
  const track = v28.track.get(v28.track.activeTrackId);
  assert.strictEqual(track.segments[0].kind,'MEASURED');
  assert.strictEqual(track.segments[1].kind,'ESTIMATED');
  assert.strictEqual(track.segments[1].reason,'TEMP_BRIDGE');
  assert.strictEqual(track.segments[1].from.source,'LAST_FIX');
  assert.strictEqual(track.segments[1].to.source,'TEMP');
  assert.strictEqual(track.segments[2].kind,'ESTIMATED');
  assert.strictEqual(track.segments[2].from.source,'TEMP');
  assert.strictEqual(track.segments[2].to.source,'TEMP');
  assert.strictEqual(track.segments[3].kind,'ESTIMATED');
  assert.strictEqual(track.segments[3].reason,'GPS_REACQUIRE');
  assert.strictEqual(track.segments[3].from.source,'TEMP');
  assert.strictEqual(track.segments[3].to.source,'GPS');
  assert.strictEqual(track.segments[4].kind,'MEASURED');
});

test('PAUSE and RESUME create no bridge across pause gap', () => {
  const p = plan('Pause');
  v28.track.start(p.id, {kind:'GPS',lat:37,lon:127,timestamp:1000,accuracyM:5});
  v28.track.recordGps({lat:37.001,lon:127,timestamp:7000,accuracyM:5});
  assert.strictEqual(v28.track.pause(),true);
  assert.strictEqual(v28.track.recordGps({lat:38,lon:128,timestamp:9000,accuracyM:5}),false);
  assert.strictEqual(v28.track.resume({kind:'GPS',lat:38,lon:128,timestamp:12000,accuracyM:5}),true);
  const track = v28.track.get(v28.track.activeTrackId);
  assert.strictEqual(track.segments.length,2);
  assert.strictEqual(track.segments[0].kind,'MEASURED');
  assert.strictEqual(track.segments[1].kind,'MEASURED');
  assert.strictEqual(track.segments.some(s => s.kind === 'ESTIMATED'),false);
});

test('record starts without GPS and TEMP can anchor later', () => {
  const p = plan('No GPS');
  v28.track.start(p.id);
  assert.strictEqual(v28.track.state,'RECORDING');
  assert.strictEqual(v28.track.recordTemp([37,127],1000),true);
  assert.strictEqual(v28.track.recordTemp([37.01,127.01],5000),true);
  const track = v28.track.get(v28.track.activeTrackId);
  assert.strictEqual(track.segments.length,1);
  assert.strictEqual(track.segments[0].kind,'ESTIMATED');
});

test('active track recovery returns interrupted PAUSED session', () => {
  const p = plan('Recovery');
  const started = v28.track.start(p.id, {kind:'GPS',lat:37,lon:127,timestamp:1000,accuracyM:5});
  assert(started);
  const activeRaw = localStorageData['tactical_recon_active_track_v2'];
  assert(activeRaw);
  v28.track.pause();
  const recovered = v28.track.recover();
  assert(recovered);
  assert.strictEqual(v28.track.state,'PAUSED');
  assert.strictEqual(v28.track.get(recovered.id).interrupted,true);
});

test('deleting one track keeps PLAN and sibling tracks', () => {
  const p = plan('Delete');
  const first = v28.track.start(p.id, {kind:'GPS',lat:37,lon:127,timestamp:1000,accuracyM:5});
  v28.track.recordGps({lat:37.001,lon:127,timestamp:7000,accuracyM:5});
  v28.track.stop();
  const second = v28.track.start(p.id, {kind:'GPS',lat:38,lon:128,timestamp:10000,accuracyM:5});
  v28.track.recordGps({lat:38.001,lon:128,timestamp:16000,accuracyM:5});
  v28.track.stop();
  assert.strictEqual(v28.track.delete(first.id),true);
  assert(v28.plans.get(p.id));
  assert(v28.track.get(second.id));
  assert.strictEqual(v28.plans.get(p.id).trackIds.includes(first.id),false);
  assert.strictEqual(v28.plans.get(p.id).trackIds.includes(second.id),true);
});

test('GPX exports only MEASURED V2 points and separate trkseg', () => {
  const track = {
    schemaVersion:2,id:'T',planId:'P',startedAt:1,endedAt:2,interrupted:false,
    segments:[
      {kind:'MEASURED',source:'GPS',points:[
        {lat:37,lon:127,timestamp:1000},
        {lat:37.1,lon:127.1,timestamp:2000}
      ]},
      {kind:'ESTIMATED',reason:'TEMP_BRIDGE',
        from:{lat:37.1,lon:127.1,source:'GPS'},
        to:{lat:88.888,lon:166.666,source:'TEMP'}},
      {kind:'MEASURED',source:'GPS',points:[
        {lat:37.2,lon:127.2,timestamp:3000}
      ]}
    ],
    distance:{measuredKm:1,estimatedKm:9}
  };
  const gpx = v28.track.buildGpx([],[],[track]);
  assert(gpx.includes('lat="37" lon="127"'));
  assert(gpx.includes('lat="37.2" lon="127.2"'));
  assert.strictEqual(gpx.includes('88.888'),false);
  assert.strictEqual((gpx.match(/<trkseg>/g)||[]).length,2);
  assert(gpx.includes('Estimated omitted 9.000 km'));
});

test('GPX preserves legacy V1 tracks as measured track segments', () => {
  const gpx = v28.track.buildGpx([],[
    {targetName:'OLD',points:[[36,126,1000],[36.1,126.1,2000]]}
  ],[]);
  assert(gpx.includes('V27 TRACK OLD'));
  assert(gpx.includes('lat="36" lon="126"'));
});

test('BACKTRACK marks estimated boundary instead of inventing detail', () => {
  const track = {
    segments:[
      {kind:'MEASURED',source:'GPS',points:[
        {lat:37,lon:127,timestamp:1},
        {lat:37.01,lon:127.01,timestamp:2}
      ]},
      {kind:'ESTIMATED',reason:'GPS_REACQUIRE',
        from:{lat:37.01,lon:127.01,source:'LAST_FIX'},
        to:{lat:37.5,lon:127.5,source:'GPS'}},
      {kind:'MEASURED',source:'GPS',points:[
        {lat:37.5,lon:127.5,timestamp:3},
        {lat:37.51,lon:127.51,timestamp:4}
      ]}
    ]
  };
  const dest = v28.track.backtrackDestination(track,[37.51,127.51],8);
  assert(dest);
  assert.strictEqual(dest.estimated,true);
});

console.log('\nRuntime tests completed: ' + passed + ' passed, ' + failed + ' failed.');
if (failed > 0) process.exit(1);
