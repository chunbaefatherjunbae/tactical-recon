(function(root){
  'use strict';

  if(root.EpSurfaceBridge?.version)return;
  const Surface=root.EpSurfaceCore;
  const Runtime=root.EpRuntimeBridge;
  if(!Surface||!Runtime){
    console.warn('[EP] surface bridge unavailable');
    return;
  }

  const state=Runtime.state;
  let syncing=false;

  function legacySnapshot(){
    try{
      const planPort=root.__v29PlanLegacy;
      const missionPort=root.__v29MissionLegacy;
      const planActive=Boolean(planPort?.snapshot?.());
      const nav=missionPort?.snapshot?.();
      const missionActive=Boolean(state.mission?.status==='ACTIVE'||nav?.phase==='NAV');
      return {planActive,missionActive};
    }catch(e){
      return {
        planActive:Boolean(state.plan),
        missionActive:Boolean(state.mission?.status==='ACTIVE')
      };
    }
  }

  function emit(reason){
    try{
      root.dispatchEvent(new CustomEvent('ep-state-change',{
        detail:{slice:'surface',reason,state:Runtime.snapshot()}
      }));
    }catch(e){}
  }

  function setSurface(next,{force=false,reason=''}={}){
    const changed=Surface.enter(state,next,{force,reason});
    if(changed)emit(reason);
    syncLegacyMirror();
    return state.surface;
  }

  function syncFromLegacy(reason='LEGACY_SYNC'){
    if(syncing)return state.surface;
    syncing=true;
    try{
      const snap=legacySnapshot();
      const next=Surface.derive(snap);
      if(next===Surface.SURFACE.PLAN&&!state.plan){
        try{root.EpPlanBridge?.syncFromLegacy?.(true);}catch(e){}
      }
      if(next===Surface.SURFACE.MISSION&&!state.mission){
        try{root.EpMissionBridge?.syncFromLegacy?.();}catch(e){}
      }
      if(next!==state.surface){
        Surface.enter(state,next,{force:true,reason});
        emit(reason);
      }
      return state.surface;
    }finally{syncing=false;}
  }

  function syncLegacyMirror(){
    if(syncing)return;
    syncing=true;
    try{
      const missionPort=root.__v29MissionLegacy;
      if(!missionPort?.applyMissionState)return;
      if(state.surface===Surface.SURFACE.MISSION&&state.mission?.status==='ACTIVE'){
        const Mission=root.EpMissionCore;
        const leg=Mission?.planIndexToLegacyLeg
          ? Mission.planIndexToLegacyLeg(state.mission.activePlan,state.mission.currentIndex)
          : 0;
        missionPort.applyMissionState({
          phase:'NAV',
          navLegIndex:leg,
          backtrackActive:Boolean(state.mission.guidanceOverride?.kind==='TRACK_RETURN'),
          navStartedAt:state.mission.startedAt,
          navLegStartedAt:state.mission.legStartedAt
        });
      }else if(state.surface===Surface.SURFACE.PLAN){
        missionPort.applyMissionState({phase:'PLAN',backtrackActive:false});
      }
    }catch(e){}finally{syncing=false;}
  }

  function is(name){return state.surface===String(name||'').toUpperCase();}
  function isMap(){return is('MAP');}
  function isPlan(){return is('PLAN');}
  function isMission(){return is('MISSION');}

  function installTransitionWrappers(){
    const enterPlan=root.enterTargetMode;
    if(typeof enterPlan==='function'&&!enterPlan.__epSurfaceOwner){
      const wrapped=function(){
        const out=enterPlan.apply(this,arguments);
        try{root.EpPlanBridge?.syncFromLegacy?.(true);}catch(e){}
        if(state.plan)setSurface('PLAN',{reason:'ENTER_PLAN'});
        else syncFromLegacy('ENTER_PLAN_FALLBACK');
        return out;
      };
      wrapped.__epSurfaceOwner=true;wrapped.__epLegacy=enterPlan;root.enterTargetMode=wrapped;
    }

    const exitPlan=root.exitTargetMode;
    if(typeof exitPlan==='function'&&!exitPlan.__epSurfaceOwner){
      const wrapped=function(){
        const out=exitPlan.apply(this,arguments);
        const snap=legacySnapshot();
        if(!snap.planActive&&!snap.missionActive)setSurface('MAP',{force:true,reason:'EXIT_PLAN'});
        else syncFromLegacy('EXIT_PLAN_FALLBACK');
        return out;
      };
      wrapped.__epSurfaceOwner=true;wrapped.__epLegacy=exitPlan;root.exitTargetMode=wrapped;
    }

    const update=root.updateTargetModePanel;
    if(typeof update==='function'&&!update.__epSurfaceSync){
      const wrapped=function(){
        syncFromLegacy('RENDER_SYNC');
        return update.apply(this,arguments);
      };
      wrapped.__epSurfaceSync=true;wrapped.__epLegacy=update;root.updateTargetModePanel=wrapped;
    }
  }

  function installBodyState(){
    if(root.__epSurfaceBodySyncInstalled)return;
    root.__epSurfaceBodySyncInstalled=true;
    const render=()=>{
      try{
        document.body.dataset.epSurface=state.surface;
        document.body.classList.toggle('ep-surface-map',isMap());
        document.body.classList.toggle('ep-surface-plan',isPlan());
        document.body.classList.toggle('ep-surface-mission',isMission());
      }catch(e){}
    };
    root.addEventListener?.('ep-state-change',event=>{
      if(event?.detail?.slice==='surface'||event?.detail?.slice==='mission'||event?.detail?.slice==='plan')render();
    });
    render();
  }

  function install(){
    installTransitionWrappers();
    installBodyState();
    syncFromLegacy('INSTALL');
  }

  root.EpSurfaceBridge={
    version:'EP-V3-SURFACE',
    get surface(){return state.surface;},
    is,isMap,isPlan,isMission,
    setSurface,syncFromLegacy,syncLegacyMirror,
    install
  };

  install();
})(typeof globalThis!=='undefined'?globalThis:this);
