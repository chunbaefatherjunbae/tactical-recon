(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpOverlayCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const OVERLAY=Object.freeze({
    NONE:'NONE',
    LOCATION:'LOCATION',
    SEARCH:'SEARCH',
    POINTS:'POINTS',
    RECORDS:'RECORDS',
    TOOLS:'TOOLS'
  });

  function valid(value){
    return Object.values(OVERLAY).includes(String(value||'').toUpperCase());
  }

  function set(state,next,{source='',detail=null}={}){
    if(!state||!valid(next))return false;
    const value=String(next).toUpperCase();
    const previous=state.overlay;
    state.overlay=value;
    state.overlayMeta={
      previous,
      source:String(source||''),
      detail:detail??null,
      changedAt:Date.now()
    };
    return previous!==value;
  }

  function close(state,kind,{source=''}={}){
    if(!state)return false;
    if(kind&&state.overlay!==String(kind).toUpperCase())return false;
    return set(state,OVERLAY.NONE,{source});
  }

  return {OVERLAY,valid,set,close};
});
