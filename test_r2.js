const fs=require('fs');
const assert=require('assert');

const r1=fs.readFileSync('r1.js','utf8');
const r2=fs.readFileSync('r2.js','utf8');
const css=fs.readFileSync('r2.css','utf8');
const baseCss=fs.readFileSync('app-base.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const base=fs.readFileSync('app-base.js','utf8');
const locationCore=fs.readFileSync('location-core.js','utf8');
const topoBuilder=fs.readFileSync('scripts/build_lowdata_topo.py','utf8');
const lowDataWorkflow=fs.readFileSync('.github/workflows/build-lowdata-basemap.yml','utf8');
const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');

function test(name,fn){
  try{fn();console.log('PASS',name);}
  catch(e){console.error('FAIL',name);throw e;}
}

test('R2 remains the final explicit runtime layer',()=>{
  assert(index.indexOf('href="./r2.css"')>index.indexOf('href="./r1.css"'));
  assert(index.indexOf('src="./r2.js"')>index.indexOf('src="./r1.js"'));
  assert(index.indexOf('src="./location-core.js"')<index.indexOf('src="./app-base.js"'));
  assert(sw.includes("'./r1.css'"));
  assert(sw.includes("'./r2.css'"));
  assert.strictEqual(sw.includes('injectStableOverlay'),false);
});

test('R2.3.1 has a fresh PWA identity',()=>{
  assert(sw.includes("const CACHE_VERSION = 'r2-3-1-field-polish-topo-20261006-1';"));
  assert(base.includes('service-worker.js?v=r2-3-1-field-polish-topo-20261006-1'));
  assert(base.includes('tactical-recon-sw-reload-r2-3-1-field-polish-topo-20261006-1'));
  assert(sw.includes("'./location-core.js'"));
});

test('R2.3.1 identifies itself as the current baseline',()=>{
  assert(r2.includes("VERSION='2.3.1'"));
  assert(r2.includes("document.title='TACTICAL RECON // R2.3.1 FIELD TERMINAL'"));
  assert(index.includes('<title>TACTICAL RECON // R2.3.1 FIELD TERMINAL</title>'));
  assert(r2.includes("document.body.classList.add('r2-runtime','r23-ui')"));
});

test('Map selection remains separate from actual objective state',()=>{
  assert(r1.includes("function showR1LocationCard(target,statusType='LOCATION',options={})"));
  assert(r1.includes("const activateLegacyTarget=options?.activateLegacyTarget===true"));
  assert(r2.includes("root.r1.openLocation(target,'LOCATION',{activateLegacyTarget:false})"));
  assert(r1.includes("getLocationTarget:()=>r1LocationTarget"));
});

test('Theme colors still derive from the active field theme',()=>{
  assert(css.includes('--r23-accent:var(--field-active,var(--accent))'));
  assert(css.includes('--r23-text:var(--field-text,var(--text-main))'));
  assert(css.includes('--r23-line-strong:var(--field-line-strong,var(--border-accent))'));
  assert(css.includes('--r23-panel:var(--field-panel-solid,var(--bg-panel))'));
  assert(css.includes('--r23-glow:var(--accent-glow)'));
  for(const fixedCyan of ['#00d4ff','#a9ddf5','#38bdf8','#0ea5e9']) {
    assert.strictEqual(css.toLowerCase().includes(fixedCyan),false);
  }
});

test('Viewport uses only strong corner optics at the established frame coordinates',()=>{
  assert(css.includes('body.r2-runtime .viewfinder-frame'));
  assert(css.includes('top:var(--r23-frame-top) !important'));
  assert(css.includes('bottom:var(--r23-frame-bottom) !important'));
  assert(css.includes('border:0 !important'));
  assert(css.includes('body.r2-runtime .viewfinder-frame::before'));
  assert(css.includes('content:none !important'));
  assert(css.includes('body.r2-runtime .bracket.tl{top:-1px !important'));
  assert(css.includes('body.r2-runtime .bracket.br{bottom:-1px !important'));
  assert(css.includes('opacity:1 !important'));
  assert(css.includes('border-color:var(--r23-accent) !important'));
});

test('Reference HUD no longer changes label and width when a target becomes active',()=>{
  assert(base.includes("if (hudLabel) hudLabel.innerText = 'REF';"));
  assert(base.includes("if (hudEl) hudEl.innerText = refShort;"));
  assert.strictEqual(base.includes("if (hudLabel) hudLabel.innerText = 'BRG';"),false);
  assert(css.includes('min-width:68px !important'));
});

test('LAST FIX map label never flips around the reticle',()=>{
  const start=r1.indexOf('function resolveR12LastFixLabelCollision(bounds)');
  const end=r1.indexOf('function syncR12OverlayLayout()',start);
  const block=r1.slice(start,end);
  assert(block.includes("visual.classList.remove('r12-label-above','r12-label-right')"));
  assert.strictEqual(block.includes('Math.hypot'),false);
  assert.strictEqual(block.includes("classList.add('r12-label"),false);
});

test('Military coordinate HUD remains permanent and visually primary',()=>{
  assert(r2.includes('function ensureR22Hud'));
  assert(r2.includes("head.textContent='RETICLE'"));
  assert(r2.includes("secondary.id='r22MgrsSecondary'"));
  assert(css.includes("GOD'S EYE-style readout hierarchy"));
  assert(css.includes('font:900 14px/1.12 var(--font-mono) !important'));
  assert(css.includes('body.r2-runtime .telemetry-osd .osd-subgrid'));
});

test('GPS recenter and TEMP remain a vertical right-hand rail',()=>{
  assert(r2.includes('function ensureR23TempButton'));
  assert(r2.includes("btn.id='tempQuickBtn'"));
  assert(css.includes('body.r2-runtime .global-gps-controls'));
  assert(css.includes('flex-direction:column !important'));
  assert(css.includes('--r23-control-size:48px'));
  assert(css.includes('body.r2-runtime #tempQuickBtn'));
  assert.strictEqual(css.includes('grid-template-columns:repeat(3,48px)'),false);
});

test('Reticle stays strong, square and centered',()=>{
  assert(css.includes('Reticle is a primary measuring instrument'));
  assert(css.includes('width:104px !important'));
  assert(css.includes('height:104px !important'));
  assert(css.includes('top:50dvh !important'));
  assert(css.includes('left:50vw !important'));
  assert(css.includes('width:38px !important'));
  assert.strictEqual(css.includes('width:144px !important'),false);
});

test('Location detail close control belongs to a sticky header',()=>{
  assert(r1.includes('r1-location-head-copy'));
  assert(r1.includes('<button class="r1-location-close" type="button" aria-label="Close">×</button></div>'));
  assert(css.includes('position:sticky !important'));
  assert(css.includes('body.r2-runtime .r1-location-close'));
  assert(css.includes('position:static !important'));
  assert(css.includes('flex:0 0 44px !important'));
});

test('Mission context close and FIT controls cannot overlap',()=>{
  assert(r1.includes("fit.textContent=lang()==='ko'?'전체보기':'FIT'"));
  assert(css.includes('grid-template-areas:'));
  assert(css.includes('"info close"'));
  assert(css.includes('"actions actions"'));
  assert(css.includes('body.r2-runtime .v29-mission-map-close'));
  assert(css.includes('grid-area:close !important'));
  assert(css.includes('body.r2-runtime .v29-mission-map-actions'));
  assert(css.includes('grid-area:actions !important'));
});

test('Target mode uses the proven compact fixed toolbar instead of the R2.3 giant panel toolbar',()=>{
  assert(baseCss.includes('.target-mode-actions.v271-mode-toolbar'));
  assert(baseCss.includes('position:fixed;'));
  assert(baseCss.includes('bottom:0;'));
  assert.strictEqual(css.includes('body.r2-runtime.target-mode .mfd-bottom-bar'),false);
  assert.strictEqual(css.includes('body.r2-runtime.target-nav .mfd-bottom-bar'),false);
  assert.strictEqual(css.includes('body.r2-runtime .target-mode-actions,\nbody.r2-runtime .target-mode-actions.v271-mode-toolbar'),false);
});

test('Panel surfaces keep one theme-derived equipment language',()=>{
  for(const selector of [
    'body.r2-runtime .r1-location-card',
    'body.r2-runtime .r1-records-sheet',
    'body.r2-runtime .field-control-tray',
    'body.r2-runtime .target-mode-panel',
    'body.r2-runtime .r2-display-shell'
  ]) assert(css.includes(selector));
  assert(css.includes('background:var(--r23-panel) !important'));
  assert(css.includes('border:1px solid var(--r23-line-strong) !important'));
});

test('Topographic low-data runtime distinguishes field features',()=>{
  for(const kind of ["kind==='land'","kind==='water_area'","kind==='road'","kind==='water'","kind==='coast'","kind==='contour'"]){
    assert(r1.includes(kind),kind);
  }
  assert(r1.includes("secondary:{weight:1.15,opacity:.38}"));
  assert(r1.includes("['place','peak'].includes(kind)"));
  assert(r1.includes("feature?.properties?.kind==='contour_label'"));
  assert(r1.includes("className:'r16-contour-label'"));
  assert(r1.includes("className:peak?'r16-low-peak-label':'r16-low-place-label'"));
  assert(r1.includes('lowDataBackgroundColor()'));
  assert(r1.includes('let lightMapContourLayer=null'));
  assert(r1.includes('let lightMapContourData=null'));
  assert(r1.includes("const LOW_DATA_CONTOUR_URL='./offline/kr-contours.geojson'"));
  assert(r1.includes('function loadLowDataContours()'));
  assert(r1.includes('function syncLowDataContourLayer()'));
  assert(r1.includes('const show=map.getZoom()>=10'));
  assert(r1.includes("excludedKinds=new Set(['place','peak','contour_label','contour'])"));
  assert(r1.includes("fetch(LOW_DATA_CONTOUR_URL,{cache:'force-cache'})"));
});

test('Topographic low-data builder includes terrain, land, water, road and peak sources',()=>{
  assert(topoBuilder.includes('CONTOUR_INTERVAL_M = 100'));
  assert(topoBuilder.includes('INDEX_CONTOUR_INTERVAL_M = 500'));
  assert(topoBuilder.includes('elevation-tiles-prod/terrarium'));
  assert(topoBuilder.includes('"secondary"'));
  assert(topoBuilder.includes('"kind": "land"'));
  assert(topoBuilder.includes('"kind": "water_area"'));
  assert(topoBuilder.includes('"kind": "peak"'));
  assert(topoBuilder.includes('"kind": "contour"'));
  assert(topoBuilder.includes('MAX_BASE_BYTES = 11_000_000'));
  assert(topoBuilder.includes('MAX_CONTOUR_BYTES = 8_000_000'));
  assert(topoBuilder.includes('BASE_OUTPUT = Path("offline/kr-low.geojson")'));
  assert(topoBuilder.includes('CONTOUR_OUTPUT = Path("offline/kr-contours.geojson")'));
  assert(lowDataWorkflow.includes('scripts/build_lowdata_topo.py'));
  assert(lowDataWorkflow.includes('offline/kr-contours.geojson'));
  assert(lowDataWorkflow.includes('w/highway=motorway,trunk,primary,secondary'));
  assert(lowDataWorkflow.includes('n/natural=peak'));
});

test('Coordinate parser hardening remains installed',()=>{
  assert(locationCore.includes('function decodeFull'));
  assert(locationCore.includes('function validateCoordinateLike'));
  assert(base.includes('window.ReconLocationCore'));
  assert(r1.includes("const WORKING_GRID_KEY='tactical_recon_working_grid_v2'"));
  assert(r1.includes("error.code='GRID_CONTEXT_MISMATCH'"));
});

test('Address HUD requests remain debounced and abortable',()=>{
  assert(r2.includes('const addressInFlight=new Map()'));
  assert(r2.includes("e&&e.name==='AbortError'"));
  assert(r2.includes('function scheduleHudAddressResolve'));
  assert(r2.includes('new AbortController()'));
  assert(r2.includes('},220);'));
});

test('Low-data viewport refresh still avoids full GeoJSON restyle on every move',()=>{
  assert(r1.includes('let lightMapRefreshTimer=null'));
  const hook=r1.slice(r1.indexOf('function installLowDataRefreshHooks()'),r1.indexOf('function suppressLightMapNetworkTiles()'));
  assert(hook.includes('refreshLowDataPlaces()'));
  assert.strictEqual(hook.includes('refreshLowDataBaseStyle()'),false);
  assert(hook.includes('},48);'));
  assert(css.includes('body.r2-runtime.r16-light-map .leaflet-tile-pane'));
});

test('Pages validation covers coordinate and R2 regressions',()=>{
  assert(workflow.includes('node --check location-core.js'));
  assert(workflow.includes('node test_location_core.js'));
  assert(workflow.includes('node --check r2.js'));
  assert(workflow.includes('node test_r2.js'));
});

console.log('R2.3.1 regression checks complete.');
