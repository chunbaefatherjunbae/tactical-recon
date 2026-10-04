const fs=require('fs');
const assert=require('assert');

const data={};
global.localStorage={
  getItem:key=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:null,
  setItem:(key,value)=>{data[key]=String(value);},
  removeItem:key=>{delete data[key];},
  clear:()=>{Object.keys(data).forEach(k=>delete data[k]);}
};
global.window={};

eval(fs.readFileSync('v28.js','utf8'));
eval(fs.readFileSync('v28-runtime.js','utf8'));
eval(fs.readFileSync('v29.js','utf8'));

const v28=window.v28;
const v29=window.v29;
let passed=0,failed=0;

function reset(){
  localStorage.clear();
  v28.state.activePlanId=null;
  v28.state.activeTrackId=null;
  if(v28.track.state!=='OFF')v28.track.stop();
}
function test(name,fn){
  try{reset();fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}
function near(actual,expected,tol,msg){
  assert(Number.isFinite(actual),msg||'value is not finite');
  assert(Math.abs(actual-expected)<=tol,(msg||'value')+' '+actual+' not within '+tol+' of '+expected);
}
function makeTrack(){
  const p=v28.plans.create({name:'Field Plan',objective:{id:'S1',name:'OBJ',coords:[37.5,127],source:'SITE'}});
  v28.track.start(p.id,{kind:'GPS',lat:37.5,lon:127,timestamp:1000,accuracyM:5});
  v28.track.recordGps({lat:37.501,lon:127.001,timestamp:7000,accuracyM:5});
  v28.track.markGpsGap();
  v28.track.recordTemp([37.002,127.002],9000);
  v28.track.recordGps({lat:37.003,lon:127.003,timestamp:15000,accuracyM:5});
  return {plan:p,track:v28.track.stop()};
}

test('WMM2025 NOAA reference values',()=>{
  near(v29.magnetic.wmmField(80,0,0,2025).declination,1.28,.01,'80N');
  near(v29.magnetic.wmmField(0,120,0,2025).declination,-.16,.01,'equator');
  near(v29.magnetic.wmmField(-80,240,0,2025).declination,68.78,.01,'80S');
  near(v29.magnetic.wmmField(80,0,100,2025).declination,.85,.01,'altitude');
  near(v29.magnetic.wmmField(0,120,0,2027.5).declination,-.24,.01,'2027.5');
});

test('WMM2025 rejects model dates outside 2025-2030',()=>{
  assert.strictEqual(v29.magnetic.wmmField(37,127,0,2030).valid,false);
  assert.strictEqual(v29.magnetic.wmmField(37,127,0,2024.99).valid,false);
});

test('GRID TRUE MAG bundle keeps separate references',()=>{
  const out=v29.geo.bearingBundle([37.5,127],[37.6,127.2],{date:2026.5});
  assert(out);
  assert.strictEqual(out.zone,52);
  assert(Number.isFinite(out.trueBearing));
  assert(Number.isFinite(out.gridBearing));
  assert(Number.isFinite(out.magneticBearing));
  near(v29.geo.normalize360(out.trueBearing-out.convergence),out.gridBearing,.0001);
  near(v29.geo.normalize360(out.trueBearing-out.declination),out.magneticBearing,.0001);
});

test('Douglas-Peucker simplification preserves endpoints',()=>{
  const pts=[[37,127],[37.00001,127.00001],[37.00002,127.00002],[37.01,127.01]];
  const out=v29.geo.simplifyCoords(pts,10);
  assert(out.length<pts.length);
  assert.deepStrictEqual(out[0],pts[0]);
  assert.deepStrictEqual(out[out.length-1],pts[pts.length-1]);
});

test('TRACK to ROUTE copies MEASURED only and starts a clean PLAN',()=>{
  const {track}=makeTrack();
  const route=v29.reuse.createTrackRoute(track.id,{toleranceMeters:0});
  assert(route);
  assert.strictEqual(route.trackIds.length,0);
  assert(route.routeSegments.length>=1);
  const flat=route.routeSegments.flat();
  assert.strictEqual(flat.some(c=>Math.abs(c[0]-37.002)<1e-9&&Math.abs(c[1]-127.002)<1e-9),false,'TEMP estimate must not become route point');
});

test('PLAN clone preserves plan data but not TRACK history',()=>{
  const {plan}=makeTrack();
  const src=v28.plans.get(plan.id);
  src.routeSegments=[[[37.5,127],[37.51,127.01]]];
  src.overlaySegments=[[[37.52,127.02],[37.53,127.03]]];
  v28.storage.saveV28Plan(src);
  v29.overlays.set(plan.id,0,'DANGER','rockfall');
  const copy=v29.reuse.clonePlan(plan.id,{name:'Clone'});
  assert(copy);
  assert.strictEqual(copy.trackIds.length,0);
  assert.deepStrictEqual(copy.routeSegments,src.routeSegments);
  assert.deepStrictEqual(copy.overlaySegments,src.overlaySegments);
  assert.strictEqual(v29.overlays.list(copy.id)[0].type,'DANGER');
});

test('TRACK comparison returns field-use metrics',()=>{
  const p=v28.plans.create({name:'Compare'});
  v28.track.start(p.id,{kind:'GPS',lat:37,lon:127,timestamp:1000});
  v28.track.recordGps({lat:37.01,lon:127.01,timestamp:7000});
  const a=v28.track.stop();
  v28.track.start(p.id,{kind:'GPS',lat:37,lon:127,timestamp:10000});
  v28.track.recordGps({lat:37.011,lon:127.012,timestamp:16000});
  const b=v28.track.stop();
  const result=v29.compare.tracks(a,b);
  assert(result);
  assert(Number.isFinite(result.meanDeviationM));
  assert(Number.isFinite(result.maxDeviationM));
});

test('OVERLAY metadata is separate from PlanV1 geometry',()=>{
  const p=v28.plans.create({name:'Overlay'});
  p.overlaySegments=[[[37,127],[37.1,127.1]]];
  v28.storage.saveV28Plan(p);
  assert(v29.overlays.set(p.id,0,'BLOCKED','gate'));
  const meta=v29.overlays.list(p.id);
  assert.strictEqual(meta.length,1);
  assert.strictEqual(meta[0].type,'BLOCKED');
  assert.strictEqual(v28.plans.get(p.id).overlaySegments.length,1);
});

test('saved BACKTRACK selection is scoped to PLAN',()=>{
  const {plan,track}=makeTrack();
  assert(v29.backtrack.set(plan.id,track.id));
  assert.strictEqual(v29.backtrack.get(plan.id).id,track.id);
  const other=v28.plans.create({name:'Other'});
  assert.strictEqual(v29.backtrack.get(other.id),null);
});

test('BACKTRACK rejects tracks without usable measured nodes',()=>{
  const p=v28.plans.create({name:'Empty Backtrack'});
  const tr=v28.track.start(p.id);
  v28.track.recordTemp([37,127],1000);
  const done=v28.track.stop();
  assert.strictEqual(v29.backtrack.set(p.id,done.id),false);
});

test('GPX default never disguises ESTIMATED as TRACK',()=>{
  const {plan,track}=makeTrack();
  const gpx=v29.gpx.buildSelected({planId:plan.id,trackIds:[track.id],includeEstimated:false});
  assert(gpx.includes('<trkseg>'));
  assert.strictEqual(gpx.includes('ESTIMATED'),false);
  const expanded=v29.gpx.buildSelected({planId:plan.id,trackIds:[track.id],includeEstimated:true});
  assert(expanded.includes('ESTIMATED'));
  assert(expanded.includes('<rte>'));
});

console.log('\nV29 core tests completed: '+passed+' passed, '+failed+' failed.');
if(failed>0)process.exit(1);
