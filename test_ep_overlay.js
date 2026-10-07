const fs=require('fs');
const assert=require('assert');
const Overlay=require('./ep-core/overlay-core.js');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('overlay is one exclusive axis',()=>{
  const state={overlay:'NONE'};
  assert(Overlay.set(state,'LOCATION',{source:'SITREP'}));
  assert.equal(state.overlay,'LOCATION');
  assert(Overlay.set(state,'SEARCH',{source:'SEARCH'}));
  assert.equal(state.overlay,'SEARCH');
  assert.equal(state.overlayMeta.previous,'LOCATION');
  assert(Overlay.close(state,'SEARCH'));
  assert.equal(state.overlay,'NONE');
});

test('closing a different overlay does not alter state',()=>{
  const state={overlay:'POINTS'};
  assert.equal(Overlay.close(state,'SEARCH'),false);
  assert.equal(state.overlay,'POINTS');
});

test('all EP overlay kinds are explicit',()=>{
  assert.deepEqual(Object.keys(Overlay.OVERLAY),['NONE','LOCATION','SEARCH','POINTS','RECORDS','TOOLS']);
});

test('legacy panels map into EP overlay axis',()=>{
  const source=fs.readFileSync('ep-overlay-bridge.js','utf8');
  assert(source.includes("wrapOpen('openSitrep','LOCATION'"));
  assert(source.includes("wrapOpen('openAddressSearch','SEARCH'"));
  assert(source.includes("wrapOpen('openWpDrawer','POINTS'"));
  assert(source.includes("wrapOpen('openFieldControls','TOOLS'"));
  assert(source.includes("setOverlay('RECORDS'"));
  assert(source.includes('closeAllLegacy(next)'));
});

test('overlay state is exposed on body for shell CSS',()=>{
  const source=fs.readFileSync('ep-overlay-bridge.js','utf8');
  assert(source.includes('document.body.dataset.epOverlay=state.overlay'));
  assert(source.includes("ep-overlay-"));
});

if(failed){console.error('EP overlay failed: '+failed);process.exit(1);}
console.log('EP overlay passed: '+passed);
