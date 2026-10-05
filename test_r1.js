const fs=require('fs');
const assert=require('assert');

const r1=fs.readFileSync('r1.js','utf8');
const css=fs.readFileSync('r1.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const index=fs.readFileSync('index.html','utf8');

function test(name,fn){
  try{fn();console.log('PASS',name);}
  catch(e){console.error('FAIL',name);throw e;}
}

test('R1 is the final runtime layer',()=>{
  assert(sw.includes("'./r1.css'"));
  assert(sw.includes("'./r1.js'"));
  assert(sw.includes("html.includes('r1.css')"));
  assert(sw.includes("html.includes('r1.js')"));
  assert(sw.includes("v29-stabilize\\.css"));
  assert(sw.includes("v29-stabilize\\.js"));
  assert.strictEqual(sw.includes("html.includes('v29-stabilize.css')"),false);
  assert.strictEqual(sw.includes("html.includes('v29-stabilize.js')"),false);
});

test('PWA cache identity moved to R1',()=>{
  assert(sw.includes("const CACHE_VERSION = 'r1-3-field-20261005-1';"));
  assert(index.includes('service-worker.js?v=r1-3-field-20261005-1'));
  assert(index.includes('tactical-recon-sw-reload-r1-3-field-20261005-1'));
});

test('Home bar is RECON SITES RECORDS MENU',()=>{
  assert(r1.includes('id="r1MainRecon"'));
  assert(r1.includes('id="btnWpCount"'));
  assert(r1.includes('id="r1MainRecords"'));
  assert(r1.includes('id="r1MainMenu"'));
  assert.strictEqual(r1.includes('id="v29MainPlan"'),false);
  assert(r1.includes("set('r1MainRecords',lang()==='ko'?'기록':'RECORDS')"));
});

test('Records owns tracks and saved routes entry points',()=>{
  assert(r1.includes("id='r1RecordsSheet'"));
  assert(r1.includes('id="r1RecordsTracks"'));
  assert(r1.includes('id="r1RecordsRoutes"'));
  assert(r1.includes("root.openV29FieldKit?.('tracks')"));
  assert(r1.includes('base.ui.openRoutes()'));
  assert(r1.includes("base.track.state==='RECORDING'"));
  assert(r1.includes('base.track.pause()'));
  assert(r1.includes('base.track.resume(trackSeed())'));
});

test('Unified location card owns site, recon and search results',()=>{
  assert(r1.includes("id='r1LocationCard'"));
  assert(r1.includes('function showR1LocationCard'));
  assert(r1.includes('openSitrep.__r1Location'));
  assert(r1.includes('moveToSelectedAddress.__r1Location'));
  assert(r1.includes('r1LocationObjective'));
  assert(r1.includes('data-r1-location-action="TEMP"'));
  assert(r1.includes('data-r1-location-action="VIA"'));
  assert(r1.includes('data-r1-location-action="START"'));
  assert(r1.includes('data-r1-location-action="END"'));
  assert(r1.includes('data-r1-location-action="HOME"'));
});

test('Objective selection no longer forces PLAN editor entry',()=>{
  const start=r1.indexOf('function setR1Objective()');
  const end=r1.indexOf('function saveR1Location()',start);
  const block=r1.slice(start,end);
  assert(block.includes('base.plans.setObjective'));
  assert(block.includes('base.plans.create'));
  assert(block.includes("setMissionMapMode(true,{frame:true})"));
  assert.strictEqual(block.includes('base.ui.openPlan'),false);
});

test('R1 keeps existing navigation, search and bearing engines',()=>{
  assert(r1.includes('function parseLocation(query)'));
  assert(r1.includes('async function searchLocations(query)'));
  assert(r1.includes('function installLastFix()'));
  assert(r1.includes('function installSaferTrackHud'));
  assert(r1.includes('function openLightMap()'));
  assert(r1.includes('core.geo.bearingBundle'));
});

test('R1.1 restores persisted LAST FIX as a map marker',()=>{
  assert(r1.includes('let r11LastFixMarker=null'));
  assert(r1.includes('function syncPersistentLastFixMarker()'));
  assert(r1.includes("document.querySelector('.last-gps-hitbox')"));
  assert(r1.includes("className:'r11-last-fix-hitbox'"));
  assert(r1.includes('refreshPositionState.__r11LastFixMarker'));
  assert(css.includes('.r11-last-fix-visual'));
});

test('R1.1 field view cleans the optical overlay',()=>{
  assert(css.includes('--r11-bottom-nav-h'));
  assert(css.includes('body.r11-ui .bracket'));
  assert(css.includes('body.r11-ui .reticle-container'));
  assert(css.includes('body.r11-ui:not(.target-mode) .map-scale-osd'));
  assert(css.includes('background:transparent !important'));
  assert(css.includes('body.r11-ui .telemetry-osd .osd-subgrid { display:none !important; }'));
  assert(css.includes('body.r11-ui .gps-status-osd .gps-status-row { display:none !important; }'));
  assert(r1.includes('data-r1-tab="records"'));
});

test('R1.2 reticle uses live map geometry and one center anchor',()=>{
  assert(r1.includes('function getR12OverlayBounds()'));
  assert(r1.includes('reticleX:mapRect.left+(mapRect.width/2)'));
  assert(r1.includes('reticleY:mapRect.top+(mapRect.height/2)'));
  assert(r1.includes("rootStyle.setProperty('--r12-frame-top'"));
  assert(r1.includes('installR12OverlayLayout()'));
  assert(css.includes('body.r12-ui .bracket::after'));
  assert(css.includes('content:none !important'));
  assert(css.includes('top:50% !important'));
  assert(css.includes('left:50% !important'));
  assert(css.includes('transform:translate(-50%,-50%) !important'));
  assert(css.includes('top:var(--r12-frame-top) !important'));
  assert(css.includes('top:calc(var(--r12-frame-bottom) - 21px) !important'));
});

test('R1.2 resolves LAST FIX label collision and scale placement',()=>{
  assert(r1.includes('function resolveR12LastFixLabelCollision(bounds)'));
  assert(r1.includes("visual.classList.add('r12-label-right')"));
  assert(css.includes('.r11-last-fix-visual.r12-label-above > span'));
  assert(css.includes('.r11-last-fix-visual.r12-label-right > span'));
  assert(css.includes('left:calc(var(--r12-frame-left) + 38px) !important'));
  assert(css.includes('top:calc(var(--r12-frame-bottom) - 25px) !important'));
});

test('R1.3 working-grid search accepts abbreviated MGRS safely',()=>{
  assert(r1.includes("const WORKING_GRID_KEY='tactical_recon_working_grid_v1'"));
  assert(r1.includes('function workingGridContext()'));
  assert(r1.includes('function expandMgrsQuery(query)'));
  assert(r1.includes("source:expanded.workingGridApplied?'MGRS_SHORT':'MGRS'"));
  assert(r1.includes("e?.code==='GRID_PREFIX_REQUIRED'"));
  assert(r1.includes("GRID '+ctx.prefix"));
});

test('R1.3 address results expose confidence and open location directly',()=>{
  assert(r1.includes('function requestedHouseNumber(query)'));
  assert(r1.includes('houseConfirmed=!wantedHouse||actualHouse===wantedHouse'));
  assert(r1.includes("번지 미확인 · "));
  assert(r1.includes('function activateSearchResult(item)'));
  assert(r1.includes("id:'R13-SEARCH-'"));
  assert(r1.includes("row.onclick=()=>activateSearchResult(item)"));
  assert(css.includes('#addressSearchBackdrop .promo-actions button:not(:first-child)'));
});

test('R1.3 field shell removes dead viewport space and strengthens optic UI',()=>{
  assert(css.includes('body.r13-ui #map'));
  assert(css.includes('position:fixed !important'));
  assert(css.includes('inset:0 !important'));
  assert(css.includes('body.r13-ui .bracket'));
  assert(css.includes('width:30px !important'));
  assert(css.includes('body.r13-ui .temp-marker::before'));
  assert(css.includes('linear-gradient(currentColor,currentColor) left top/7px 1px no-repeat'));
  assert(css.includes('body.r13-ui .gps-status-osd'));
  assert(css.includes('display:none !important'));
  assert(index.includes('>MGRS</div>'));
});

test('R1.3 mobile UI has dedicated map shell cards',()=>{
  assert(css.includes('.r1-map-search'));
  assert(css.includes('.r1-location-card'));
  assert(css.includes('.r1-records-sheet'));
  assert(css.includes('env(safe-area-inset-bottom)'));
  assert(css.includes('min-height:44px'));
});

console.log('R1 regression checks complete.');
