(function(root){
  'use strict';

  if(root.EpRuntimeBridge?.version)return;

  const Ref=root.EpReferenceCore;
  const State=root.EpStateCore;
  const Legacy=root.EpLegacyAdapter;
  if(!Ref||!State||!Legacy){
    console.warn('[EP] core unavailable; bridge skipped');
    return;
  }

  const LAST_FIX_KEY='tactical_recon_last_fix_v1';
  const state=State.createState();
  state.reference=null;

  function emit(slice){
    try{
      root.dispatchEvent(new CustomEvent('ep-state-change',{detail:{slice,state:snapshot()}}));
    }catch(e){}
  }

  function snapshot(){
    try{return typeof structuredClone==='function'?structuredClone(state):JSON.parse(JSON.stringify(state));}
    catch(e){return {...state};}
  }

  function readLastFix(){
    try{
      const raw=JSON.parse(localStorage.getItem(LAST_FIX_KEY)||'null');
      return Legacy.lastFixFromStorage(raw);
    }catch(e){return null;}
  }

  function readGpsFix(){
    try{
      if(typeof gpsPowerEnabled==='undefined'||typeof hasGpsFix==='undefined'||!gpsPowerEnabled||!hasGpsFix)return null;
      if(typeof baseLocation==='undefined'||!Array.isArray(baseLocation))return null;
      const point=Legacy.fromCoords(baseLocation);
      if(!point)return null;
      let timestamp=Date.now(),accuracyM;
      if(typeof latestGpsPosition!=='undefined'&&latestGpsPosition){
        const t=Number(latestGpsPosition.timestamp);
        if(Number.isFinite(t)&&t>0)timestamp=t;
        const a=Number(latestGpsPosition.coords?.accuracy);
        if(Number.isFinite(a))accuracyM=a;
      }
      return {...point,timestamp,accuracyM};
    }catch(e){return null;}
  }

  function readTemp(){
    try{
      if(typeof tempMarkPoint==='undefined'||!tempMarkPoint?.coords)return null;
      const point=Legacy.fromCoords(tempMarkPoint.coords);
      if(!point)return null;
      const timestamp=Number(tempMarkPoint.timestamp||tempMarkPoint.createdAt||0);
      return {...point,timestamp:Number.isFinite(timestamp)&&timestamp>0?timestamp:0,name:tempMarkPoint.name||'TEMP'};
    }catch(e){return null;}
  }

  function syncReferenceState(){
    const gpsFix=readGpsFix();
    const temp=readTemp();
    const lastFix=readLastFix();
    const gpsEnabled=typeof gpsPowerEnabled!=='undefined'?Boolean(gpsPowerEnabled):false;
    state.gps.enabled=gpsEnabled;
    state.gps.fix=gpsFix;
    state.gps.lastFix=lastFix;
    state.temp=temp;
    state.reference=Ref.selectReference({gpsEnabled,gpsFix,temp,lastFix});
    return state.reference;
  }

  function legacyReference(){
    return Legacy.toLegacyReference(syncReferenceState());
  }

  function setSelected(value,meta){
    const next=Legacy.selectedFromLegacy(value,meta);
    state.selected=next;
    emit('selected');
    return next;
  }

  function clearSelected(){
    if(state.selected===null)return;
    state.selected=null;
    emit('selected');
  }

  function syncMapTarget(){
    try{
      if(typeof map==='undefined'||!map?.getCenter)return;
      const c=map.getCenter();
      if(!Legacy.validLatLon(c.lat,c.lng))return;
      state.target={lat:Number(c.lat),lon:Number(c.lng),source:'MAP_CENTER'};
      emit('target');
    }catch(e){}
  }

  function installReferenceOwner(){
    if(typeof getReferencePosition!=='function'||getReferencePosition.__epReferenceOwner)return;
    const legacyFallback=getReferencePosition;
    const owned=function(){
      const ref=legacyReference();
      if(ref?.coords)return ref;
      try{
        const fallback=legacyFallback.apply(this,arguments);
        return fallback?.coords?fallback:null;
      }catch(e){return null;}
    };
    owned.__epReferenceOwner=true;
    owned.__epLegacyFallback=legacyFallback;
    getReferencePosition=owned;
  }

  function installTempTimestamp(){
    if(typeof setTempMark!=='function'||setTempMark.__epTempTimestamp)return;
    const previous=setTempMark;
    const wrapped=function(){
      const out=previous.apply(this,arguments);
      try{
        if(typeof tempMarkPoint!=='undefined'&&tempMarkPoint?.coords){
          tempMarkPoint.timestamp=Date.now();
          syncReferenceState();
          emit('reference');
        }
      }catch(e){}
      return out;
    };
    wrapped.__epTempTimestamp=true;
    setTempMark=wrapped;
  }

  function installSelectionCapture(){
    if(typeof openSitrep==='function'&&!openSitrep.__epSelectionCapture){
      const previous=openSitrep;
      const wrapped=function(target,statusType){
        setSelected(target,{source:target?.source||(statusType==='REGISTERED'?'REGISTERED':'SITREP'),status:statusType});
        return previous.apply(this,arguments);
      };
      wrapped.__epSelectionCapture=true;
      openSitrep=wrapped;
    }

    if(typeof selectAddressResult==='function'&&!selectAddressResult.__epSelectionCapture){
      const previous=selectAddressResult;
      const wrapped=function(result){
        setSelected(result,{source:result?.source||'SEARCH'});
        return previous.apply(this,arguments);
      };
      wrapped.__epSelectionCapture=true;
      selectAddressResult=wrapped;
    }
  }

  function installMapTarget(){
    try{
      if(typeof map==='undefined'||!map?.on||map.__epTargetOwner)return;
      map.__epTargetOwner=true;
      map.on('moveend',syncMapTarget);
      syncMapTarget();
    }catch(e){}
  }

  function install(){
    installReferenceOwner();
    installTempTimestamp();
    installSelectionCapture();
    installMapTarget();
    syncReferenceState();
    emit('reference');
  }

  root.EpRuntimeBridge={
    version:'EP-V1',
    state,
    snapshot,
    getReference:legacyReference,
    getSelected:()=>state.selected,
    setSelected,
    clearSelected,
    syncReference:()=>{const ref=syncReferenceState();emit('reference');return ref;},
    syncTarget:syncMapTarget,
    install
  };

  install();
})(typeof globalThis!=='undefined'?globalThis:this);
