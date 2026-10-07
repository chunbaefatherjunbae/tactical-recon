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
  assert(css.includes('.ep-bottom-nav{'));
  assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))!important'));
  assert(css.includes('.ep-bottom-nav button b{display:none!important}'));
});

test('search and operation menu match GPS control dimensions and GPS has no redundant status label',()=>{
  assert(css.includes('grid-template-columns:48px!important'));
  assert(css.includes('width:48px!important;height:38px!important'));
  assert(css.includes('width:48px!important;min-height:38px!important;height:38px!important'));
  assert.strictEqual(shell.includes('id="epGpsState"'),false);
  assert.strictEqual(shell.includes("el('epGpsState')"),false);
});

test('V skin restores final V29 reticle geometry and scale',()=>{
  assert(css.includes('width:112px!important'));
  assert(css.includes('height:112px!important'));
  assert(css.includes('width:40px!important'));
  assert(css.includes('height:40px!important'));
  assert(css.includes('width:8px!important'));
  assert(css.includes('height:8px!important'));
  assert(css.includes('background:transparent!important'));
});

test('DISPLAY modes resolve EP HUD colors on body instead of root snapshot',()=>{
  assert(css.includes('body{'));
  assert(css.includes('--ep-field-osd:var(--field-panel'));
  assert(css.includes('--ep-field-active:var(--field-active'));
  const rootBlock=css.slice(css.indexOf(':root{'),css.indexOf('body{'));
  assert.strictEqual(rootBlock.includes('--ep-field-active'),false);
});

test('corner frame matches reticle visibility and uses active HUD color',()=>{
  assert(css.includes('border-color:var(--ep-field-active)!important;opacity:.92!important'));
  assert(css.includes('drop-shadow(0 0 2px color-mix(in srgb,var(--ep-field-active) 34%,transparent))'));
  assert(css.includes('background:var(--ep-field-active)!important;opacity:.76!important'));
  assert(css.includes('left:18px!important'));
  assert(css.includes('right:18px!important'));
});

test('V final corner frame uses 34px brackets and 70px extensions',()=>{
  assert(css.includes('width:34px!important;height:34px!important'));
  assert(css.includes('bottom:calc(var(--ep-toolbar-h) + 16px)!important'));
  assert(css.includes('width:70px!important;height:1px!important'));
});

test('V skin uses V27 global control dimensions and toolbar rhythm',()=>{
  assert(css.includes('width:48px!important'));
  assert(css.includes('min-height:38px!important'));
  assert(css.includes('min-height:42px!important'));
  assert(css.includes('border-top:1px solid var(--ep-field-line-strong)!important'));
});

test('EP shell exposes required map-first controls without duplicate bottom tools',()=>{
  ['epPosReadout','epTgtReadout','epGpsBtn','epFollowBtn','epTempBtn','epTrackBtn','epPointsBtn','epRandomBtn','epRecordsBtn'].forEach(id=>{
    assert(shell.includes("id=\""+id+"\""));
  });
  assert.strictEqual(shell.includes('id="epToolsBtn"'),false);
});

test('MAP shell hides legacy HUD stack but preserves legacy DOM',()=>{
  assert(css.includes('body.ep-shell-ready .top-compass-bar'));
  assert(css.includes('body.ep-shell-ready .telemetry-osd'));
  assert(css.includes('body.ep-shell-ready .gps-status-osd'));
  assert(css.includes('body.ep-shell-ready .mfd-bottom-bar'));
  assert(index.includes('id="gpsStatusOsd"'));
  assert(index.includes('class="mfd-bottom-bar"'));
});

test('bottom navigation is map-only and three-function because top menu owns tools',()=>{
  assert(css.includes('body:not(.ep-surface-map) #epShell .ep-bottom-nav{display:none!important}'));
  assert(shell.includes('<span>거점</span>'));
  assert(shell.includes('<span>무작위</span>'));
  assert(shell.includes('<span>기록</span>'));
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

test('coordinate HUD is frameless and uses text-level guidance only',()=>{
  assert(css.includes('background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important'));
  assert(css.includes('.ep-coordinate .ep-label::after'));
  assert(css.includes('width:18px!important;height:1px!important'));
  const hudStart=css.indexOf('.ep-top-hud{');
  const coordStart=css.indexOf('.ep-coordinate{',hudStart);
  const hudBlock=css.slice(hudStart,coordStart);
  assert.strictEqual(hudBlock.includes('var(--ep-field-osd)'),false);
  assert.strictEqual(hudBlock.includes('border-left'),false);
});

test('coordinate HUD copies without TAP TO COPY copywriting',()=>{
  assert(shell.includes("copyText(el('epPosCoord').textContent)"));
  assert(shell.includes("copyText(el('epTgtCoord').textContent)"));
  assert.strictEqual(shell.includes('TAP TO COPY'),false);
});

if(failed){console.error('EP UI shell failed: '+failed);process.exit(1);}
console.log('EP UI shell passed: '+passed);
