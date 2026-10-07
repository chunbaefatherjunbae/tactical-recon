(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EpSearchCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function requireLocation(core){
    if(!core)throw new Error('LOCATION_CORE_REQUIRED');
    return core;
  }

  function prefixForPoint(point,mgrsLib,locationCore){
    const core=requireLocation(locationCore);
    if(!point||!core.validPoint(point)||!mgrsLib||typeof mgrsLib.forward!=='function')return null;
    const raw=mgrsLib.forward([Number(point.lon),Number(point.lat)],5);
    const parts=core.parseFullParts(raw);
    if(!parts)return null;
    return {
      zoneBand:parts.zoneBand,
      grid:parts.grid,
      compactPrefix:parts.compactPrefix,
      prefix:parts.prefix
    };
  }

  function parseDirect(query,{locationCore,mgrsLib,workingGrid,contextPoint,maxContextKm=165}={}){
    const core=requireLocation(locationCore);
    const raw=String(query||'').trim();
    if(!raw)return null;

    const wgs=core.parseWgs84(raw);
    if(wgs)return {...wgs,name:'WGS84 POSITION',address:''};

    const full=core.parseFullParts(raw);
    if(full){
      const decoded=core.decodeFull(raw,mgrsLib);
      return {...decoded,name:'MGRS POSITION',address:'',workingGridApplied:false,prefix:full};
    }

    const short=core.shortParts(raw);
    if(short){
      const decoded=core.decodeShort(raw,workingGrid,mgrsLib);
      if(contextPoint)core.validateGridContext(decoded,contextPoint,maxContextKm);
      return {...decoded,name:'MGRS POSITION',address:'',workingGridApplied:true};
    }

    core.validateCoordinateLike(raw);
    return null;
  }

  return {prefixForPoint,parseDirect};
});
