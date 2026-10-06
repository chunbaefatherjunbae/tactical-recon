const fs=require('fs');
const assert=require('assert');

const r1=fs.readFileSync('r1.js','utf8');
const r2=fs.readFileSync('r2.js','utf8');
const css=fs.readFileSync('r2.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');

function test(name,fn){
  try{fn();console.log('PASS',name);}
  catch(e){console.error('FAIL',name);throw e;}
}

test('R2 is the final runtime layer above R1',()=>{
  assert(sw.includes("'./r1.css'"));
  assert(sw.includes("'./r1.js'"));
  assert(sw.includes("'./r2.css'"));
  assert(sw.includes("'./r2.js'"));
  assert(sw.indexOf("html.includes('r2.css')")>sw.indexOf("html.includes('r1.css')"));
  assert(sw.indexOf("html.includes('r2.js')")>sw.indexOf("html.includes('r1.js')"));
});

test('R2.2 uses a new cache identity',()=>{
  assert(sw.includes("const CACHE_VERSION = 'r2-2-gev-hud-20261006-1';"));
  assert(index.includes('service-worker.js?v=r2-2-gev-hud-20261006-1'));
  assert(index.includes('tactical-recon-sw-reload-r2-2-gev-hud-20261006-1'));
});

test('R2 location display preferences separate primary, visibility and order',()=>{
  assert(r2.includes("tactical_recon_location_display_v2"));
  assert(r2.includes("primary:'MGRS'"));
  assert(r2.includes("visible:['MGRS','WGS84','ADDRESS']"));
  assert(r2.includes("order:['MGRS','WGS84','ADDRESS']"));
  assert(r2.includes('function normalizeDisplay'));
  assert(r2.includes('if(!visible.includes(primary))visible.push(primary)'));
});

test('R2 adds position display controls under POSITION',()=>{
  assert(r2.includes("document.querySelector('#control-position .field-control-grid')"));
  assert(r2.includes("id='r2PositionDisplayBtn'")||r2.includes("btn.id='r2PositionDisplayBtn'"));
  assert(r2.includes("POSITION DISPLAY"));
  assert(r2.includes('r2PrimarySelect'));
  assert(r2.includes('r2FormatRows'));
  assert(css.includes('.r2-format-moves button'));
  assert(css.includes('width:44px'));
});

test('Map selection is separate from the legacy active target until objective action',()=>{
  assert(r1.includes("function showR1LocationCard(target,statusType='LOCATION',options={})"));
  assert(r1.includes("const activateLegacyTarget=options?.activateLegacyTarget===true"));
  assert(r1.includes("card.dataset.ownsLegacyTarget=activateLegacyTarget?'1':'0'"));
  assert(r2.includes("root.r1.openLocation(target,'LOCATION',{activateLegacyTarget:false})"));
  assert(r1.includes("getLocationTarget:()=>r1LocationTarget"));
  assert(r2.indexOf("const selected=root.r1?.getLocationTarget?.()")<r2.indexOf("if(r2CardTarget&&validCoords(r2CardTarget.coords))return r2CardTarget"));
  assert(r2.indexOf("if(r2CardTarget&&validCoords(r2CardTarget.coords))return r2CardTarget")<r2.indexOf("if(typeof currentActiveTarget!=='undefined'"));
});

test('Permanent map HUD is surface-free and safe-area aligned',()=>{
  assert(css.includes('Permanent HUD has no card surface'));
  assert(css.includes('background:transparent !important'));
  assert(css.includes('body.r2-runtime .gps-status-osd'));
  assert(css.includes('display:none !important'));
  assert(css.includes('--r2-top-control-y:calc(env(safe-area-inset-top,0px) + 38px)'));
  assert(css.includes('body.r2-runtime .global-gps-controls'));
});

test('POINT detail uses one parent surface with divider rows',()=>{
  assert(css.includes('.r2-location-format'));
  assert(css.includes('border:0;'));
  assert(css.includes('border-bottom:1px solid var(--field-line,var(--border))'));
  assert(css.includes('box-shadow:inset 2px 0 var(--r2-state-active)'));
  assert(r2.includes('COPY ALL POSITION DATA'));
});

test('Reticle has quiet and active input states',()=>{
  assert(css.includes('Two-stage reticle'));
  assert(css.includes('body.r2-runtime .reticle-container'));
  assert(css.includes('width:52px !important'));
  assert(css.includes('body.r2-runtime.v29-picking-location .reticle-container'));
  assert(css.includes('width:94px !important'));
});

test('Address HUD requests are debounced, abortable and card requests are deduplicated',()=>{
  assert(r2.includes('const addressInFlight=new Map()'));
  assert(r2.includes("e&&e.name==='AbortError'"));
  assert(r2.includes('function scheduleHudAddressResolve'));
  assert(r2.includes('new AbortController()'));
  assert(r2.includes('},220);'));
  assert(r2.includes('addressInFlight.has(key)'));
});

