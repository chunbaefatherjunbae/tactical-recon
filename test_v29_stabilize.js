const fs=require('fs');
const assert=require('assert');

const sw=fs.readFileSync('service-worker.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const runtime=fs.readFileSync('v28-runtime.js','utf8');
const storage=fs.readFileSync('v29-storage.js','utf8');
const stabilize=fs.readFileSync('v29-stabilize.js','utf8');
const css=fs.readFileSync('v29-stabilize.css','utf8');
const mgrsSource=fs.readFileSync('vendor/mgrs-1.0.0.js','utf8');

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

test('Offline vendor dependencies are local static assets',()=>{
  assert(sw.includes("'./vendor/leaflet-1.9.4.css'"));
  assert(sw.includes("'./vendor/leaflet-1.9.4.js'"));
  assert(sw.includes("'./vendor/mgrs-1.0.0.js'"));
  assert.strictEqual(sw.includes('VENDOR_ASSETS'),false);
});

test('Index and service worker use the final V29 cache identity',()=>{
  assert(sw.includes("const CACHE_VERSION = 'v29-stabilized-20261005-2';"));
  assert(index.includes('service-worker.js?v=29-stabilized-20261005-2'));
  assert(index.includes('tactical-recon-sw-reload-v29-stabilized-20261005-2'));
});

test('Index starts without Leaflet or MGRS CDN dependencies',()=>{
  assert(index.includes('./vendor/leaflet-1.9.4.css'));
  assert(index.includes('./vendor/leaflet-1.9.4.js'));
  assert(index.includes('./vendor/mgrs-1.0.0.js'));
  assert.strictEqual(index.includes('unpkg.com/leaflet@1.9.4'),false);
  assert.strictEqual(index.includes('cdn.jsdelivr.net/npm/mgrs@1.0.0'),false);
});

test('Vendored MGRS performs WGS84 round trip',()=>{
  const holder={};
  const mgrs=new Function(mgrsSource+'\nreturn this.mgrs;').call(holder);
  assert(mgrs&&typeof mgrs.forward==='function'&&typeof mgrs.toPoint==='function');
  const encoded=mgrs.forward([127,37.5],5);
  const point=mgrs.toPoint(encoded);
  assert(/^52S/.test(encoded));
  assert(Math.abs(point[1]-37.5)<0.00002);
  assert(Math.abs(point[0]-127)<0.00002);
});

test('TRACK storage has IndexedDB safety mirror and failure event',()=>{
  assert(storage.includes("const DB_NAME='tactical_recon_v29'"));
  assert(storage.includes("createObjectStore(TRACK_STORE"));
  assert(storage.includes('mirrorTrack(track)'));
  assert(storage.includes("new CustomEvent('recon-storage-error'"));
  assert(storage.includes('getAllTracks:getAllMirroredTracks'));
});

test('TRACK persistence batches checkpoints and preserves delete semantics',()=>{
  assert(storage.includes('const FLUSH_DELAY_MS=2500'));
  assert(storage.includes('MAX_DIRTY_BEFORE_FLUSH'));
  assert(storage.includes("setTimeout(()=>flushLocalTracks('TIMER'),FLUSH_DELAY_MS)"));
  assert(storage.includes("if(isNew||sanitized.endedAt)"));
  assert(storage.includes("root.addEventListener('pagehide'"));
  assert(runtime.includes('window.v29Storage?.deleteTrack'));
  assert(storage.includes("if(!local&&String(sanitized.id)!==activeRecoveryId)return;"));
  assert(storage.includes('clearTracks:clearMirroredTracks'));
});

test('PLAN header splits objective and NAV actions and removes extra NAV button',()=>{
  assert(stabilize.includes("copy.classList.add('v29-objective-area')"));
  assert(stabilize.includes("navArea.className='v29-plan-nav-area'"));
  assert(stabilize.includes("objectiveRequired:'목표 지정 필요'"));
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

test('Picker search only moves the map before final confirmation',()=>{
  assert(stabilize.includes('function syncAddressSearchPickerMode()'));
  assert(stabilize.includes('if(save)save.hidden=active'));
  assert(stabilize.includes('if(temp)temp.hidden=active'));
  assert(stabilize.includes("active?(lang()==='ko'?'이 위치로 이동':'MOVE MAP HERE')"));
});

test('Address WGS84 and MGRS searches share one location service',()=>{
  assert(stabilize.includes('function parseLocation(query)'));
  assert(stabilize.includes('async function searchLocations(query)'));
  assert(stabilize.includes('root.v29Location={parse:parseLocation,search:searchLocations}'));
  assert(stabilize.includes('searchKoreanAddress=wrapped'));
  assert(stabilize.includes('searchRouteLocate=wrapped'));
  assert(stabilize.includes('searchPlanLocation=wrapped'));
  assert(stabilize.includes("if(!navigator.onLine)"));
});

test('Sites screen exposes backup beside local deletion',()=>{
  assert(stabilize.includes("backup.id='v29SiteBackupBtn'"));
  assert(stabilize.includes("backup.addEventListener('click',exportFullBackup)"));
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

test('LAST FIX exposes age accuracy and requires NAV confirmation',()=>{
  assert(stabilize.includes('function syncPersistentReferenceUi()'));
  assert(stabilize.includes('function installNavReferenceGuard()'));
  assert(stabilize.includes("ref?.type==='LAST_FIX'"));
  assert(stabilize.includes('if(!confirm(message))return'));
  assert(stabilize.includes("if(ref.type==='TEMP')"));
  assert(stabilize.includes('return undefined;'));
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

test('Full backup covers app data without resurrecting stale mirrored tracks',()=>{
  assert(stabilize.includes("key.startsWith('tactical_recon_')"));
  assert(stabilize.includes('trackMirror:mirror'));
  assert(stabilize.includes('root.v29Storage?.getAllTracks?.()'));
  assert(stabilize.includes('const primaryIds=new Set(Object.keys(base.storage.getV28Tracks?.()||{}))'));
  assert(stabilize.includes('mirrored.filter(track=>'));
  assert(stabilize.includes('root.v29Storage?.clearTracks'));
  assert(stabilize.includes('root.v29Storage.mirrorTrack(track)'));
});

test('Destructive site deletion recommends full backup',()=>{
  assert(index.includes('삭제 전 DATA > 전체 백업을 권장합니다.'));
  assert(stabilize.includes("backup.id='v29SiteBackupBtn'"));
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
