const fs=require('fs');
const assert=require('assert');

const r1=fs.readFileSync('r1.js','utf8');
const css=fs.readFileSync('r1.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const base=fs.readFileSync('app-base.js','utf8');
const lowDataPath='offline/kr-low.geojson';
const lowData=JSON.parse(fs.readFileSync(lowDataPath,'utf8'));

function test(name,fn){
  try{fn();console.log('PASS',name);}
  catch(e){console.error('FAIL',name);throw e;}
}

test('R1 loads explicitly after the legacy runtime layers',()=>{
  assert(sw.includes("'./r1.css'"));
  assert(sw.includes("'./r1.js'"));
  assert(index.includes('href="./r1.css"'));
  assert(index.includes('src="./r1.js"'));
  assert(index.indexOf('href="./r1.css"')>index.indexOf('href="./v29.css"'));
  assert(index.indexOf('src="./r1.js"')>index.indexOf('src="./v29-ui.js"'));
  assert.strictEqual(sw.includes('injectStableOverlay'),false);
});

test('R1 remains cached beneath the current runtime identity',()=>{
  assert(sw.includes("const CACHE_VERSION = 'r2-3-1-field-polish-topo-20261006-1';"));
  assert(base.includes('service-worker.js?v=r2-3-1-field-polish-topo-20261006-1'));
  assert(base.includes('tactical-recon-sw-reload-r2-3-1-field-polish-topo-20261006-1'));
  assert(sw.includes("'./r1.css'"));
  assert(sw.includes("'./r1.js'"));
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

test('R2.3 working-grid search accepts short MGRS only with a bounded trusted context',()=>{
  assert(r1.includes("const WORKING_GRID_KEY='tactical_recon_working_grid_v2'"));
  assert(r1.includes("if(Number(raw?.version)!==2)return null"));
  assert(r1.includes("['FULL','MANUAL'].includes"));
  assert(r1.includes('function workingGridContext()'));
  assert(r1.indexOf('const saved=storedWorkingGrid()')<r1.indexOf("source:'MAP',coords,trusted:false"));
  assert(r1.indexOf("source:'MAP',coords,trusted:false")<r1.indexOf("source:String(ref.type||'REF'),coords,trusted:false"));
  assert(r1.includes('function expandMgrsQuery(query)'));
  assert(r1.includes("saveWorkingGrid(expanded.prefix,'FULL')"));
  assert(r1.includes("error.code='GRID_CONTEXT_MISMATCH'"));
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

test('R1.4 removes fake REC state from the top bar',()=>{
  assert.strictEqual(index.includes('REC  ●'),false);
  assert(css.includes('body.r14-ui .top-compass-bar::before'));
  assert(css.includes('content:none !important'));
});

test('R1.4 restores V-series reticle visibility',()=>{
  assert(r1.includes("'r14-ui'"));
  assert(r1.includes('R1.6 FIELD TERMINAL'));
  assert(r1.includes("'r15-ui'"));
  assert(r1.includes("'r16-ui'"));
  assert(css.includes('body.r14-ui .reticle-container'));
  assert(css.includes('width:112px !important'));
  assert(css.includes('height:112px !important'));
  assert(css.includes('width:40px !important'));
  assert(css.includes('height:40px !important'));
  assert(css.includes('background:var(--field-active) !important'));
});

test('R1.4.1 restores the actual V-series mobile reticle size',()=>{
  assert(css.includes('/* R1.4.1 // restore the actual V-series mobile reticle dimensions. */'));
  assert(css.includes('width:94px !important'));
  assert(css.includes('height:94px !important'));
  assert(css.includes('width:34px !important'));
  assert(css.includes('height:34px !important'));
});

test('R1.4 corners use screen edges and scale is bottom-center',()=>{
  assert(css.includes('body.r14-ui .bracket.tl'));
  assert(css.includes('top:14px !important'));
  assert(css.includes('left:14px !important'));
  assert(css.includes('body.r14-ui .bracket.br'));
  assert(css.includes('right:14px !important'));
  assert(css.includes('body.r14-ui .map-scale-osd'));
  assert(css.includes('left:50% !important'));
  assert(css.includes('transform:translateX(-50%) !important'));
});

test('R1.6 low-data mode keeps one Leaflet map with a local OSM basemap',()=>{
  assert(r1.includes('function isNetworkTileLayer(layer)'));
  assert(r1.includes('function suppressLightMapNetworkTiles()'));
  assert(r1.includes("const LOW_DATA_MAP_URL='./offline/kr-low.geojson'"));
  assert(r1.includes('function loadLowDataBasemap()'));
  assert(r1.includes("fetch(LOW_DATA_MAP_URL,{cache:'force-cache'})"));
  assert(r1.includes("document.body.classList.add('r15-light-map','r16-light-map')"));
  assert(r1.includes("document.body.classList.remove('r15-light-map','r16-light-map')"));
  assert.strictEqual(r1.includes("L.GridLayer.extend"),false);
  assert.strictEqual(r1.includes("id='v29LightMap'"),false);
  assert(css.includes('body.r16-light-map #map'));
  assert(sw.includes("'./offline/kr-low.geojson'"));
});

test('R1.6 low-data basemap is compact, truthful and includes real context layers',()=>{
  assert(fs.statSync(lowDataPath).size<9000000);
  assert.strictEqual(lowData.type,'FeatureCollection');
  assert.strictEqual(lowData.source,'OpenStreetMap via Geofabrik');
  assert.strictEqual(lowData.license,'ODbL 1.0');
  const kinds=new Set(lowData.features.map(f=>f?.properties?.kind));
  ['road','water','coast','boundary','place'].forEach(kind=>assert(kinds.has(kind)));
  const roads=lowData.features.filter(f=>f?.properties?.kind==='road').map(f=>f.properties.class).sort();
  assert.deepStrictEqual(roads,['motorway','primary','trunk']);
});

test('R1.6 grid is geographic rather than a decorative tile pattern',()=>{
  assert(r1.includes('function lowDataGridStep(bounds)'));
  assert(r1.includes('function lowDataGridLabel(value,axis,decimals)'));
  assert(r1.includes('function renderLowDataCoordinateGrid()'));
  assert(r1.includes("bounds=map.getBounds().pad(.18)"));
  assert(r1.includes("L.polyline([[v,west],[v,east]],style)"));
  assert(r1.includes("L.polyline([[south,v],[north,v]],style)"));
  assert(css.includes('.r16-grid-label'));
  assert(css.includes('.r16-low-place-label'));
});

test('R1.5 HUD uses a fixed semantic slot instead of an empty BRG placeholder',()=>{
  assert(index.includes('id="hudPrimaryLabel">REF</span>'));
  assert(index.includes('id="hudBearing">NONE</span>'));
  assert(base.includes("hudLabel.innerText = 'REF'"));
  assert(base.includes("hudLabel.innerText = 'BRG'"));
  assert(base.includes("ref?.type === 'LAST_FIX' ? 'LAST'"));
  assert(css.includes('grid-template-columns:30px 76px'));
  assert(css.includes('font-variant-numeric:tabular-nums'));
});

test('R1.5 reticle keeps V dimensions but opens the center gate',()=>{
  assert(css.includes('body.r15-ui .target-gate'));
  assert(css.includes('border:0 !important'));
  assert(css.includes('left top/10px 1px no-repeat'));
  assert(css.includes('right bottom/1px 10px no-repeat'));
  assert(css.includes('body.r15-ui.v29-picking-location .target-gate'));
});

test('R1.3 mobile UI has dedicated map shell cards',()=>{
  assert(css.includes('.r1-map-search'));
  assert(css.includes('.r1-location-card'));
  assert(css.includes('.r1-records-sheet'));
  assert(css.includes('env(safe-area-inset-bottom)'));
  assert(css.includes('min-height:44px'));
});

console.log('R1 regression checks complete.');