test('Low-data viewport refresh does not restyle the full GeoJSON on every move',()=>{
  assert(r1.includes('let lightMapRefreshTimer=null'));
  const hook=r1.slice(r1.indexOf('function installLowDataRefreshHooks()'),r1.indexOf('function suppressLightMapNetworkTiles()'));
  assert(hook.includes('refreshLowDataPlaces()'));
  assert.strictEqual(hook.includes('refreshLowDataBaseStyle()'),false);
  assert(hook.includes('},48);'));
  assert(r1.includes("if(map?.hasLayer?.(layer))map.removeLayer(layer)"));
  assert(css.includes('body.r2-runtime.r16-light-map .leaflet-tile-pane'));
  assert(css.includes('display:none !important'));
});

test('Low-data grid and place overlays are swapped instead of cleared live',()=>{
  assert(r1.includes('const previous=lightMapGridLayer'));
  assert(r1.includes('lightMapGridLayer=nextLayer'));
  assert(r1.includes('const previous=lightMapPlaceLayer'));
  assert(r1.includes('lightMapPlaceLayer=nextLayer'));
});

test('Network status is named NET and exposes truthful online/offline state styling',()=>{
  assert(index.includes('<span>NET <b id="hudLinkState"'));
  assert(index.includes("el.dataset.state = online ? 'online' : 'offline'"));
  assert(css.includes('#hudLinkState[data-state="offline"]'));
});

test('R2.2 identifies itself as the new baseline',()=>{
  assert(r2.includes("VERSION='2.2'"));
  assert(r2.includes("document.title='TACTICAL RECON // R2.2 FIELD TERMINAL'"));
  assert(index.includes('<title>TACTICAL RECON // R2.2 FIELD TERMINAL</title>'));
  assert(r2.includes("document.body.classList.add('r2-runtime')"));
});

test('R2.2 keeps military coordinate telemetry visible in the HUD',()=>{
  assert(r2.includes('function ensureR22Hud'));
  assert(r2.includes("head.textContent='RETICLE'"));
  assert(r2.includes("id='r22MgrsSecondary'")||r2.includes("secondary.id='r22MgrsSecondary'"));
  assert(r2.includes("secondary.hidden=settings.primary==='MGRS'||!mgrs"));
  assert(css.includes('Reticle coordinate block stays visible at all times'));
  assert(css.includes('font:900 12.5px/1.15 var(--font-mono)'));
});

test('R2.2 command strip uses matched compact hardware controls',()=>{
  assert(r2.includes("search.dataset.r22Decorated='1'"));
  assert(r2.includes("meta.textContent='MGRS · ADDR'"));
  assert(css.includes('--r22-command-h:48px'));
  assert(css.includes('right:184px !important'));
  assert(css.includes('grid-template-columns:repeat(3,48px) !important'));
  assert(css.includes('height:48px !important'));
  assert(css.includes('grid-template-columns:repeat(3,44px) !important'));
});

test('R2.2 restores a strong always-visible reticle and screen frame',()=>{
  assert(css.includes('The reticle is a measuring instrument, not decoration'));
  assert(css.includes('width:96px !important'));
  assert(css.includes('opacity:1 !important'));
  assert(css.includes('body.r2-runtime .target-gate::before'));
  assert(css.includes('body.r2-runtime .bracket'));
  assert(css.includes('width:40px !important'));
  assert(css.includes('opacity:.82 !important'));
});

test('R2.2 panel surfaces share one accent-derived visual language',()=>{
  assert(css.includes('--r22-surface:'));
  assert(css.includes('--r22-line-soft:'));
  assert(css.includes('One visual language for actual interactive surfaces'));
  assert(css.includes('body.r2-runtime .r1-location-card'));
  assert(css.includes('body.r2-runtime .r1-records-sheet'));
  assert(css.includes('body.r2-runtime .field-control-tray'));
  assert(css.includes('body.r2-runtime .target-mode-panel'));
  assert(css.includes('body.r2-runtime .r2-display-shell'));
});

test('R2.2 adds GPS state to the equipment telemetry row',()=>{
  assert(r2.includes("item.id='r22GpsHud'"));
  assert(r2.includes('function syncR22GpsHud'));
  assert(r2.includes("value.dataset.state=on?(raw.includes('NO FIX')?'search':'on'):'off'"));
  assert(css.includes('#r22GpsHudValue[data-state="off"]'));
});

test('Pages validation includes R2 checks',()=>{
  assert(workflow.includes('node --check r2.js'));
  assert(workflow.includes('node --check test_r2.js'));
  assert(workflow.includes('node test_r2.js'));
});

console.log('R2.2 regression checks complete.');
