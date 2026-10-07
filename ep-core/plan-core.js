(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpPlanCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function clone(value){
    return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  }

  function id(prefix){
    return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  }

  function validPoint(p){
    return !!p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))&&
      Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lon))<=180;
  }

  function point(input){
    if(!validPoint(input))throw new Error('INVALID_POINT');
    return {
      id:String(input.id||id('pt')),
      name:String(input.name||'미지점').slice(0,120),
      lat:Number(input.lat),lon:Number(input.lon),
      source:String(input.source||'MAP'),
      address:input.address?String(input.address).slice(0,300):undefined,
      createdAt:Number(input.createdAt||Date.now())
    };
  }

  function roleAt(index,length){
    if(index===0)return 'START';
    if(index===length-1)return 'DEST';
    return 'VIA';
  }

  function createPlan(destination,reference){
    if(!validPoint(destination))throw new Error('DESTINATION_REQUIRED');
    const points=[];
    if(validPoint(reference))points.push(point({...reference,id:undefined,name:reference.name||'출발지'}));
    points.push(point({...destination,id:undefined}));
    return {schemaVersion:1,id:id('plan'),createdAt:Date.now(),updatedAt:Date.now(),points,routeStrokes:[],overlayStrokes:[]};
  }

  function setStart(plan,input){
    const p=point(input);
    if(plan.points.length===0)plan.points.push(p);
    else if(plan.points.length===1)plan.points.unshift(p);
    else plan.points[0]=p;
    plan.updatedAt=Date.now();return p;
  }

  function setDestination(plan,input){
    const p=point(input);
    if(plan.points.length===0)plan.points.push(p);
    else plan.points[plan.points.length-1]=p;
    plan.updatedAt=Date.now();return p;
  }

  function insertPoint(plan,input,index){
    const p=point(input);
    const fallback=Math.max(0,plan.points.length-1);
    const at=Number.isInteger(index)?Math.max(0,Math.min(index,plan.points.length)):fallback;
    plan.points.splice(at,0,p);plan.updatedAt=Date.now();return p;
  }

  function movePoint(plan,from,to){
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||
      from>=plan.points.length||to>=plan.points.length||from===to)return false;
    const [p]=plan.points.splice(from,1);plan.points.splice(to,0,p);plan.updatedAt=Date.now();return true;
  }

  function removePoint(plan,pointId){
    const index=plan.points.findIndex(p=>String(p.id)===String(pointId));
    if(index<0)return false;
    plan.points.splice(index,1);plan.updatedAt=Date.now();return true;
  }

  function normalizeStrokes(strokes,prefix='stroke'){
    return (Array.isArray(strokes)?strokes:[]).map((stroke,index)=>{
      const raw=Array.isArray(stroke)?stroke:stroke?.points;
      const points=(Array.isArray(raw)?raw:[]).filter(validPoint).map(p=>({lat:Number(p.lat),lon:Number(p.lon)}));
      return points.length>=2?{id:String(stroke?.id||id(prefix+'_'+index)),points}:null;
    }).filter(Boolean);
  }

  function addStroke(plan,points){
    const clean=(Array.isArray(points)?points:[]).filter(validPoint).map(p=>({lat:Number(p.lat),lon:Number(p.lon)}));
    if(clean.length<2)return null;
    const stroke={id:id('stroke'),points:clean};
    plan.routeStrokes.push(stroke);plan.updatedAt=Date.now();return stroke;
  }

  function replaceRouteStrokes(plan,strokes){
    plan.routeStrokes=normalizeStrokes(strokes,'route');
    plan.updatedAt=Date.now();
    return plan.routeStrokes;
  }

  function replaceOverlayStrokes(plan,strokes){
    plan.overlayStrokes=normalizeStrokes(strokes,'overlay');
    plan.updatedAt=Date.now();
    return plan.overlayStrokes;
  }

  function startMission(plan){
    if(!plan||plan.points.length<2)throw new Error('PLAN_INCOMPLETE');
    return {
      schemaVersion:1,id:id('mission'),startedAt:Date.now(),endedAt:null,
      nextIndex:Math.min(1,plan.points.length-1),
      initialPlan:clone(plan),activePlan:clone(plan),trackLinks:[]
    };
  }

  function stepMission(mission,delta){
    const max=Math.max(0,mission.activePlan.points.length-1);
    mission.nextIndex=Math.max(0,Math.min(max,mission.nextIndex+Number(delta||0)));
    return mission.nextIndex;
  }

  function moveFuturePoint(mission,from,to){
    if(from<mission.nextIndex||to<mission.nextIndex)return false;
    return movePoint(mission.activePlan,from,to);
  }

  return {clone,point,roleAt,createPlan,setStart,setDestination,insertPoint,movePoint,removePoint,normalizeStrokes,addStroke,replaceRouteStrokes,replaceOverlayStrokes,startMission,stepMission,moveFuturePoint};
});
