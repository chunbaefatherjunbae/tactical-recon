const fs=require('fs');
const assert=require('assert');

const mgrsSource=fs.readFileSync('vendor/mgrs-1.0.0.js','utf8');
const mgrs=new Function(mgrsSource+'\nreturn this.mgrs;').call({});
const Loc=require('./ep-core/location-core.js');
const Ref=require('./ep-core/reference-core.js');
const Plan=require('./ep-core/plan-core.js');
const State=require('./ep-core/state-core.js');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

test('EP state axes start independently',()=>{
  const s=State.createState();
  assert.equal(s.surface,'MAP');
  assert.equal(s.overlay,'NONE');
  assert.equal(s.drawTool,'NONE');
  assert.equal(s.track.state,'OFF');
});

test('strict WGS84 parsing rejects invalid latitude',()=>{
  assert.deepEqual(Loc.parseWgs84('37.5,127'),{lat:37.5,lon:127,source:'WGS84'});
  assert.throws(()=>Loc.parseWgs84('137.5,127'),e=>e.code==='INVALID_WGS84');
});

test('full MGRS round trip is real, not pseudo',()=>{
  const decoded=Loc.decodeFull('52S CG 27311 41963',mgrs);
  assert(decoded&&Number.isFinite(decoded.lat)&&Number.isFinite(decoded.lon));
  assert.equal(decoded.compactPrefix,'52SCG');
});

test('Working Grid expands ten digit short coordinates',()=>{
  const expanded=Loc.expandShort('27311 41963','52S CG');
  assert.equal(expanded.mgrs,'52SCG2731141963');
});

test('Working Grid mismatch can be rejected',()=>{
  assert.throws(
    ()=>Loc.validateGridContext({lat:35,lon:129},{lat:37.56,lon:126.97},165),
    e=>e.code==='GRID_CONTEXT_MISMATCH'
  );
});

test('Reference uses GPS first and otherwise newest TEMP/LAST',()=>{
  const fallback=Ref.selectReference({
    gpsEnabled:false,
    temp:{lat:37,lon:127,timestamp:1000},
    lastFix:{lat:37.1,lon:127.1,timestamp:2000}
  });
  assert.equal(fallback.referenceKind,'LAST');
  const gps=Ref.selectReference({
    gpsEnabled:true,
    gpsFix:{lat:38,lon:128,timestamp:100},
    temp:{lat:37,lon:127,timestamp:9000}
  });
  assert.equal(gps.referenceKind,'GPS');
});

test('PLAN roles derive only from ordered point position',()=>{
  const p=Plan.createPlan({lat:37.3,lon:127.3,name:'DEST'},{lat:37,lon:127,name:'START'});
  Plan.insertPoint(p,{lat:37.1,lon:127.1,name:'VIA'},1);
  assert.deepEqual(p.points.map((x,i)=>Plan.roleAt(i,p.points.length)),['START','VIA','DEST']);
  Plan.movePoint(p,2,0);
  assert.deepEqual(p.points.map(x=>x.name),['DEST','START','VIA']);
  assert.deepEqual(p.points.map((x,i)=>Plan.roleAt(i,p.points.length)),['START','VIA','DEST']);
});

test('Route strokes stay independent from PLAN point reorder',()=>{
  const p=Plan.createPlan({lat:37.3,lon:127.3,name:'D'},{lat:37,lon:127,name:'S'});
  Plan.addStroke(p,[{lat:37,lon:127},{lat:37.2,lon:127.2}]);
  const stroke=JSON.stringify(p.routeStrokes);
  Plan.movePoint(p,1,0);
  assert.equal(JSON.stringify(p.routeStrokes),stroke);
});

test('Mission clones plan and manual NEXT is bounded',()=>{
  const p=Plan.createPlan({lat:37.3,lon:127.3,name:'D'},{lat:37,lon:127,name:'S'});
  Plan.insertPoint(p,{lat:37.1,lon:127.1,name:'V'},1);
  const m=Plan.startMission(p);
  assert.notStrictEqual(m.activePlan,p);
  assert.equal(m.nextIndex,1);
  Plan.stepMission(m,10);
  assert.equal(m.nextIndex,2);
  Plan.stepMission(m,-10);
  assert.equal(m.nextIndex,0);
});

if(failed){console.error('EP core failed: '+failed);process.exit(1);}
console.log('EP core passed: '+passed);
