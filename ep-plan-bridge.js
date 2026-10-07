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
    syncFromLegacy(true);
  }

  root.EpPlanBridge={
    version:'EP-V1-PLAN',
    syncFromLegacy,
    applyPlan,
    mutate,
    getPlan:()=>runtime.state.plan,
    install
  };

  install();
})(typeof globalThis!=='undefined'?globalThis:this);
