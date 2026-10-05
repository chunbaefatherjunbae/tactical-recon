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
  assert(sw.includes("const CACHE_VERSION = 'r1-structure-20261005-1';"));
  assert(index.includes('service-worker.js?v=r1-structure-20261005-1'));
  assert(index.includes('tactical-recon-sw-reload-r1-structure-20261005-1'));
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

test('R1 mobile UI has dedicated map shell cards',()=>{
  assert(css.includes('.r1-map-search'));
  assert(css.includes('.r1-location-card'));
  assert(css.includes('.r1-records-sheet'));
  assert(css.includes('env(safe-area-inset-bottom)'));
  assert(css.includes('min-height:44px'));
});

console.log('R1 regression checks complete.');
