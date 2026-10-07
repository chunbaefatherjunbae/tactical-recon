const fs=require('fs');
const assert=require('assert');
const Mission=require('./ep-core/mission-core.js');

let passed=0,failed=0;
function test(name,fn){
  try{fn();console.log('[PASS] '+name);passed++;}
  catch(e){console.error('[FAIL] '+name+': '+e.message);failed++;}
}

const plan={
  id:'P1',
  compatibility:{hasStart:true,targetId:'T1'},
  points:[
    {id:'S',name:'START',lat:37,lon:127},
    {id:'V1',name:'VIA 1',lat:37.1,lon:127.1},
    {id:'T1',name:'TARGET',lat:37.2,lon:127.2},
    {id:'E',name:'END',lat:37.3,lon:127.3}
  ],
  routeStrokes:[],overlayStrokes:[]
};

test('mission begins at first actionable point after START',()=>{
  const m=Mission.createMission(plan,{startedAt:1000});
  assert.equal(m.currentIndex,1);
  assert.equal(Mission.currentTarget(m).name,'VIA 1');
});

test('manual NEXT owns mission cursor and records leg time',()=>{
  const m=Mission.createMission(plan,{startedAt:1000});
  Mission.step(m,1,4000);
  assert.equal(m.currentIndex,2);
  assert.equal(m.legTimes['1'],3000);
  assert.equal(Mission.currentTarget(m).name,'TARGET');
});

test('mission cursor maps to legacy navLegIndex without START',()=>{
  assert.equal(Mission.planIndexToLegacyLeg(plan,1),0);
  assert.equal(Mission.planIndexToLegacyLeg(plan,3),2);
  assert.equal(Mission.legacyLegToPlanIndex(plan,0),1);
  assert.equal(Mission.legacyLegToPlanIndex(plan,2),3);
});

test('plan without START begins at index zero',()=>{
  const p={...plan,compatibility:{hasStart:false,targetId:'T1'},points:plan.points.slice(1)};
  const m=Mission.createMission(p,{startedAt:1000});
  assert.equal(m.currentIndex,0);
  assert.equal(Mission.planIndexToLegacyLeg(p,0),0);
});

test('TRACK return is a guidance override, not a mission mode',()=>{
  const m=Mission.createMission(plan,{startedAt:1000});
  assert(Mission.setTrackReturn(m,{name:'RETURN',lat:36.9,lon:126.9}));
  assert.equal(m.status,'ACTIVE');
  assert.equal(m.guidanceOverride.kind,'TRACK_RETURN');
  assert.equal(Mission.currentTarget(m).name,'RETURN');
  assert.equal(Mission.canStep(m,1),false);
  assert(Mission.clearGuidanceOverride(m));
  assert.equal(Mission.currentTarget(m).name,'VIA 1');
});

test('TRACK started during mission is linked and closes independently',()=>{
  const m=Mission.createMission(plan,{startedAt:1000});
  const link=Mission.linkTrack(m,'TRK-1',2000);
  assert(link);
  assert.equal(m.trackLinks.length,1);
  assert.equal(link.startPointIndex,1);
  Mission.step(m,1,3000);
  assert(Mission.closeTrackLink(m,'TRK-1',{at:4000,trackEndedAt:4000}));
  assert.equal(m.trackLinks[0].associationEndedAt,4000);
  assert.equal(m.trackLinks[0].endPointIndex,2);
  assert.equal(m.trackLinks[0].endReason,'TRACK_STOP');
});

test('mission end detaches linked TRACK without stopping the TRACK itself',()=>{
  const m=Mission.createMission(plan,{startedAt:1000});
  Mission.linkTrack(m,'TRK-2',2000);
  const record=Mission.finish(m,5000);
  assert.equal(record.trackLinks[0].associationEndedAt,5000);
  assert.equal(record.trackLinks[0].endReason,'MISSION_END');
  assert.equal(record.trackLinks[0].trackEndedAt,null);
});

test('mission finish snapshots state and clears guidance override',()=>{
  const m=Mission.createMission(plan,{startedAt:1000});
  Mission.setTrackReturn(m,{name:'RETURN',lat:36.9,lon:126.9});
  const record=Mission.finish(m,5000);
  assert.equal(record.status,'ENDED');
  assert.equal(record.endedAt,5000);
  assert.equal(record.guidanceOverride,null);
});

test('V28 TrackV2 emits lifecycle events without changing track engine ownership',()=>{
  const runtime=fs.readFileSync('v28-runtime.js','utf8');
  assert(runtime.includes("emitTrackLifecycle('START'"));
  assert(runtime.includes("emitTrackLifecycle('PAUSE'"));
  assert(runtime.includes("emitTrackLifecycle('RESUME'"));
  assert(runtime.includes("emitTrackLifecycle('STOP'"));
  assert(runtime.includes("emitTrackLifecycle('RECOVER'"));
});

test('mission bridge links only TRACK START events that occur during active mission',()=>{
  const bridge=fs.readFileSync('ep-mission-bridge.js','utf8');
  assert(bridge.includes("if(kind==='START')"));
  assert(bridge.includes("if(state.mission?.status==='ACTIVE')"));
  assert(bridge.includes('Mission.linkTrack(state.mission,trackId'));
  assert.strictEqual(bridge.includes("if(kind==='RECOVER'){"),false);
});

test('mission bridge owns NEXT destination and BACKTRACK as track return',()=>{
  const bridge=fs.readFileSync('ep-mission-bridge.js','utf8');
  assert(bridge.includes('Mission.step(mission,1)'));
  assert(bridge.includes('Mission.currentTarget(mission)'));
  assert(bridge.includes("Mission.setTrackReturn(mission,target)"));
  assert(bridge.includes("kind==='TRACK_RETURN'"));
  assert(bridge.includes('root.nextNavLeg=wrapped'));
  assert(bridge.includes('root.getCurrentNavDestination=wrapped'));
  assert(bridge.includes('root.toggleBacktrack=wrapped'));
});

test('legacy NAV recovery syncs back into MissionCore',()=>{
  const bridge=fs.readFileSync('ep-mission-bridge.js','utf8');
  assert(bridge.includes('Mission.legacyLegToPlanIndex'));
  assert(bridge.includes('root.updateTargetModePanel=wrapped'));
});

if(failed){console.error('EP mission failed: '+failed);process.exit(1);}
console.log('EP mission passed: '+passed);
