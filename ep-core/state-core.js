(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpStateCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SURFACE=Object.freeze({MAP:'MAP',PLAN:'PLAN',MISSION:'MISSION'});
  const OVERLAY=Object.freeze({NONE:'NONE',SEARCH:'SEARCH',LOCATION:'LOCATION',RECORDS:'RECORDS',TOOLS:'TOOLS'});
  const DRAW=Object.freeze({NONE:'NONE',PEN:'PEN',ERASER:'ERASER',HAND:'HAND'});

  function createState(){
    return {
      surface:SURFACE.MAP,
      overlay:OVERLAY.NONE,
      drawTool:DRAW.NONE,
      gps:{enabled:false,status:'OFF',fix:null,lastFix:null,follow:false},
      temp:null,
      target:null,
      selected:null,
      plan:null,
      mission:null,
      track:{state:'OFF'}
    };
  }

  return {SURFACE,OVERLAY,DRAW,createState};
});
