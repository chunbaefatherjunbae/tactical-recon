const fs=require('fs');
const assert=require('assert');
const Plan=require('./ep-core/plan-core.js');
const Adapter=require('./ep-core/plan-legacy-adapter.js');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

const legacy={
  planId:'T1',
  target:{id:'T1',name:'TARGET',coords:[37.3,127.3],source:'REGISTERED'},
  startPoint:{name:'START',coords:[37,127],source:'GPS'},
  viaPoints:[
    {id:'V1',name:'VIA 1',coords:[37.1,127.1]},
    {id:'V2',name:'VIA 2',coords:[37.2,127.2]}
  ],
  endPoint:{name:'HOME',coords:[37.4,127.4],source:'HOME'},
  routeSegments:[[[37,127],[37.2,127.2],[37.3,127.3]]],
  overlaySegments:[[[37.15,127.15],[37.16,127.16]]]
};

test('legacy V29 PLAN becomes one ordered EP point list',()=>{
  const p=Adapter.fromLegacy(legacy,Plan);
  assert.deepEqual(p.points.map(x=>x.name),['START','VIA 1','VIA 2','TARGET','HOME']);
  assert.deepEqual(p.points.map((x,i)=>Plan.roleAt(i,p.points.length)),['START','VIA','VIA','VIA','DEST']);
  assert.equal(p.compatibility.targetId,'T1');
});

test('TARGET is destination only when legacy END is absent',()=>{
  const p=Adapter.fromLegacy({...legacy,endPoint:null},Plan);
  assert.equal(p.points[p.points.length-1].name,'TARGET');
  assert.equal(Plan.roleAt(p.points.length-1,p.points.length),'DEST');
});

test('route and overlay strokes remain independent from points',()=>{
  const p=Adapter.fromLegacy(legacy,Plan);
  assert.equal(p.routeStrokes.length,1);
  assert.equal(p.overlayStrokes.length,1);
  const route=JSON.stringify(p.routeStrokes);
  Plan.movePoint(p,1,2);
  assert.equal(JSON.stringify(p.routeStrokes),route);
});

test('EP PLAN converts back to V29 shape without losing objective',()=>{
  const p=Adapter.fromLegacy(legacy,Plan);
  Plan.movePoint(p,1,2);
  const back=Adapter.toLegacy(p);
  assert.equal(back.target.id,'T1');
  assert.equal(back.startPoint.name,'START');
  assert.equal(back.endPoint.name,'HOME');
  assert.deepEqual(back.viaPoints.map(x=>x.name),['VIA 2','VIA 1']);
  assert.equal(back.routeSegments.length,1);
  assert.equal(back.overlaySegments.length,1);
});

test('plan core normalizes route and overlay stroke sets',()=>{
  const p=Plan.createPlan({lat:37.3,lon:127.3,name:'D'},{lat:37,lon:127,name:'S'});
  Plan.replaceRouteStrokes(p,[[{lat:37,lon:127},{lat:37.1,lon:127.1}]]);
  Plan.replaceOverlayStrokes(p,[[{lat:37.2,lon:127.2},{lat:37.3,lon:127.3}]]);
  assert.equal(p.routeStrokes.length,1);
  assert.equal(p.overlayStrokes.length,1);
});

if(failed){console.error('EP plan bridge failed: '+failed);process.exit(1);}
console.log('EP plan bridge passed: '+passed);
