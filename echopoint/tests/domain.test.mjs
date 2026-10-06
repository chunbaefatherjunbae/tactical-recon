import assert from 'node:assert/strict';
import {parseWgs84,parseFullParts,expandShort} from '../src/coordinates.mjs';
import {haversineKm,initialBearing} from '../src/geo.mjs';
import {selectReference} from '../src/reference.mjs';
import {createPlan,insertPoint,movePoint,roleForIndex,startMission,stepMission,removeFuturePoint,addStroke,eraseRouteNear,importTrackAsRoute} from '../src/plan.mjs';
import {createTrackRuntime,startTrack,recordGps,recordTemp,pauseTrack,resumeTrack,stopTrack,TRACK_STATE,measuredPointCount,recoveryPayload,recoverTrack} from '../src/track.mjs';

assert.deepEqual(parseWgs84('37.5, 127.0'),{lat:37.5,lon:127,source:'WGS84'});
assert.equal(parseFullParts('52S CG 12345 67890').precision,5);
assert.equal(expandShort('1234567890','52S CG').mgrs,'52SCG1234567890');

const ref=selectReference({
  gps:{enabled:false,fix:null},
  temp:{lat:37,lon:127,timestamp:1000},
  lastFix:{lat:37.1,lon:127.1,timestamp:2000}
});
assert.equal(ref.referenceKind,'LAST');
assert.equal(selectReference({gps:{enabled:true,fix:{lat:38,lon:128,timestamp:3000}},temp:{lat:37,lon:127,timestamp:4000}}).referenceKind,'GPS');

assert(Math.abs(initialBearing({lat:0,lon:0},{lat:1,lon:0}))<0.01);
assert(haversineKm({lat:37,lon:127},{lat:37.001,lon:127})>0.1);

const plan=createPlan({lat:37.3,lon:127.3,name:'DEST'},{lat:37,lon:127,name:'START'});
insertPoint(plan,{lat:37.1,lon:127.1,name:'VIA'},1);
assert.deepEqual(plan.points.map(p=>p.name),['START','VIA','DEST']);
movePoint(plan,2,0);
assert.deepEqual(plan.points.map(p=>p.name),['DEST','START','VIA']);
assert.equal(roleForIndex(0,3),'START');
assert.equal(roleForIndex(1,3),'VIA');
assert.equal(roleForIndex(2,3),'DEST');

addStroke(plan,[{lat:37,lon:127},{lat:37.001,lon:127.001},{lat:37.002,lon:127.002}]);
assert.equal(plan.routeStrokes.length,1);
eraseRouteNear(plan,{lat:37.001,lon:127.001},30);
assert.equal(plan.routeStrokes.length,0);

const mission=startMission(plan);
assert.equal(mission.nextIndex,1);
stepMission(mission,1);
assert.equal(mission.nextIndex,2);
assert(removeFuturePoint(mission,mission.activePlan.points[2].id));
assert.equal(mission.nextIndex,1);

const runtime=createTrackRuntime();
startTrack(runtime,{missionId:'mission-1',startedAt:1000});
assert.equal(runtime.state,TRACK_STATE.RECORDING);
assert(recordGps(runtime,{lat:37,lon:127,timestamp:1000,accuracyM:10}));
assert(!recordGps(runtime,{lat:37.000001,lon:127,timestamp:1200,accuracyM:10}));
assert(recordGps(runtime,{lat:37.0001,lon:127,timestamp:7000,accuracyM:10}));
assert.equal(measuredPointCount(runtime.activeTrack),2);
assert(pauseTrack(runtime));
assert.equal(runtime.state,TRACK_STATE.PAUSED);
assert(resumeTrack(runtime));
const recovery=recoveryPayload(runtime);
const recovered=recoverTrack(recovery);
assert.equal(recovered.state,TRACK_STATE.PAUSED);
const finished=stopTrack(runtime,9000);
assert.equal(finished.originMissionId,'mission-1');
assert.equal(runtime.state,TRACK_STATE.OFF);

const bridgeRuntime=createTrackRuntime();
startTrack(bridgeRuntime,{startedAt:1000});
recordGps(bridgeRuntime,{lat:37,lon:127,timestamp:1000,accuracyM:10});
recordTemp(bridgeRuntime,{lat:37.01,lon:127.01,timestamp:2000});
assert.equal(bridgeRuntime.activeTrack.segments.find(s=>s.kind==='ESTIMATED').from.source,'GPS');

const importPlan=createPlan({lat:37.5,lon:127.5,name:'D'},{lat:37.4,lon:127.4,name:'S'});
const pointNames=importPlan.points.map(p=>p.name);
assert.equal(importTrackAsRoute(importPlan,finished),1);
assert.deepEqual(importPlan.points.map(p=>p.name),pointNames);

console.log('ECHOPOINT domain tests passed');
