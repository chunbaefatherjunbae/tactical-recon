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

test('V skin keeps adaptive position and text-only bottom toolbar',()=>{
  assert(shell.includes("if(typeof root.centerGpsNow==='function')root.centerGpsNow()"));
  assert(shell.includes('id="epFollowGlyph"'));
  assert(shell.includes('<b>TEMP</b><span>임시위치</span>'));
  ['⌾','✣','≋','⌁'].forEach(icon=>assert.strictEqual(shell.includes(icon),false));
  assert(css.includes('Bottom bar: V compact field toolbar, four text-only actions'));
  assert(css.includes('.ep-bottom-nav button b{display:none!important}'));
});

test('V skin restores exact compact reticle and field scale geometry',()=>{
  assert(css.includes('background:transparent!important'));
  assert(css.includes('border:0!important'));
  assert(css.includes('width:44px!important'));
  assert(css.includes('height:44px!important'));
  assert(css.includes('width:20px!important'));
  assert(css.includes('height:20px!important'));
});

test('V skin uses V27 global control dimensions and toolbar rhythm',()=>{
  assert(css.includes('width:48px!important'));
  assert(css.includes('min-height:38px!important'));
  assert(css.includes('min-height:42px!important'));
  assert(css.includes('border-top:1px solid var(--ep-field-line-strong)!important'));
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
  assert(css.includes('body:not(.ep-surface-map) #epShell .ep-bottom-nav{display:none!important}'));
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

test('legacy SITREP stays hidden because EP flow owns the Location Card',()=>{
  assert(css.includes('body.ep-shell-ready .sitrep-panel'));
  const flowCss=fs.readFileSync('ep-ui-flow.css','utf8');
  assert(flowCss.includes('.ep-location-card{'));
  assert(flowCss.includes('border-top:3px solid var(--ep-field-active)'));
});

test('coordinate HUD copies without TAP TO COPY copywriting',()=>{
  assert(shell.includes("copyText(el('epPosCoord').textContent)"));
  assert(shell.includes("copyText(el('epTgtCoord').textContent)"));
  assert.strictEqual(shell.includes('TAP TO COPY'),false);
});

if(failed){console.error('EP UI shell failed: '+failed);process.exit(1);}
console.log('EP UI shell passed: '+passed);
