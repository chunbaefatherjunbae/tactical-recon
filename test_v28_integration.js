const fs = require('fs');
const assert = require('assert');

const sw = fs.readFileSync('service-worker.js','utf8');
const v28 = fs.readFileSync('v28.js','utf8');
const runtime = fs.readFileSync('v28-runtime.js','utf8');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('[PASS] ' + name);
    passed++;
  } catch (e) {
    console.error('[FAIL] ' + name + ': ' + e.message);
    failed++;
  }
}

test('PWA cache version is V28 integrated', () => {
  assert(sw.includes("const CACHE_VERSION = 'v28-integrated-20261004';"));
});

test('PWA static cache includes V28 CSS, foundation and runtime', () => {
  assert(sw.includes("'./v28.css'"));
  assert(sw.includes("'./v28.js'"));
  assert(sw.includes("'./v28-runtime.js'"));
});

test('PWA injects foundation before integrated runtime', () => {
  const foundation = sw.indexOf("html.includes('v28.js')");
  const runtimePos = sw.indexOf("html.includes('v28-runtime.js')");
  assert(foundation >= 0);
  assert(runtimePos > foundation);
});

test('V28 main navigation contains Korean and English labels', () => {
  ['목표','경로','거점','메뉴','OBJECTIVE','ROUTES','SITES','MENU'].forEach(label => {
    assert(v28.includes(label), 'missing nav label ' + label);
  });
});

test('active TrackV2 recovery key is exact', () => {
  assert(runtime.includes("const ACTIVE_TRACK_KEY = 'tactical_recon_active_track_v2';"));
});

test('GPS OFF override does not stop TrackV2 session', () => {
  const start = runtime.indexOf('stopGpsTracking = function()');
  assert(start >= 0);
  const tail = runtime.slice(start, start + 900);
  assert.strictEqual(tail.includes('stopTrack('), false);
  assert(tail.includes('markGpsGap()'));
});

test('V28 GPX filters exported V2 segments to MEASURED only', () => {
  assert(runtime.includes("filter(seg => seg?.kind === 'MEASURED'"));
  assert(runtime.includes('Estimated omitted'));
});

test('BACKTRACK exposes estimated-boundary state', () => {
  assert(runtime.includes('BACKTRACK · ESTIMATED BOUNDARY'));
  assert(runtime.includes('DIRECT TO ESTIMATED ANCHOR'));
});

console.log('\nIntegration tests completed: ' + passed + ' passed, ' + failed + ' failed.');
if (failed > 0) process.exit(1);
