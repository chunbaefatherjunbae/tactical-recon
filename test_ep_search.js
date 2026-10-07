const fs=require('fs');
const assert=require('assert');
const Loc=require('./ep-core/location-core.js');
const Search=require('./ep-core/search-core.js');

const mgrsSource=fs.readFileSync('vendor/mgrs-1.0.0.js','utf8');
const mgrs=new Function(mgrsSource+'\nreturn this.mgrs;').call({});

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

const seoul={lat:37.5665,lon:126.9780};
const prefix=Search.prefixForPoint(seoul,mgrs,Loc);

test('working grid prefix derives from real map/reference point',()=>{
  assert(prefix&&/^52S/.test(prefix.zoneBand));
  assert.equal(prefix.compactPrefix.length,5);
});

test('full MGRS parses without working-grid context',()=>{
  const full=mgrs.forward([seoul.lon,seoul.lat],5);
  const parsed=Search.parseDirect(full,{locationCore:Loc,mgrsLib:mgrs});
  assert.equal(parsed.source,'MGRS');
  assert.equal(parsed.workingGridApplied,false);
});

test('ten digit short MGRS expands through working grid',()=>{
  const full=mgrs.forward([seoul.lon,seoul.lat],5).replace(/\s+/g,'');
  const digits=full.slice(5);
  const parsed=Search.parseDirect(digits,{
    locationCore:Loc,mgrsLib:mgrs,workingGrid:prefix,contextPoint:seoul
  });
  assert.equal(parsed.workingGridApplied,true);
  assert(Math.abs(parsed.lat-seoul.lat)<0.01);
});

test('short MGRS without prefix is rejected',()=>{
  assert.throws(
    ()=>Search.parseDirect('2731141963',{locationCore:Loc,mgrsLib:mgrs}),
    e=>e.code==='GRID_PREFIX_REQUIRED'
  );
});

test('coordinate-looking garbage is rejected instead of sent to address search',()=>{
  assert.throws(
    ()=>Search.parseDirect('52SZZ123',{locationCore:Loc,mgrsLib:mgrs}),
    e=>e.code==='INVALID_COORDINATE_FORMAT'||e.code==='INVALID_MGRS'
  );
});

test('plain address text returns null for address provider',()=>{
  assert.equal(Search.parseDirect('서울역',{locationCore:Loc,mgrsLib:mgrs}),null);
});

if(failed){console.error('EP search failed: '+failed);process.exit(1);}
console.log('EP search passed: '+passed);
