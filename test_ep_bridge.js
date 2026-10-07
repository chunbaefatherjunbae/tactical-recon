const fs=require('fs');
const assert=require('assert');

const Legacy=require('./ep-core/legacy-adapter.js');
const Ref=require('./ep-core/reference-core.js');
const bridge=fs.readFileSync('ep-runtime-bridge.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('legacy selected location normalizes coords without creating objective state',()=>{
  const selected=Legacy.selectedFromLegacy({id:7,name:'POINT',coords:[37.5,127],source:'REGISTERED'});
  assert.deepEqual(
    {id:selected.id,name:selected.name,lat:selected.lat,lon:selected.lon,source:selected.source},
    {id:'7',name:'POINT',lat:37.5,lon:127,source:'REGISTERED'}
  );
  assert.strictEqual('objective' in selected,false);
});

test('legacy LAST FIX preserves timestamp age and accuracy',()=>{
  const p=Legacy.lastFixFromStorage({coords:[37.5,127],timestamp:1000,accuracyM:12},61000);
  assert.equal(p.timestamp,1000);
  assert.equal(p.ageMs,60000);
  assert.equal(p.accuracyM,12);
});

test('EP reference uses newest fallback and converts to legacy shape',()=>{
  const selected=Ref.selectReference({
    gpsEnabled:false,
    temp:{lat:37,lon:127,timestamp:2000},
    lastFix:{lat:37.1,lon:127.1,timestamp:1000}
  });
  assert.equal(selected.referenceKind,'TEMP');
  const legacy=Legacy.toLegacyReference(selected,3000);
  assert.deepEqual(legacy.coords,[37,127]);
  assert.equal(legacy.type,'TEMP');

  const last=Legacy.toLegacyReference({...selected,referenceKind:'LAST',timestamp:1000},3000);
  assert.equal(last.type,'LAST_FIX');
  assert.equal(last.ageMs,2000);
});

test('runtime bridge owns reference through EP core with explicit legacy fallback',()=>{
  assert(bridge.includes('Ref.selectReference({gpsEnabled,gpsFix,temp,lastFix})'));
  assert(bridge.includes('owned.__epReferenceOwner=true'));
  assert(bridge.includes('owned.__epLegacyFallback=legacyFallback'));
});

test('runtime bridge captures selection separately from legacy target mode',()=>{
  assert(bridge.includes('state.selected=next'));
  assert(bridge.includes("if(typeof openSitrep==='function'"));
  assert(bridge.includes("if(typeof selectAddressResult==='function'"));
  assert.strictEqual(bridge.includes('enterTargetMode('),false);
});

test('TEMP creation gets timestamp for newest TEMP/LAST policy',()=>{
  assert(bridge.includes('tempMarkPoint.timestamp=Date.now()'));
});

test('map center target and selected location are separate state slots',()=>{
  assert(bridge.includes("state.target={lat:Number(c.lat),lon:Number(c.lng),source:'MAP_CENTER'}"));
  assert(bridge.includes('state.selected=next'));
});

test('service worker loads EP cores before runtime bridge and after V29 runtime',()=>{
  ['ep-core/reference-core.js','ep-core/state-core.js','ep-core/legacy-adapter.js','ep-runtime-bridge.js'].forEach(x=>assert(sw.includes(x)));
  assert(sw.indexOf("html.includes('ep-runtime-bridge.js')")>sw.indexOf("html.includes('v29-stabilize.js')"));
});

if(failed){console.error('EP bridge failed: '+failed);process.exit(1);}
console.log('EP bridge passed: '+passed);
