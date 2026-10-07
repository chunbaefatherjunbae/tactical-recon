(function(root){
  'use strict';

  if(root.EpPlanBridge?.version)return;
  const Plan=root.EpPlanCore;
  const Adapter=root.EpPlanLegacyAdapter;
  const runtime=root.EpRuntimeBridge;
  if(!Plan||!Adapter||!runtime){
    console.warn('[EP] plan bridge unavailable');
    return;
  }

  let lastSignature='';

  function port(){
    return root.__v29PlanLegacy&&typeof root.__v29PlanLegacy.snapshot==='function'?root.__v29PlanLegacy:null;
  }

  function signature(snapshot){
    if(!snapshot)return '';
    try{return JSON.stringify(snapshot);}catch(e){return String(Date.now());}
  }

  function syncFromLegacy(force=false){
    const p=port();
    if(!p)return null;
    const snap=p.snapshot();
    const sig=signature(snap);
    if(!force&&sig===lastSignature)return runtime.state.plan;
    lastSignature=sig;
    const plan=Adapter.fromLegacy(snap,Plan);
    runtime.state.plan=plan;
    try{
      root.dispatchEvent(new CustomEvent('ep-state-change',{detail:{slice:'plan',state:runtime.snapshot()}}));
    }catch(e){}
    return plan;
  }

  function applyPlan(plan,{render=true,dirty=true}={}){
    const p=port();
    if(!p||!plan)return false;
    const legacy=Adapter.toLegacy(plan);
    if(!legacy)return false;
    p.apply(legacy,{render,dirty});
    runtime.state.plan=Plan.clone(plan);
    lastSignature=signature(p.snapshot());
    try{
      root.dispatchEvent(new CustomEvent('ep-state-change',{detail:{slice:'plan',state:runtime.snapshot()}}));
    }catch(e){}
    return true;
  }

  function mutate(mutator){
    const current=syncFromLegacy(true);
    if(!current)return null;
    mutator(current,Plan);
    applyPlan(current);
    return current;
  }

  function pointFromLegacy(value,source){
    if(!value?.coords||!Array.isArray(value.coords))return null;
    return {
      id:value.id,
      name:value.name||source||'POINT',
      lat:Number(value.coords[0]),
      lon:Number(value.coords[1]),
      source:value.source||source||'LEGACY',
      address:value.address||''
    };
  }

  function objectiveIndex(plan){
    const targetId=plan?.compatibility?.targetId;
    let index=targetId?plan.points.findIndex(p=>String(p.id)===String(targetId)):-1;
    if(index<0)index=plan.points.findIndex(p=>p.source==='LEGACY_OBJECTIVE');
    return index<0?Math.max(0,plan.points.length-1):index;
  }

  function setRole(role,value){
    const p=port();
    if(!p?.isEditable?.())return false;
    const input=pointFromLegacy(value,role);
    if(!input)return false;
    const plan=syncFromLegacy(true);
    if(!plan)return false;
    if(role==='START'){
      if(plan.compatibility?.hasStart)Plan.setStart(plan,{...input,source:input.source||'LEGACY_START'});
      else{
        plan.points.unshift(Plan.point({...input,id:input.id||'LEGACY_START',source:input.source||'LEGACY_START'}));
        plan.compatibility={...(plan.compatibility||{}),hasStart:true};
        plan.updatedAt=Date.now();
      }
    }else if(role==='END'){
      if(plan.compatibility?.hasEnd)Plan.setDestination(plan,{...input,source:input.source||'LEGACY_END'});
      else{
        plan.points.push(Plan.point({...input,id:input.id||'LEGACY_END',source:input.source||'LEGACY_END'}));
        plan.compatibility={...(plan.compatibility||{}),hasEnd:true};
        plan.updatedAt=Date.now();
      }
    }else if(role==='VIA'){
      const index=objectiveIndex(plan);
      Plan.insertPoint(plan,{...input,source:input.source||'LEGACY_VIA'},index);
    }else return false;
    return applyPlan(plan);
  }

  function clearRole(role,id){
    const p=port();
    if(!p?.isEditable?.())return false;
    const plan=syncFromLegacy(true);
    if(!plan)return false;
    if(role==='START'){
      if(!plan.compatibility?.hasStart)return false;
      plan.points.shift();
      plan.compatibility.hasStart=false;
      plan.updatedAt=Date.now();
    }else if(role==='END'){
      if(!plan.compatibility?.hasEnd)return false;
      plan.points.pop();
      plan.compatibility.hasEnd=false;
      plan.updatedAt=Date.now();
    }else if(role==='VIA'){
      const target=plan.points.find(x=>String(x.id)===String(id));
      if(!target||target.source==='LEGACY_OBJECTIVE')return false;
      if(!Plan.removePoint(plan,target.id))return false;
    }else return false;
    return applyPlan(plan);
  }

  function installPointOwners(){
    const assign=root.assignPlanPoint;
    if(typeof assign==='function'&&!assign.__epPointOwner){
      const wrapped=function(role,value){
        const ok=setRole(role,value);
        if(ok)return true;
        return assign.apply(this,arguments);
      };
      wrapped.__epPointOwner=true;wrapped.__epLegacy=assign;root.assignPlanPoint=wrapped;
    }

    const startRef=root.setRouteStartFromReference;
    if(typeof startRef==='function'&&!startRef.__epPointOwner){
      const wrapped=function(){
        const ref=port()?.currentReference?.();
        if(ref?.coords&&setRole('START',{name:ref.type==='GPS'?'GPS START':ref.type+' START',coords:ref.coords,source:ref.type}))return;
        return startRef.apply(this,arguments);
      };
      wrapped.__epPointOwner=true;root.setRouteStartFromReference=wrapped;
    }

    const startReticle=root.setRouteStartFromReticle;
    if(typeof startReticle==='function'&&!startReticle.__epPointOwner){
      const wrapped=function(){
        const center=port()?.mapCenter?.();
        if(center?.coords&&setRole('START',{name:'RETICLE START',coords:center.coords,source:'RETICLE'}))return;
        return startReticle.apply(this,arguments);
      };
      wrapped.__epPointOwner=true;root.setRouteStartFromReticle=wrapped;
    }

    const endReticle=root.setRouteEndFromReticle;
    if(typeof endReticle==='function'&&!endReticle.__epPointOwner){
      const wrapped=function(){
        const center=port()?.mapCenter?.();
        if(center?.coords&&setRole('END',{name:'END',coords:center.coords,source:'RETICLE'}))return;
        return endReticle.apply(this,arguments);
      };
      wrapped.__epPointOwner=true;root.setRouteEndFromReticle=wrapped;
    }

    const clearStart=root.clearRouteStart;
    if(typeof clearStart==='function'&&!clearStart.__epPointOwner){
      const wrapped=function(){if(clearRole('START'))return;return clearStart.apply(this,arguments);};
      wrapped.__epPointOwner=true;root.clearRouteStart=wrapped;
    }
    const clearEnd=root.clearRouteEnd;
    if(typeof clearEnd==='function'&&!clearEnd.__epPointOwner){
      const wrapped=function(){if(clearRole('END'))return;return clearEnd.apply(this,arguments);};
      wrapped.__epPointOwner=true;root.clearRouteEnd=wrapped;
    }

    const setAtReticle=root.setPlanPointAtReticle;
    if(typeof setAtReticle==='function'&&!setAtReticle.__epPointOwner){
      const wrapped=function(role){
        const center=port()?.mapCenter?.();
        if(center?.coords&&setRole(role,{name:role==='VIA'?'VIA':' '+role,coords:center.coords,source:'RETICLE'}))return;
        return setAtReticle.apply(this,arguments);
      };
      wrapped.__epPointOwner=true;root.setPlanPointAtReticle=wrapped;
    }

    const del=root.deleteSelectedPlanPoint;
    if(typeof del==='function'&&!del.__epPointOwner){
      const wrapped=function(){
        const ref=port()?.selectedPointRef?.();
        if(ref&&clearRole(ref.role,ref.id))return;
        return del.apply(this,arguments);
      };
      wrapped.__epPointOwner=true;root.deleteSelectedPlanPoint=wrapped;
    }
  }

  function installSyncWrapper(name){
    const fn=root[name];
    if(typeof fn!=='function'||fn.__epPlanSync)return;
    const wrapped=function(){
      const out=fn.apply(this,arguments);
      syncFromLegacy();
      return out;
    };
    wrapped.__epPlanSync=true;
    wrapped.__epLegacy=fn;
    root[name]=wrapped;
  }

  function install(){
    ['enterTargetMode','saveTargetRoute','restorePlanEditState','updateTargetModePanel','exitTargetMode'].forEach(installSyncWrapper);
    installPointOwners();
    syncFromLegacy(true);
  }

  root.EpPlanBridge={
    version:'EP-V1-PLAN',
    syncFromLegacy,
    applyPlan,
    mutate,
    setRole,
    clearRole,
    getPlan:()=>runtime.state.plan,
    install
  };

  install();
})(typeof globalThis!=='undefined'?globalThis:this);
