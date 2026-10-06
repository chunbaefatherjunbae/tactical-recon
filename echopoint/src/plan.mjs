import {validPoint} from './coordinates.mjs';
import {haversineKm} from './geo.mjs';

function id(prefix){
  return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
}

export function clone(value){
  return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
}

export function makePoint(input={}){
  const point={
    id:String(input.id||id('pt')),
    name:String(input.name||'미지점').slice(0,120),
    lat:Number(input.lat),
    lon:Number(input.lon),
    source:String(input.source||'MAP'),
    address:input.address?String(input.address).slice(0,240):undefined,
    siteId:input.siteId?String(input.siteId):undefined,
    createdAt:Number(input.createdAt||Date.now())
  };
  if(!validPoint(point))throw new Error('INVALID_POINT');
  return point;
}

export function roleForIndex(index,length){
  if(index===0)return 'START';
  if(index===length-1)return 'DEST';
  return 'VIA';
}

export function createPlan(destination,reference){
  if(!validPoint(destination))throw new Error('DESTINATION_REQUIRED');
  const points=[];
  if(validPoint(reference))points.push(makePoint({...reference,id:undefined,name:reference.name||'출발지',source:reference.source||reference.referenceKind||'REFERENCE'}));
  points.push(makePoint({...destination,id:undefined}));
  const now=Date.now();
  return {schemaVersion:1,id:id('plan'),name:String(destination.name||'새 계획'),createdAt:now,updatedAt:now,points,routeStrokes:[]};
}

export function setStart(plan,input){
  const p=makePoint(input);
  if(!plan.points.length)plan.points.push(p);
  else if(plan.points.length===1)plan.points.unshift(p);
  else plan.points[0]=p;
  plan.updatedAt=Date.now();
  return p;
}

export function setDestination(plan,input){
  const p=makePoint(input);
  if(!plan.points.length)plan.points.push(p);
  else plan.points[plan.points.length-1]=p;
  plan.name=p.name||plan.name;
  plan.updatedAt=Date.now();
  return p;
}

export function insertPoint(plan,input,index){
  const p=makePoint(input);
  const fallback=Math.max(0,plan.points.length-1);
  const at=Number.isInteger(index)?Math.max(0,Math.min(index,plan.points.length)):fallback;
  plan.points.splice(at,0,p);
  plan.updatedAt=Date.now();
  return p;
}

export function removePoint(plan,pointId){
  const i=plan.points.findIndex(p=>p.id===pointId);
  if(i<0)return false;
  plan.points.splice(i,1);
  plan.updatedAt=Date.now();
  return true;
}

export function movePoint(plan,from,to){
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=plan.points.length||to>=plan.points.length||from===to)return false;
  const [item]=plan.points.splice(from,1);
  plan.points.splice(to,0,item);
  plan.updatedAt=Date.now();
  return true;
}

export function addStroke(plan,points){
  const clean=(Array.isArray(points)?points:[]).filter(validPoint).map(p=>({lat:Number(p.lat),lon:Number(p.lon)}));
  if(clean.length<2)return null;
  const stroke={id:id('stroke'),points:clean};
  plan.routeStrokes.push(stroke);
  plan.updatedAt=Date.now();
  return stroke;
}

export function undoStroke(plan){
  const value=plan.routeStrokes.pop()||null;
  if(value)plan.updatedAt=Date.now();
  return value;
}

export function clearRoute(plan){
  plan.routeStrokes=[];
  plan.updatedAt=Date.now();
}

export function eraseRouteNear(plan,center,radiusMeters){
  if(!validPoint(center)||!Number.isFinite(radiusMeters)||radiusMeters<=0)return false;
  const next=[];
  let changed=false;
  for(const stroke of plan.routeStrokes){
    let chunk=[];
    for(const p of stroke.points){
      if(haversineKm(center,p)*1000<=radiusMeters){
        changed=true;
        if(chunk.length>=2)next.push({id:id('stroke'),points:chunk});
        chunk=[];
      }else chunk.push(p);
    }
    if(chunk.length>=2)next.push({id:id('stroke'),points:chunk});
  }
  if(changed){
    plan.routeStrokes=next;
    plan.updatedAt=Date.now();
  }
  return changed;
}

export function importTrackAsRoute(plan,track){
  const strokes=[];
  for(const seg of track?.segments||[]){
    if(seg?.kind==='MEASURED'){
      const points=(seg.points||[]).filter(validPoint).map(p=>({lat:Number(p.lat),lon:Number(p.lon)}));
      if(points.length>=2)strokes.push({id:id('stroke'),points});
    }else if(seg?.kind==='ESTIMATED'&&validPoint(seg.from)&&validPoint(seg.to)){
      strokes.push({id:id('stroke'),points:[{lat:Number(seg.from.lat),lon:Number(seg.from.lon)},{lat:Number(seg.to.lat),lon:Number(seg.to.lon)}]});
    }
  }
  plan.routeStrokes=strokes;
  plan.updatedAt=Date.now();
  return strokes.length;
}

export function startMission(plan){
  if(!plan||plan.points.length<2)throw new Error('PLAN_INCOMPLETE');
  const now=Date.now();
  return {
    schemaVersion:1,
    id:id('mission'),
    startedAt:now,
    endedAt:null,
    nextIndex:Math.min(1,plan.points.length-1),
    initialPlan:clone(plan),
    activePlan:clone(plan),
    trackLinks:[]
  };
}

export function stepMission(mission,delta){
  const max=Math.max(0,mission.activePlan.points.length-1);
  mission.nextIndex=Math.max(0,Math.min(max,mission.nextIndex+Number(delta||0)));
  return mission.nextIndex;
}

export function moveFuturePoint(mission,from,to){
  if(from<mission.nextIndex||to<mission.nextIndex)return false;
  return movePoint(mission.activePlan,from,to);
}

export function removeFuturePoint(mission,pointId){
  const i=mission.activePlan.points.findIndex(p=>p.id===pointId);
  if(i<mission.nextIndex)return false;
  const removed=removePoint(mission.activePlan,pointId);
  if(removed&&mission.nextIndex>=mission.activePlan.points.length){
    mission.nextIndex=Math.max(0,mission.activePlan.points.length-1);
  }
  return removed;
}

export function elapsedMs(mission,at=Date.now()){
  if(!mission||!Number.isFinite(Number(mission.startedAt)))return 0;
  const end=Number(mission.endedAt||at);
  return Number.isFinite(end)?Math.max(0,end-Number(mission.startedAt)):0;
}
