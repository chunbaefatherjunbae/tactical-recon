(function(root){
  'use strict';

  if(root.EpMissionBridge?.version)return;
  const Mission=root.EpMissionCore;
  const PlanBridge=root.EpPlanBridge;
  const Runtime=root.EpRuntimeBridge;
  if(!Mission||!PlanBridge||!Runtime){
    console.warn('[EP] mission bridge unavailable');
    return;
  }

  const state=Runtime.state;
  let syncing=false;

  function port(){
    return root.__v29MissionLegacy&&typeof root.__v29MissionLegacy.snapshot==='function'
      ? root.__v29MissionLegacy
      : null;
  }

  function pointFromLegacy(value){
    if(!value?.coords||!Array.isArray(value.coords))return null;
    const lat=Number(value.coords[0]),lon=Number(value.coords[1]);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    return {
      id:value.id!==undefined?String(value.id):undefined,
      name:String(value.name||'TRACK RETURN'),
      lat,lon,
      source:String(value.source||'TRACK_RETURN')
    };
  }

  function emit(){
    try{
      root.dispatchEvent(new CustomEvent('ep-state-change',{detail:{slice:'mission',state:Runtime.snapshot()}}));
    }catch(e){}
  }

  function ensureMission(snapshot){
    const plan=PlanBridge.syncFromLegacy(true);
    if(!plan)return null;
    if(!state.mission||state.mission.status!=='ACTIVE'||
      String(state.mission.activePlan?.compatibility?.targetId||'')!==String(plan.compatibility?.targetId||'')){
      const currentIndex=Mission.legacyLegToPlanIndex(plan,Number(snapshot?.navLegIndex||0));
      state.mission=Mission.createMission(plan,{
        startedAt:Number(snapshot?.navStartedAt)||Date.now(),
        currentIndex
      });
    }
    if(snapshot){
      Mission.setCurrentIndex(
        state.mission,
        Mission.legacyLegToPlanIndex(state.mission.activePlan,Number(snapshot.navLegIndex||0)),
        {legStartedAt:Number(snapshot.navLegStartedAt)||undefined}
      );
      if(snapshot.backtrackActive){
        const target=pointFromLegacy(snapshot.backtrackTarget);
        if(target)Mission.setTrackReturn(state.mission,target);
      }else Mission.clearGuidanceOverride(state.mission);
    }
    return state.mission;
  }

  function syncFromLegacy(force=false){
    if(syncing)return state.mission||null;
    const p=port();
    if(!p)return null;
    const snap=p.snapshot();
    if(!snap||snap.phase!=='NAV'){
      if(force&&state.mission?.status==='ACTIVE'){
        state.lastMissionRecord=Mission.finish(state.mission);
        state.mission=null;
        state.surface='PLAN';
        emit();
      }
      return null;
    }
    syncing=true;
    try{
      const mission=ensureMission(snap);
      if(mission){
        state.surface='MISSION';
        emit();
      }
      return mission;
    }finally{syncing=false;}
  }

  function applyCursor(){
    const p=port(),mission=state.mission;
    if(!p||!mission)return false;
    const legacyLeg=Mission.planIndexToLegacyLeg(mission.activePlan,mission.currentIndex);
    p.applyMissionState({
      phase:'NAV',
      navLegIndex:legacyLeg,
      backtrackActive:Boolean(mission.guidanceOverride?.kind==='TRACK_RETURN'),
      navStartedAt:mission.startedAt,
      navLegStartedAt:mission.legStartedAt
    });
    return true;
  }

  function startAfterLegacy(){
    const mission=syncFromLegacy(true);
    return Boolean(mission);
  }

  function next(){
    const mission=syncFromLegacy();
    if(!mission||mission.guidanceOverride)return false;
    if(!Mission.canStep(mission,1))return false;
    Mission.step(mission,1);
    applyCursor();
    emit();
    return true;
  }

  function previous(){
    const mission=syncFromLegacy();
    if(!mission||mission.guidanceOverride)return false;
    if(!Mission.canStep(mission,-1))return false;
    Mission.step(mission,-1);
    applyCursor();
    emit();
    return true;
  }

  function currentDestination(){
    const mission=syncFromLegacy();
    const target=Mission.currentTarget(mission);
    if(!target)return null;
    return {
      id:target.id,
      name:target.name,
      coords:[Number(target.lat),Number(target.lon)],
      source:target.source,
      __epMission:true
    };
  }

  function toggleTrackReturn(){
    const mission=syncFromLegacy();
    const p=port();
    if(!mission||!p)return false;
    if(mission.guidanceOverride?.kind==='TRACK_RETURN'){
      Mission.clearGuidanceOverride(mission);
      applyCursor();
      emit();
      return true;
    }
    const legacyTarget=p.trackReturnTarget?.();
    const target=pointFromLegacy(legacyTarget);
    if(!target)return false;
    if(!Mission.setTrackReturn(mission,target))return false;
    applyCursor();
    emit();
    return true;
  }

  function end({returnToPlan=true}={}){
    if(state.mission){
      state.lastMissionRecord=Mission.finish(state.mission);
      state.mission=null;
    }
    state.surface=returnToPlan?'PLAN':'MAP';
    emit();
  }

  function installWrappers(){
    const start=root.startTargetNavigation;
    if(typeof start==='function'&&!start.__epMissionOwner){
      const wrapped=function(){
        const out=start.apply(this,arguments);
        startAfterLegacy();
        return out;
      };
      wrapped.__epMissionOwner=true;wrapped.__epLegacy=start;root.startTargetNavigation=wrapped;
    }

    const activate=root.activateTargetNavigation;
    if(typeof activate==='function'&&!activate.__epMissionOwner){
      const wrapped=function(){
        const out=activate.apply(this,arguments);
        startAfterLegacy();
        return out;
      };
      wrapped.__epMissionOwner=true;wrapped.__epLegacy=activate;root.activateTargetNavigation=wrapped;
    }

    const nextLegacy=root.nextNavLeg;
    if(typeof nextLegacy==='function'&&!nextLegacy.__epMissionOwner){
      const wrapped=function(){
        if(next())return;
        return nextLegacy.apply(this,arguments);
      };
      wrapped.__epMissionOwner=true;wrapped.__epLegacy=nextLegacy;root.nextNavLeg=wrapped;
    }

    const destLegacy=root.getCurrentNavDestination;
    if(typeof destLegacy==='function'&&!destLegacy.__epMissionOwner){
      const wrapped=function(){
        return currentDestination()||destLegacy.apply(this,arguments);
      };
      wrapped.__epMissionOwner=true;wrapped.__epLegacy=destLegacy;root.getCurrentNavDestination=wrapped;
    }

    const backLegacy=root.toggleBacktrack;
    if(typeof backLegacy==='function'&&!backLegacy.__epMissionOwner){
      const wrapped=function(){
        if(toggleTrackReturn()){
          try{root.updateTargetModePanel?.();}catch(e){}
          return;
        }
        return backLegacy.apply(this,arguments);
      };
      wrapped.__epMissionOwner=true;wrapped.__epLegacy=backLegacy;root.toggleBacktrack=wrapped;
    }

    const returnLegacy=root.returnToTargetPlan;
    if(typeof returnLegacy==='function'&&!returnLegacy.__epMissionOwner){
      const wrapped=function(){
        end({returnToPlan:true});
        return returnLegacy.apply(this,arguments);
      };
      wrapped.__epMissionOwner=true;wrapped.__epLegacy=returnLegacy;root.returnToTargetPlan=wrapped;
    }

    const stopLegacy=root.stopTargetNavigation;
    if(typeof stopLegacy==='function'&&!stopLegacy.__epMissionOwner){
      const wrapped=function(){
        end({returnToPlan:true});
        return stopLegacy.apply(this,arguments);
      };
      wrapped.__epMissionOwner=true;wrapped.__epLegacy=stopLegacy;root.stopTargetNavigation=wrapped;
    }

    const update=root.updateTargetModePanel;
    if(typeof update==='function'&&!update.__epMissionRecoverySync){
      const wrapped=function(){
        syncFromLegacy();
        return update.apply(this,arguments);
      };
      wrapped.__epMissionRecoverySync=true;wrapped.__epLegacy=update;root.updateTargetModePanel=wrapped;
    }
  }

  function install(){
    installWrappers();
    syncFromLegacy();
  }

  root.EpMissionBridge={
    version:'EP-V2-MISSION',
    syncFromLegacy,
    getMission:()=>state.mission||null,
    currentDestination,
    next,
    previous,
    toggleTrackReturn,
    end,
    install
  };

  install();
})(typeof globalThis!=='undefined'?globalThis:this);
