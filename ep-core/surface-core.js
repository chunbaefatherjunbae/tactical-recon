(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpSurfaceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SURFACE=Object.freeze({MAP:'MAP',PLAN:'PLAN',MISSION:'MISSION'});

  function valid(value){
    return value===SURFACE.MAP||value===SURFACE.PLAN||value===SURFACE.MISSION;
  }

  function canEnter(state,next){
    if(!valid(next))return false;
    if(next===SURFACE.MISSION)return Boolean(state?.mission&&state.mission.status==='ACTIVE');
    if(next===SURFACE.PLAN)return Boolean(state?.plan);
    return true;
  }

  function enter(state,next,{force=false,reason=''}={}){
    if(!state||!valid(next))return false;
    if(!force&&!canEnter(state,next))return false;
    const prev=state.surface;
    state.surface=next;
    state.surfaceMeta={
      previous:prev,
      reason:String(reason||''),
      changedAt:Date.now()
    };
    return prev!==next;
  }

  function derive({missionActive=false,planActive=false}={}){
    if(missionActive)return SURFACE.MISSION;
    if(planActive)return SURFACE.PLAN;
    return SURFACE.MAP;
  }

  return {SURFACE,valid,canEnter,enter,derive};
});
