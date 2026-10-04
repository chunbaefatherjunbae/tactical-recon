const fs=require('fs');
const assert=require('assert');

const sw=fs.readFileSync('service-worker.js','utf8');
const runtime=fs.readFileSync('v28-runtime.js','utf8');
const core=fs.readFileSync('v29.js','utf8');
const ui=fs.readFileSync('v29-ui.js','utf8');
const css=fs.readFileSync('v29.css','utf8');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('PWA caches and injects V29 in dependency order',()=>{
  ["'./v29.css'","'./v29.js'","'./v29-ui.js'"].forEach(x=>assert(sw.includes(x)));
  assert(sw.indexOf("html.includes('v29.js')")>sw.indexOf("html.includes('v28-runtime.js')"));
  assert(sw.indexOf("html.includes('v29-ui.js')")>sw.indexOf("html.includes('v29.js')"));
});

test('V29 exposes all specification feature groups',()=>{
  ['reuse','compare','overlays','backtrack','magnetic','emergency','gpx'].forEach(key=>{
    assert(core.includes(key+':')||core.includes(key+'={')||core.includes(key+' :'),'missing '+key);
  });
});

test('TRACK to ROUTE does not promote estimated segments',()=>{
  assert(core.includes("filter(seg => seg?.kind === 'MEASURED'"));
  assert(core.includes('createTrackRoute'));
});

test('PLAN clone resets trackIds',()=>{
  const pos=core.indexOf('function clonePlan');
  assert(pos>=0);
  assert(core.slice(pos,pos+5000).includes('trackIds:[]'));
});

test('saved backtrack preference feeds V28 runtime selector',()=>{
  assert(runtime.includes("window.v29?.backtrack?.get?.(planId)"));
  assert(runtime.includes('buildBacktrackNodes(preferred).length'));
});

test('OVERLAY has minimum field types',()=>{
  ['DANGER','REFERENCE','BLOCKED','OBSERVATION','OTHER'].forEach(type=>assert(core.includes(type)));
  assert(ui.includes('v29-overlay-type'));
});

test('Emergency NAV separates GRID TRUE MAG and model metadata',()=>{
  assert(core.includes('gridBearing'));
  assert(core.includes('trueBearing'));
  assert(core.includes('magneticBearing'));
  assert(core.includes('declination'));
  assert(core.includes('convergence'));
  assert(ui.includes("t('grid')"));
  assert(ui.includes("t('true')"));
  assert(ui.includes("t('mag')"));
});

test('Emergency map has no tile or network dependency',()=>{
  assert(ui.includes('renderEmergencyMap'));
  assert(ui.includes('<svg viewBox='));
  assert.strictEqual(/fetch\(|tileLayer\(/.test(ui.slice(ui.indexOf('function renderEmergencyMap'))),false);
});

test('Online map failure exposes automatic emergency fallback',()=>{
  assert(ui.includes('function installMapFallback()'));
  assert(ui.includes("layer.on('tileerror'"));
  assert(ui.includes("if(tileErrorCount>=3)showMapFallback('TILE')"));
  assert(ui.includes("window.addEventListener('offline'"));
  assert(ui.includes("openSheet('emergency')"));
  assert(css.includes('.v29-map-fallback'));
});

test('Track comparison overlay persists until explicit clear',()=>{
  const start=ui.indexOf('function closeSheet()');
  const end=ui.indexOf('function ensureMapFallbackBanner',start);
  assert(start>=0&&end>start);
  assert.strictEqual(ui.slice(start,end).includes('clearCompareLayer()'),false);
  assert(ui.includes("id=\"v29CompareClear\""));
});

test('GPX estimated policy is explicit',()=>{
  assert(core.includes("filter(seg=>seg?.kind==='MEASURED'"));
  assert(core.includes("if(includeEstimated)"));
  assert(core.includes("ESTIMATED · "));
  assert(ui.includes('includeEstimated'));
});

test('V29 UI is mobile safe and readable',()=>{
  assert(css.includes('env(safe-area-inset-bottom)'));
  assert(css.includes('@media (max-width:520px)'));
  assert(css.includes('min-height:42px'));
  assert(css.includes('min-height:44px'));
});

console.log('\nV29 integration tests completed: '+passed+' passed, '+failed+' failed.');
if(failed>0)process.exit(1);
