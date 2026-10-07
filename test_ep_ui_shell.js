const fs=require('fs');
const assert=require('assert');

const css=fs.readFileSync('ep-ui.css','utf8');
const shell=fs.readFileSync('ep-ui-shell.js','utf8');
const index=fs.readFileSync('index.html','utf8');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('runtime loads in deterministic legacy-to-EP order',()=>{
  const order=[
    './v27-stable.js',
    './v28.js',
    './v29-storage.js',
    './v28-runtime.js',
    './v29.js',
    './v29-ui.js',
    './v29-stabilize.js',
    './ep-core/location-core.js',
    './ep-core/plan-core.js',
    './ep-core/mission-core.js',
    './ep-runtime-bridge.js',
    './ep-plan-bridge.js',
    './ep-mission-bridge.js',
    './ep-surface-bridge.js',
    './ep-overlay-bridge.js',
    './ep-ui-shell.js'
  ].map(src=>index.indexOf('src="'+src+'"'));
  order.forEach(pos=>assert(pos>=0));
  for(let i=1;i<order.length;i++)assert(order[i]>order[i-1]);
});

test('service worker keeps EP shell as old-cache fallback',()=>{
  const sw=fs.readFileSync('service-worker.js','utf8');
  assert(sw.includes("'./ep-ui.css'"));
  assert(sw.includes("'./ep-ui-shell.js'"));
  assert(sw.includes("html.includes('ep-ui-shell.js')"));
});

test('EP shell exposes required map-first controls',()=>{
  ['epPosReadout','epTgtReadout','epGpsBtn','epFollowBtn','epTempBtn','epTrackBtn','epPointsBtn','epRandomBtn','epRecordsBtn','epToolsBtn'].forEach(id=>{
    assert(shell.includes("id=\""+id+"\""));
  });
});

test('MAP shell hides legacy HUD stack but preserves legacy DOM',()=>{
  assert(css.includes('body.ep-shell-ready .top-compass-bar'));
  assert(css.includes('body.ep-shell-ready .telemetry-osd'));
  assert(css.includes('body.ep-shell-ready .gps-status-osd'));
  assert(css.includes('body.ep-shell-ready .mfd-bottom-bar'));
  assert(index.includes('id="gpsStatusOsd"'));
  assert(index.includes('class="mfd-bottom-bar"'));
});

test('bottom navigation is map-only and four-function',()=>{
  assert(css.includes('body:not(.ep-surface-map) #epShell .ep-bottom-nav{display:none}'));
  assert(shell.includes('<span>거점</span>'));
  assert(shell.includes('<span>무작위</span>'));
  assert(shell.includes('<span>기록</span>'));
  assert(shell.includes('<span>도구</span>'));
});

test('TRACK short and long press use V28 TrackV2 state',()=>{
  assert(shell.includes("root.v28?.track"));
  assert(shell.includes("api.state==='RECORDING'"));
  assert(shell.includes("api.state==='PAUSED'"));
  assert(shell.includes('trackLongTimer=setTimeout'));
  assert(shell.includes('stopTrack();'));
});

test('existing SITREP is transitional Location Card',()=>{
  assert(css.includes('body.ep-shell-ready.ep-overlay-location .sitrep-panel'));
});

test('coordinate HUD copies without TAP TO COPY copywriting',()=>{
  assert(shell.includes("copyText(el('epPosCoord').textContent)"));
  assert(shell.includes("copyText(el('epTgtCoord').textContent)"));
  assert.strictEqual(shell.includes('TAP TO COPY'),false);
});

if(failed){console.error('EP UI shell failed: '+failed);process.exit(1);}
console.log('EP UI shell passed: '+passed);
