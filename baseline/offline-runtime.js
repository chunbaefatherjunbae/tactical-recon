(() => {
  'use strict';

  const state={
    supported:'serviceWorker' in navigator,
    registered:false,
    controlled:Boolean(navigator.serviceWorker?.controller),
    packStatus:'UNKNOWN',
    completed:0,
    total:0,
    failed:0,
    error:null
  };

  function snapshot(){return {...state};}
  function emit(reason){
    window.dispatchEvent(new CustomEvent('baseline-offline-change',{detail:{reason,state:snapshot()}}));
  }

  function applyMessage(data){
    if(!data||data.type!=='LITE_PACK_STATUS')return;
    state.packStatus=String(data.status||'UNKNOWN');
    state.completed=Number(data.completed)||0;
    state.total=Number(data.total)||0;
    state.failed=Number(data.failed)||0;
    emit('pack-status');
  }

  if(state.supported){
    navigator.serviceWorker.addEventListener('message',event=>applyMessage(event.data));
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      state.controlled=Boolean(navigator.serviceWorker.controller);
      emit('controller');
    });
  }

  async function register(){
    if(!state.supported)return null;
    try{
      const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
      state.registered=true;
      emit('registered');
      const ready=await navigator.serviceWorker.ready;
      state.controlled=Boolean(navigator.serviceWorker.controller);
      ready.active?.postMessage({type:'GET_LITE_PACK_STATUS'});
      return reg;
    }catch(error){
      state.error=String(error?.message||error);
      emit('register-error');
      return null;
    }
  }

  async function prepareLitePack(){
    if(!state.supported)return false;
    state.packStatus='PREPARING';
    emit('prepare');
    try{
      const reg=await navigator.serviceWorker.ready;
      const worker=reg.active||reg.waiting||reg.installing;
      if(!worker)throw new Error('service worker unavailable');
      worker.postMessage({type:'PREPARE_LITE_PACK'});
      return true;
    }catch(error){
      state.packStatus='ERROR';
      state.error=String(error?.message||error);
      emit('prepare-error');
      return false;
    }
  }

  window.BaselineOffline=Object.freeze({state,snapshot,register,prepareLitePack});
  register();
})();
