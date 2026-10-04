const fs=require('fs');
const assert=require('assert');

const sw=fs.readFileSync('service-worker.js','utf8');
const storage=fs.readFileSync('v29-storage.js','utf8');
const stabilize=fs.readFileSync('v29-stabilize.js','utf8');
const css=fs.readFileSync('v29-stabilize.css','utf8');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('Service worker loads stabilization after V29 UI',()=>{
  ["'./v29-storage.js'","'./v29-stabilize.css'","'./v29-stabilize.js'"].forEach(x=>assert(sw.includes(x)));
  assert(sw.indexOf("html.includes('v29-storage.js')")<sw.indexOf("html.includes('v28-runtime.js')"));
  assert(sw.indexOf("html.includes('v29-stabilize.js')")>sw.indexOf("html.includes('v29-ui.js')"));
});

test('Offline vendor dependencies are explicitly precached',()=>{
  assert(sw.includes('const VENDOR_ASSETS'));
  assert(sw.includes('leaflet@1.9.4/dist/leaflet.css'));
  assert(sw.includes('leaflet@1.9.4/dist/leaflet.js'));
  assert(sw.includes('mgrs@1.0.0/dist/mgrs.min.js'));
  assert(sw.includes('cacheVendorAssets()'));
  assert(sw.includes('VENDOR_ASSETS.includes(url.href)'));
});

test('TRACK storage has IndexedDB safety mirror and failure event',()=>{
  assert(storage.includes("const DB_NAME='tactical_recon_v29'"));
  assert(storage.includes("createObjectStore(TRACK_STORE"));
  assert(storage.includes('mirrorTrack(track)'));
  assert(storage.includes("new CustomEvent('recon-storage-error'"));
  assert(storage.includes('getAllTracks:getAllMirroredTracks'));
});

test('PLAN header splits objective and NAV actions and removes extra NAV button',()=>{
  assert(stabilize.includes("copy.classList.add('v29-objective-area')"));
  assert(stabilize.includes("navArea.className='v29-plan-nav-area'"));
  assert(stabilize.includes('base.ui.openObjective();'));
  assert(stabilize.includes("if(typeof startTargetNavigation==='function')startTargetNavigation();"));
  assert(stabilize.includes("document.getElementById('v28PlanNavBtn')?.remove()"));
  assert(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
});

test('Objective reticle and site creation share map location picker',()=>{
  assert(stabilize.includes("openPicker('OBJECTIVE','PLAN')"));
  assert(stabilize.includes("openPicker('SITE','SITES')"));
  assert(stabilize.includes("id='v29LocationPicker'"));
  assert(stabilize.includes("base.plans.setObjective(plan.id"));
  assert(stabilize.includes("if(typeof openPointPlacement==='function')openPointPlacement()"));
});

test('Site filters separate status from source',()=>{
  assert(stabilize.includes("siteStatusFilter='ALL'"));
  assert(stabilize.includes("siteSourceFilter='ALL'"));
  assert(stabilize.includes('data-v29-status'));
  assert(stabilize.includes('data-v29-source'));
  assert(stabilize.includes("REGISTERED:(siteSourceFilter!=='LOCAL'&&siteStatusFilter==='ALL')"));
});

test('Task menu exposes bearing as first-class function',()=>{
  assert(stabilize.includes("data-v29-menu=\"bearing\""));
  assert(stabilize.includes("makeSection('control-bearing','BEARING'"));
  assert(stabilize.includes("t('bearing')"));
});

test('Bearing sensor is opt-in and shuts down on exit/background',()=>{
  assert(stabilize.includes('async function startBearingSensor()'));
  assert(stabilize.includes('DeviceOrientationEvent.requestPermission'));
  assert(stabilize.includes("window.addEventListener('deviceorientationabsolute'"));
  assert(stabilize.includes('function stopBearingSensor()'));
  assert(stabilize.includes("if(section!=='bearing')stopBearingSensor()"));
  assert(stabilize.includes("if(document.hidden){stopBearingSensor();persistNavRecovery();}"));
  assert.strictEqual(/startBearingSensor\(\);/.test(stabilize.slice(stabilize.indexOf('function install(){'))),false);
});

test('LAST FIX persists and is fallback only when normal reference is absent',()=>{
  assert(stabilize.includes("const LAST_FIX_KEY='tactical_recon_last_fix_v1'"));
  assert(stabilize.includes('persistLastFix(pos)'));
  assert(stabilize.includes("if(ref?.coords&&validCoords(ref.coords))return ref;"));
  assert(stabilize.includes('return persistentLastFix();'));
});

test('NAV recovery never explicitly starts GPS or bearing sensor',()=>{
  const start=stabilize.indexOf('function showNavRecovery');
  const end=stabilize.indexOf('/* ---------- backup / restore ---------- */');
  const block=stabilize.slice(start,end);
  assert(block.includes("targetModePhase='NAV'"));
  assert(block.includes("gpsFollowEnabled=false"));
  assert.strictEqual(block.includes('startGpsTracking('),false);
  assert.strictEqual(block.includes('startBearingSensor('),false);
});

test('Track HUD is start pause resume while STOP remains management action',()=>{
  const trackStart=stabilize.indexOf('function installSaferTrackHud');
  const trackEnd=stabilize.indexOf('/* ---------- NAV recovery',trackStart);
  const block=stabilize.slice(trackStart,trackEnd);
  assert(block.includes("base.track.state==='OFF'"));
  assert(block.includes("base.track.state==='RECORDING'"));
  assert(block.includes('base.track.pause()'));
  assert(block.includes('base.track.resume(trackSeed())'));
  assert.strictEqual(block.includes('base.track.stop()'),false);
});

test('Full backup covers app localStorage and IndexedDB mirror',()=>{
  assert(stabilize.includes("key.startsWith('tactical_recon_')"));
  assert(stabilize.includes('trackMirror:mirror'));
  assert(stabilize.includes('root.v29Storage?.getAllTracks?.()'));
  assert(stabilize.includes('root.v29Storage.mirrorTrack(track)'));
});

test('Free track flow can start without opening PLAN editor',()=>{
  const freeStart=stabilize.indexOf('function toggleFreeTrack');
  const block=stabilize.slice(freeStart,freeStart+1200);
  assert(block.includes('ensureFreePlan()'));
  assert(block.includes('base.state.activePlanId=plan.id'));
  assert(block.includes('base.track.start(plan.id,trackSeed())'));
  assert.strictEqual(block.includes('base.ui.openPlan'),false);
});

test('Mobile controls use field-readable sizes',()=>{
  assert(css.includes('min-height:46px'));
  assert(css.includes('font-size:11.5px'));
  assert(css.includes('.wp-filter-btn'));
  assert(css.includes('min-height:44px'));
  assert(css.includes('--field-dim-readable'));
});

console.log('\nV29 stabilization tests completed: '+passed+' passed, '+failed+' failed.');
if(failed>0)process.exit(1);
