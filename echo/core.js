(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EchoCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const TRACK={OFF:'OFF',RECORDING:'RECORDING',PAUSED:'PAUSED'};

  function now(){return Date.now();}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function validPoint(p){return !!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=-90&&p.lat<=90&&p.lon>=-180&&p.lon<=180;}
  function point(input={}){
    const p={
      id:String(input.id||('pt_'+Math.random().toString(36).slice(2,9))),
      name:String(input.name||'미지점'),
      lat:Number(input.lat),
      lon:Number(input.lon),
      source:String(input.source||'MAP'),
      saved:!!input.saved,
      createdAt:Number(input.createdAt||now())
    };
    if(!validPoint(p))throw new Error('INVALID_POINT');
    return p;
  }
  function createState(){
    return {
      mode:'MAP',
      gps:{enabled:false,fix:null,lastFix:null,follow:false},
      temp:null,
      target:null,
      plan:null,
      mission:null,
      track:{state:TRACK.OFF,startedAt:null,pausedAt:null,points:[],missionId:null},
      savedLocations:[]
    };
  }
  function setGpsFix(state,input){
    const p=point({...input,source:'GPS',name:input.name||'현재위치'});
    p.at=Number(input.at||now());
    state.gps.fix=p;
    state.gps.lastFix=clone(p);
    return p;
  }
  function clearGpsFix(state){state.gps.fix=null;}
  function setTemp(state,input){
    const p=point({...input,source:'TEMP',name:input.name||'TEMP'});
    p.at=Number(input.at||now());
    state.temp=p;
    return p;
  }
  function getReference(state){
    if(state.gps.enabled&&validPoint(state.gps.fix))return {...state.gps.fix,referenceKind:'GPS'};
    const candidates=[state.temp,state.gps.lastFix].filter(validPoint);
    if(!candidates.length)return null;
    candidates.sort((a,b)=>Number(b.at||b.createdAt||0)-Number(a.at||a.createdAt||0));
    const chosen=candidates[0];
    return {...chosen,referenceKind:chosen.source==='TEMP'?'TEMP':'LAST'};
  }
  function createPlan(destination,reference){
    if(!validPoint(destination))throw new Error('DESTINATION_REQUIRED');
    const points=[];
    if(validPoint(reference))points.push(point({...reference,id:'start_'+Math.random().toString(36).slice(2,7),name:reference.name||'출발지',source:reference.source||'REFERENCE'}));
    points.push(point({...destination,id:'dest_'+Math.random().toString(36).slice(2,7)}));
    return {
      id:'plan_'+Math.random().toString(36).slice(2,10),
      createdAt:now(),
      updatedAt:now(),
      points,
      route:[]
    };
  }
  function addPlanPoint(plan,input,index){
    const p=point(input);
    const at=Number.isInteger(index)?Math.max(0,Math.min(index,plan.points.length)):Math.max(0,plan.points.length-1);
    plan.points.splice(at,0,p);
    plan.updatedAt=now();
    return p;
  }
  function removePlanPoint(plan,id){
    const i=plan.points.findIndex(p=>p.id===id);
    if(i<0)return false;
    plan.points.splice(i,1);
    plan.updatedAt=now();
    return true;
  }
  function movePlanPoint(plan,from,to){
    if(from<0||to<0||from>=plan.points.length||to>=plan.points.length||from===to)return false;
    const [item]=plan.points.splice(from,1);
    plan.points.splice(to,0,item);
    plan.updatedAt=now();
    return true;
  }
  function replaceRoute(plan,coords){
    plan.route=(Array.isArray(coords)?coords:[]).filter(validPoint).map(p=>({lat:Number(p.lat),lon:Number(p.lon)}));
    plan.updatedAt=now();
    return plan.route;
  }
  function startMission(plan){
    if(!plan||plan.points.length<2)throw new Error('PLAN_INCOMPLETE');
    const snapshot=clone(plan);
    return {
      id:'mission_'+Math.random().toString(36).slice(2,10),
      startedAt:now(),
      endedAt:null,
      nextIndex:Math.min(1,plan.points.length-1),
      initialPlan:snapshot,
      activePlan:clone(plan)
    };
  }
  function stepMission(mission,delta){
    const max=Math.max(0,mission.activePlan.points.length-1);
    mission.nextIndex=Math.max(0,Math.min(max,mission.nextIndex+delta));
    return mission.nextIndex;
  }
  function trackTap(state){
    const t=state.track;
    if(t.state===TRACK.OFF){
      t.state=TRACK.RECORDING;t.startedAt=now();t.pausedAt=null;t.points=[];t.missionId=state.mission?.id||null;
    }else if(t.state===TRACK.RECORDING){
      t.state=TRACK.PAUSED;t.pausedAt=now();
    }else{
      t.state=TRACK.RECORDING;t.pausedAt=null;
    }
    return t.state;
  }
  function trackStop(state){
    const t=state.track;
    if(t.state===TRACK.OFF)return null;
    const record={
      id:'track_'+Math.random().toString(36).slice(2,10),
      startedAt:t.startedAt,
      endedAt:now(),
      points:clone(t.points),
      missionId:t.missionId
    };
    state.track={state:TRACK.OFF,startedAt:null,pausedAt:null,points:[],missionId:null};
    return record;
  }
  function addTrackPoint(state,input){
    if(state.track.state!==TRACK.RECORDING)return false;
    const p=point({...input,source:'TRACK',name:'TRACK'});
    p.at=Number(input.at||now());
    state.track.points.push(p);
    return true;
  }
  function haversineKm(a,b){
    if(!validPoint(a)||!validPoint(b))return Infinity;
    const R=6371,d2r=Math.PI/180;
    const dLat=(b.lat-a.lat)*d2r,dLon=(b.lon-a.lon)*d2r;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*d2r)*Math.cos(b.lat*d2r)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }
  function bearingDeg(a,b){
    if(!validPoint(a)||!validPoint(b))return NaN;
    const r=Math.PI/180;
    const p1=a.lat*r,p2=b.lat*r,d=(b.lon-a.lon)*r;
    const y=Math.sin(d)*Math.cos(p2);
    const x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(d);
    return (Math.atan2(y,x)/r+360)%360;
  }

  return {TRACK,validPoint,point,createState,setGpsFix,clearGpsFix,setTemp,getReference,createPlan,addPlanPoint,removePlanPoint,movePlanPoint,replaceRoute,startMission,stepMission,trackTap,trackStop,addTrackPoint,haversineKm,bearingDeg};
});