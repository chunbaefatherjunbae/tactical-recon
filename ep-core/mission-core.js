(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpMissionCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function clone(value){
    return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  }

  function id(){
    return 'mission_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  }

  function validPoint(p){
    return !!p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))&&
      Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lon))<=180;
  }

  function firstActionIndex(plan){
    if(!plan?.points?.length)return 0;
    return plan.compatibility?.hasStart?Math.min(1,plan.points.length-1):0;
  }

  function maxIndex(mission){
    return Math.max(0,(mission?.activePlan?.points?.length||1)-1);
  }

  function createMission(plan,{startedAt=Date.now(),currentIndex}={}){
    if(!plan||!Array.isArray(plan.points)||!plan.points.length)throw new Error('PLAN_INCOMPLETE');
    const start=Number.isInteger(currentIndex)?currentIndex:firstActionIndex(plan);
    const bounded=Math.max(0,Math.min(Math.max(0,plan.points.length-1),start));
    return {
      schemaVersion:1,
      id:id(),
      status:'ACTIVE',
      startedAt:Number(startedAt)||Date.now(),
      endedAt:null,
      currentIndex:bounded,
      legStartedAt:Number(startedAt)||Date.now(),
      legTimes:{},
      initialPlan:clone(plan),
      activePlan:clone(plan),
      guidanceOverride:null,
      trackLinks:[]
    };
  }

  function currentPlanPoint(mission){
    if(!mission?.activePlan?.points?.length)return null;
    return mission.activePlan.points[Math.max(0,Math.min(maxIndex(mission),Number(mission.currentIndex)||0))]||null;
  }

  function currentTarget(mission){
    const override=mission?.guidanceOverride;
    if(override?.target&&validPoint(override.target))return override.target;
    return currentPlanPoint(mission);
  }

  function canStep(mission,delta=1){
    if(!mission||mission.status!=='ACTIVE'||mission.guidanceOverride)return false;
    const next=(Number(mission.currentIndex)||0)+Number(delta||0);
    return next>=0&&next<=maxIndex(mission);
  }

  function step(mission,delta=1,at=Date.now()){
    if(!canStep(mission,delta))return Number(mission?.currentIndex||0);
    const now=Number(at)||Date.now();
    const key=String(mission.currentIndex);
    mission.legTimes[key]=Math.max(0,now-Number(mission.legStartedAt||now));
    mission.currentIndex+=Number(delta||0);
    mission.legStartedAt=now;
    return mission.currentIndex;
  }

  function setCurrentIndex(mission,index,{legStartedAt}={}){
    if(!mission)return 0;
    mission.currentIndex=Math.max(0,Math.min(maxIndex(mission),Number(index)||0));
    if(Number.isFinite(Number(legStartedAt))&&Number(legStartedAt)>0)mission.legStartedAt=Number(legStartedAt);
    return mission.currentIndex;
  }

  function setTrackReturn(mission,target,{trackId=null}={}){
    if(!mission||!validPoint(target))return false;
    mission.guidanceOverride={
      kind:'TRACK_RETURN',
      target:{...target,lat:Number(target.lat),lon:Number(target.lon)},
      trackId:trackId?String(trackId):null,
      activatedAt:Date.now()
    };
    return true;
  }

  function clearGuidanceOverride(mission){
    if(!mission?.guidanceOverride)return false;
    mission.guidanceOverride=null;
    return true;
  }

  function linkTrack(mission,trackId,at=Date.now()){
    if(!mission||mission.status!=='ACTIVE'||!trackId)return null;
    const id=String(trackId);
    const existing=mission.trackLinks.find(link=>String(link.trackId)===id&&!link.associationEndedAt);
    if(existing)return existing;
    const link={
      trackId:id,
      associationStartedAt:Number(at)||Date.now(),
      associationEndedAt:null,
      trackEndedAt:null,
      startPointIndex:Number(mission.currentIndex)||0,
      endPointIndex:null,
      endReason:null
    };
    mission.trackLinks.push(link);
    return link;
  }

  function closeTrackLink(mission,trackId,{at=Date.now(),trackEndedAt=null,reason='TRACK_STOP'}={}){
    if(!mission||!trackId)return false;
    const id=String(trackId);
    const link=[...mission.trackLinks].reverse().find(item=>String(item.trackId)===id&&!item.associationEndedAt);
    if(!link)return false;
    link.associationEndedAt=Number(at)||Date.now();
    link.trackEndedAt=Number.isFinite(Number(trackEndedAt))&&Number(trackEndedAt)>0?Number(trackEndedAt):null;
    link.endPointIndex=Number(mission.currentIndex)||0;
    link.endReason=String(reason||'TRACK_STOP');
    return true;
  }

  function finish(mission,at=Date.now()){
    if(!mission)return null;
    const now=Number(at)||Date.now();
    if(mission.status==='ACTIVE'){
      const key=String(mission.currentIndex);
      mission.legTimes[key]=Math.max(0,now-Number(mission.legStartedAt||now));
    }
    for(const link of mission.trackLinks||[]){
      if(!link.associationEndedAt){
        link.associationEndedAt=now;
        link.endPointIndex=Number(mission.currentIndex)||0;
        link.endReason='MISSION_END';
      }
    }
    mission.status='ENDED';
    mission.endedAt=now;
    mission.guidanceOverride=null;
    return clone(mission);
  }

  function planIndexToLegacyLeg(plan,index){
    const offset=plan?.compatibility?.hasStart?1:0;
    return Math.max(0,Number(index||0)-offset);
  }

  function legacyLegToPlanIndex(plan,legIndex){
    const offset=plan?.compatibility?.hasStart?1:0;
    const max=Math.max(0,(plan?.points?.length||1)-1);
    return Math.max(0,Math.min(max,Number(legIndex||0)+offset));
  }

  return {
    clone,validPoint,firstActionIndex,createMission,currentPlanPoint,currentTarget,
    canStep,step,setCurrentIndex,setTrackReturn,clearGuidanceOverride,linkTrack,closeTrackLink,finish,
    planIndexToLegacyLeg,legacyLegToPlanIndex
  };
});
