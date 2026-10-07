(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpPlanLegacyAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function validCoords(c){
    return Array.isArray(c)&&c.length>=2&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1]))&&
      Math.abs(Number(c[0]))<=90&&Math.abs(Number(c[1]))<=180;
  }

  function legacyPoint(value,{id,source}={}){
    if(!value||!validCoords(value.coords))return null;
    return {
      id:String(value.id||id||('legacy_'+Math.random().toString(36).slice(2,8))),
      name:String(value.name||'POINT').slice(0,120),
      lat:Number(value.coords[0]),
      lon:Number(value.coords[1]),
      source:String(value.source||source||'LEGACY'),
      address:value.address?String(value.address).slice(0,300):undefined,
      createdAt:Number(value.createdAt||Date.now())
    };
  }

  function strokesFromLegacy(segments,prefix){
    return (Array.isArray(segments)?segments:[]).map((segment,index)=>{
      const points=(Array.isArray(segment)?segment:[]).filter(validCoords).map(c=>({lat:Number(c[0]),lon:Number(c[1])}));
      return points.length>=2?{id:`${prefix}_${index}`,points}:null;
    }).filter(Boolean);
  }

  function strokesToLegacy(strokes){
    return (Array.isArray(strokes)?strokes:[])
      .map(stroke=>(stroke?.points||[]).map(p=>[Number(p.lat),Number(p.lon)]).filter(validCoords))
      .filter(segment=>segment.length>=2);
  }

  function fromLegacy(snapshot,Plan){
    if(!snapshot||!Plan)return null;
    const ordered=[];
    const start=legacyPoint(snapshot.startPoint,{id:'LEGACY_START',source:'LEGACY_START'});
    if(start)ordered.push(start);
    (snapshot.viaPoints||[]).forEach((value,index)=>{
      const via=legacyPoint(value,{id:value?.id||`LEGACY_VIA_${index}`,source:'LEGACY_VIA'});
      if(via)ordered.push(via);
    });
    const objective=legacyPoint(snapshot.target,{id:snapshot.target?.id||'LEGACY_OBJECTIVE',source:'LEGACY_OBJECTIVE'});
    if(objective)ordered.push(objective);
    const end=legacyPoint(snapshot.endPoint,{id:'LEGACY_END',source:'LEGACY_END'});
    if(end)ordered.push(end);
    if(!ordered.length)return null;
    return {
      schemaVersion:1,
      id:String(snapshot.planId||snapshot.target?.id||('legacy_plan_'+Date.now())),
      createdAt:Number(snapshot.createdAt||Date.now()),
      updatedAt:Number(snapshot.updatedAt||Date.now()),
      points:ordered.map(p=>Plan.point(p)),
      routeStrokes:strokesFromLegacy(snapshot.routeSegments,'route'),
      overlayStrokes:strokesFromLegacy(snapshot.overlaySegments,'overlay'),
      compatibility:{
        source:'V29',
        targetId:snapshot.target?.id!==undefined?String(snapshot.target.id):null
      }
    };
  }

  function toLegacy(plan){
    if(!plan||!Array.isArray(plan.points))return null;
    const objectiveId=plan.compatibility?.targetId;
    let objectiveIndex=objectiveId?plan.points.findIndex(p=>String(p.id)===String(objectiveId)):-1;
    if(objectiveIndex<0){
      objectiveIndex=plan.points.findIndex(p=>p.source==='LEGACY_OBJECTIVE');
    }
    if(objectiveIndex<0)objectiveIndex=Math.max(0,plan.points.length-1);

    const asLegacy=(p)=>p?{
      id:p.id,name:p.name,coords:[Number(p.lat),Number(p.lon)],source:p.source,address:p.address||''
    }:null;

    const start=plan.points.length>1?asLegacy(plan.points[0]):null;
    const objective=asLegacy(plan.points[objectiveIndex]);
    const end=objectiveIndex<plan.points.length-1?asLegacy(plan.points[plan.points.length-1]):null;
    const viaStart=start?1:0;
    const viaEnd=objectiveIndex;
    const vias=plan.points.slice(viaStart,viaEnd).map(asLegacy).filter(Boolean);

    return {
      startPoint:start,
      viaPoints:vias,
      target:objective,
      endPoint:end,
      routeSegments:strokesToLegacy(plan.routeStrokes),
      overlaySegments:strokesToLegacy(plan.overlayStrokes)
    };
  }

  return {legacyPoint,strokesFromLegacy,strokesToLegacy,fromLegacy,toLegacy};
});
