import {validPoint} from './coordinates.mjs';
import {haversineKm} from './geo.mjs';

export const TRACK_STATE=Object.freeze({OFF:'OFF',RECORDING:'RECORDING',PAUSED:'PAUSED'});
export const TRACK_LIMITS=Object.freeze({
  maxGpsAccuracyM:65,
  minGpsDistanceM:6,
  minGpsIntervalMs:800,
  forceGpsDistanceM:3,
  forceGpsIntervalMs:5000
});

function id(){return 'track_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
function ts(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:Date.now();}

export function createTrackRuntime(){
  return {state:TRACK_STATE.OFF,activeTrack:null,lastAnchor:null,gpsGap:false,freshSegment:false,recovered:false};
}

function measuredSegment(track,forceNew){
  const last=track.segments[track.segments.length-1];
  if(!forceNew&&last?.kind==='MEASURED')return last;
  const seg={kind:'MEASURED',source:'GPS',points:[]};
  track.segments.push(seg);
  return seg;
}

function endpoint(anchor,sourceOverride){
  if(!validPoint(anchor))return null;
  return {lat:Number(anchor.lat),lon:Number(anchor.lon),source:sourceOverride||anchor.source||'GPS',timestamp:ts(anchor.timestamp)};
}

function addEstimated(track,reason,fromAnchor,toAnchor){
  const from=endpoint(fromAnchor);
  const to=endpoint(toAnchor);
  if(!from||!to)return false;
  track.segments.push({kind:'ESTIMATED',reason,from,to});
  const d=haversineKm(from,to);
  if(Number.isFinite(d))track.distance.estimatedKm+=d;
  return true;
}

export function startTrack(runtime,{missionId=null,seed=null,startedAt=Date.now()}={}){
  if(runtime.state!==TRACK_STATE.OFF)return runtime.activeTrack;
  runtime.activeTrack={
    schemaVersion:3,
    id:id(),
    originMissionId:missionId||null,
    startedAt:Number(startedAt),
    endedAt:null,
    segments:[],
    distance:{measuredKm:0,estimatedKm:0}
  };
  runtime.state=TRACK_STATE.RECORDING;
  runtime.lastAnchor=null;
  runtime.gpsGap=false;
  runtime.freshSegment=true;
  runtime.recovered=false;
  if(seed?.kind==='GPS')recordGps(runtime,seed);
  else if(seed?.kind==='TEMP')recordTemp(runtime,seed);
  return runtime.activeTrack;
}

function acceptMeasuredPoint(prev,point){
  if(!prev)return {accept:true,distance:0};
  const d=haversineKm(prev,point);
  const movedM=d*1000;
  const dt=point.timestamp-prev.timestamp;
  return {
    accept:(movedM>=TRACK_LIMITS.minGpsDistanceM&&dt>=TRACK_LIMITS.minGpsIntervalMs)||
      (movedM>=TRACK_LIMITS.forceGpsDistanceM&&dt>=TRACK_LIMITS.forceGpsIntervalMs),
    distance:d
  };
}

export function recordGps(runtime,sample){
  if(runtime.state!==TRACK_STATE.RECORDING||!runtime.activeTrack)return false;
  const point={
    lat:Number(sample?.lat),
    lon:Number(sample?.lon),
    timestamp:ts(sample?.timestamp),
    accuracyM:sample?.accuracyM===undefined?undefined:Number(sample.accuracyM)
  };
  if(!validPoint(point))return false;
  if(point.accuracyM!==undefined&&(!Number.isFinite(point.accuracyM)||point.accuracyM<0||point.accuracyM>TRACK_LIMITS.maxGpsAccuracyM))return false;
  const anchor={...point,source:'GPS'};
  const track=runtime.activeTrack;

  if(runtime.freshSegment||!runtime.lastAnchor){
    measuredSegment(track,true).points.push(point);
    runtime.lastAnchor=anchor;runtime.freshSegment=false;runtime.gpsGap=false;
    return true;
  }

  if(runtime.lastAnchor.source==='TEMP'||runtime.lastAnchor.source==='LAST_FIX'||runtime.gpsGap){
    const from=runtime.gpsGap&&runtime.lastAnchor.source==='GPS'?{...runtime.lastAnchor,source:'LAST_FIX'}:runtime.lastAnchor;
    addEstimated(track,'GPS_REACQUIRE',from,anchor);
    measuredSegment(track,true).points.push(point);
    runtime.lastAnchor=anchor;runtime.gpsGap=false;
    return true;
  }

  const seg=measuredSegment(track,false);
  const decision=acceptMeasuredPoint(seg.points[seg.points.length-1],point);
  if(!decision.accept)return false;
  seg.points.push(point);
  if(Number.isFinite(decision.distance))track.distance.measuredKm+=decision.distance;
  runtime.lastAnchor=anchor;runtime.gpsGap=false;
  return true;
}

export function recordTemp(runtime,sample){
  if(runtime.state!==TRACK_STATE.RECORDING||!runtime.activeTrack)return false;
  const anchor={lat:Number(sample?.lat),lon:Number(sample?.lon),source:'TEMP',timestamp:ts(sample?.timestamp)};
  if(!validPoint(anchor))return false;
  if(runtime.freshSegment||!runtime.lastAnchor){
    runtime.lastAnchor=anchor;runtime.freshSegment=false;runtime.gpsGap=false;
    return true;
  }
  if(runtime.lastAnchor.source==='TEMP'&&haversineKm(runtime.lastAnchor,anchor)<0.001){
    runtime.lastAnchor=anchor;return false;
  }
  const from=runtime.gpsGap&&runtime.lastAnchor.source==='GPS'?{...runtime.lastAnchor,source:'LAST_FIX'}:runtime.lastAnchor;
  if(!addEstimated(runtime.activeTrack,'TEMP_BRIDGE',from,anchor))return false;
  runtime.lastAnchor=anchor;runtime.gpsGap=false;
  return true;
}

export function markGpsGap(runtime){
  if(runtime.state!==TRACK_STATE.RECORDING||runtime.gpsGap||runtime.lastAnchor?.source!=='GPS')return false;
  runtime.gpsGap=true;
  return true;
}

export function pauseTrack(runtime){
  if(runtime.state!==TRACK_STATE.RECORDING||!runtime.activeTrack)return false;
  runtime.state=TRACK_STATE.PAUSED;
  runtime.lastAnchor=null;runtime.gpsGap=false;runtime.freshSegment=true;
  return true;
}

export function resumeTrack(runtime,seed){
  if(runtime.state!==TRACK_STATE.PAUSED||!runtime.activeTrack)return false;
  runtime.state=TRACK_STATE.RECORDING;
  runtime.lastAnchor=null;runtime.gpsGap=false;runtime.freshSegment=true;
  if(seed?.kind==='GPS')recordGps(runtime,seed);
  else if(seed?.kind==='TEMP')recordTemp(runtime,seed);
  return true;
}

export function stopTrack(runtime,endedAt=Date.now()){
  if(runtime.state===TRACK_STATE.OFF||!runtime.activeTrack)return null;
  runtime.activeTrack.endedAt=Number(endedAt);
  const finished=runtime.activeTrack;
  runtime.state=TRACK_STATE.OFF;
  runtime.activeTrack=null;runtime.lastAnchor=null;runtime.gpsGap=false;runtime.freshSegment=false;runtime.recovered=false;
  return finished;
}

export function measuredPointCount(track){
  return (track?.segments||[]).reduce((sum,seg)=>sum+(seg?.kind==='MEASURED'?seg.points?.length||0:0),0);
}

export function recoveryPayload(runtime){
  if(runtime.state===TRACK_STATE.OFF||!runtime.activeTrack)return null;
  return {
    schemaVersion:1,
    state:runtime.state,
    activeTrack:runtime.activeTrack,
    lastAnchor:runtime.lastAnchor,
    gpsGap:runtime.gpsGap,
    freshSegment:runtime.freshSegment,
    updatedAt:Date.now()
  };
}

export function recoverTrack(payload){
  const runtime=createTrackRuntime();
  if(!payload||payload.schemaVersion!==1||!payload.activeTrack||payload.activeTrack.endedAt)return runtime;
  runtime.activeTrack=payload.activeTrack;
  runtime.state=TRACK_STATE.PAUSED;
  runtime.lastAnchor=null;runtime.gpsGap=false;runtime.freshSegment=true;runtime.recovered=true;
  return runtime;
}
