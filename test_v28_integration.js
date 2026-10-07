const fs = require('fs');
const assert = require('assert');

const sw = fs.readFileSync('service-worker.js','utf8');
const v28 = fs.readFileSync('v28.js','utf8');
const runtime = fs.readFileSync('v28-runtime.js','utf8');
const stable = fs.readFileSync('v27-stable.js','utf8');
const css = fs.readFileSync('v28.css','utf8');

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

test('PWA cache version follows EP V29 root runtime', () => {
  assert(sw.includes("const CACHE_VERSION = 'ep-v7-overlay-fix-20261007-2';"));
});

test('PWA static cache includes V28 CSS, foundation and runtime', () => {
  assert(sw.includes("'./v28.css'"));
  assert(sw.includes("'./v28.js'"));
  assert(sw.includes("'./v28-runtime.js'"));
});

test('Index loads foundation before integrated runtime', () => {
  const index = fs.readFileSync('index.html','utf8').replace(/\?v=[^"']+/g,'');
  const foundation = index.indexOf('src="./v28.js"');
  const runtimePos = index.indexOf('src="./v28-runtime.js"');
  assert(foundation >= 0);
  assert(runtimePos > foundation);
  // Root loads directly; SW injection remains only to repair old cached HTML.
  assert(sw.includes('injectStableOverlay'));
  assert(index.includes('src="./ep-runtime-bridge.js"'));
  assert(index.includes('src="./ep-ui-flow.js"'));
  assert(index.indexOf('src="./ep-runtime-bridge.js"') > runtimePos);
  assert(index.indexOf('src="./ep-ui-flow.js"') > index.indexOf('src="./ep-runtime-bridge.js"'));
});

test('V28 main navigation is PLAN / SITES / MENU', () => {
  ['계획','거점','메뉴','PLANS','SITES','MENU'].forEach(label => {
    assert(v28.includes(label), 'missing nav label ' + label);
  });
  assert.strictEqual(v28.includes('id="v28ObjectiveBtn"'), false);
});

test('PLAN toolbar uses explicit NAV and keeps termination last', () => {
  assert.strictEqual(v28.includes("objectiveButton.id = 'v28PlanObjectiveBtn'"), false);
  assert(v28.includes("navButton.id = 'v28PlanNavBtn'"));
  assert(v28.includes("exitButton.id = 'planExitBtn'"));
  assert(runtime.includes("document.getElementById('planExitBtn')"));
  assert.strictEqual(runtime.includes("textContent.trim() === 'EXIT'"), false);
  assert(css.includes('#planSetBtn { order:1; }'));
  assert(css.includes('#v28PlanTrackBtn { order:4; }'));
  assert(css.includes('#v28PlanNavBtn { order:5; }'));
  assert(css.includes('#planExitBtn { order:6; }'));
});

test('Objective flow is explicit from plan header', () => {
  assert(v28.includes('거점에서 선택'));
  assert(v28.includes('조준점 지정'));
  assert(v28.includes("planHead.removeAttribute('onclick')"));
  assert(v28.includes('openObjectiveSheet();'));
  assert(v28.includes("tV28('탭하여 목표 변경', 'TAP TO CHANGE OBJECTIVE')"));
  assert(v28.includes("tV28('탭하여 목표 설정', 'TAP TO SET OBJECTIVE')"));
});

test('Track UI has Korean labels', () => {
  ['궤적 기록','기록 시작','일시정지','재개','기록 종료','전체 궤적'].forEach(label => {
    assert(runtime.includes(label), 'missing track label ' + label);
  });
});

test('NAV keeps position search and HUD track is direct toggle', () => {
  assert(runtime.includes("set('navSearchBtn', '위치검색', 'LOCATE')"));
  assert(runtime.includes("set('targetTrackRecBtn', '궤적 관리', 'TRACK MANAGE')"));
  assert(runtime.includes('function toggleHudTrack()'));
  assert(runtime.includes("if (session.state === 'OFF') startBrowserTrack();"));
  assert(runtime.includes("else if (session.state === 'PAUSED') resumeBrowserTrack();"));
  assert(runtime.includes('else pauseTrack();'));
  const toggleStart=runtime.indexOf('function toggleHudTrack()');
  const toggleEnd=runtime.indexOf('function openTrackSheet()',toggleStart);
  assert.strictEqual(runtime.slice(toggleStart,toggleEnd).includes('stopTrack()'),false);
  assert(runtime.includes('toggleHudTrack();'));
  assert(runtime.includes("hud.setAttribute('aria-pressed', String(isOn))"));
});

test('V28 owns plan header name and availability', () => {
  assert(v28.includes("['targetModeName','planNavHint']"));
  assert(v28.includes("trigger.dataset.v28TextOwner = '1'"));
  assert(v28.includes("kicker.textContent = tV28('계획 · ', 'PLAN · ') + plan.name"));
  assert(v28.includes("name.textContent = hasObjective"));
  assert(stable.includes("modeName && !document.body?.classList.contains('v28-integrated')"));
  assert(stable.includes("if (!document.body?.classList.contains('v28-integrated'))"));
});

test('V27 language layer cannot rewrite V28-owned NAV text', () => {
  assert(stable.includes("el.dataset.v28TextOwner === '1' || el.dataset.v29TextOwner === '1'"));
  assert(stable.includes("search && !document.body?.classList.contains('v28-integrated')"));
  assert(stable.includes("trackButton && !document.body?.classList.contains('v28-integrated')"));
  assert(stable.includes("navTrack && !document.body?.classList.contains('v28-integrated')"));
  assert(runtime.includes("['navSearchBtn','targetTrackRecBtn','navHudTrack']"));
});

test('Mobile toolbar typography stays readable', () => {
  assert(css.includes('font-size:8.5px;'));
  assert(css.includes('font-size:9px;'));
  assert(css.includes('font-size:10px;'));
});

test('Verified local sites support edit and revert', () => {
  assert(v28.includes('openSecuredSiteEditor'));
  assert(v28.includes('revertSecuredSite'));
  assert(v28.includes("status:'UNEXPLORED'"));
  assert(v28.includes("delete next.securedAt"));
  assert(v28.includes("preSecureOpCode"));
  assert(v28.includes('이름과 메모는 유지됩니다.'));
});

test('Site edits keep PLAN objective snapshots aligned', () => {
  assert(v28.includes('function syncPlanObjectiveSnapshotsForSite(site)'));
  assert(v28.includes("objectiveSiteId !== String(site.id)"));
  assert(v28.includes('syncPlanObjectiveSnapshotsForSite(next);'));
});

test('PLAN header shows objective while kicker shows plan name', () => {
  assert(v28.includes("kicker.textContent = tV28('계획 · ', 'PLAN · ') + plan.name"));
  assert(v28.includes("name.textContent = hasObjective"));
  assert(v28.includes("plan.objective.name"));
  assert(v28.includes("tV28('목표 미지정', 'OBJECTIVE NOT SET')"));
  assert(v28.includes("planHead.removeAttribute('onclick')"));
  assert(v28.includes("navButton.id = 'v28PlanNavBtn'"));
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
